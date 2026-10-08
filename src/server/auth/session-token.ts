import { z } from "zod";
import { roleIdSchema, type RoleId } from "@/domain/access/access";

/**
 * Token da sessão de demonstração (ADR-003): `payload.assinatura`, ambos em base64url,
 * com HMAC-SHA256 via Web Crypto (funciona no proxy, nos Route Handlers e nos testes).
 * A troca por OIDC substitui só este módulo e `session.ts`; a matriz de permissões fica.
 */

export const SESSION_COOKIE = "ipe_session";
/** Uma jornada de trabalho; a demo pede o perfil de novo no dia seguinte. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const payloadSchema = z.object({
  v: z.literal(1),
  role: roleIdSchema,
  /** Identificador aleatório da sessão (logs e, no futuro, revogação). */
  sid: z.string().min(8),
  iat: z.int(),
  exp: z.int(),
});
export type SessionPayload = z.infer<typeof payloadSchema>;

const encoder = new TextEncoder();
const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    keys.set(secret, key);
  }
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function signSession(
  role: RoleId,
  secret: string,
  now: number = Date.now(),
): Promise<{ token: string; payload: SessionPayload }> {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: 1,
    role,
    sid: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return { token: `${body}.${toBase64Url(new Uint8Array(signature))}`, payload };
}

/** Devolve o payload se a assinatura confere e a sessão não expirou; senão `null`. */
export async function verifySession(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): Promise<SessionPayload | null> {
  if (!token || token.length > 1024) return null;
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;
  // `verify` compara em tempo constante.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signatureBytes,
    encoder.encode(body),
  );
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return null;
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return null;
  return parsed.data.exp * 1000 > now ? parsed.data : null;
}

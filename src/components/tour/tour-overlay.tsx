"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Clock, Presentation, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/auth/use-session";
import { useMunicipalities } from "@/components/layout/municipality-context";
import { Button } from "@/components/ui/button";
import { queries } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { messages } from "@/lib/i18n";
import { signInAs } from "@/server/auth/actions";
import { useAppStore } from "@/stores/app-store";
import { useTourStore } from "@/stores/tour-store";
import { placeCard, type Box } from "./position";
import { isAtStepLocation, TOUR_STEPS } from "./steps";

const SPOTLIGHT_PADDING = 6;
/** Perfil que percorre todas as telas do roteiro. */
const TOUR_ROLE = "admin-municipal";

interface Layout {
  /** Elemento destacado (coordenadas da janela), ou `null` se não há/ainda não apareceu. */
  rect: Box | null;
  /** Onde desenhar: o `<dialog>` modal aberto (para não ficar inerte) ou o `<body>`. */
  host: HTMLElement | null;
  card: { top: number; left: number } | null;
}

/** `<dialog>` modal aberto: tudo fora dele fica inerte, então o tour precisa morar dentro. */
function openModalDialog(): HTMLElement | null {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog[open]")) {
    try {
      // Ignora gavetas de telas ocultas (sem caixa na página).
      if (dialog.matches(":modal") && dialog.getClientRects().length > 0) return dialog;
    } catch {
      return null;
    }
  }
  return null;
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

/**
 * Tour guiado do Modo Apresentação: um cartão ancorado ao elemento de cada passo, com
 * destaque ("spotlight") que não bloqueia a tela, para o apresentador interagir.
 * Navega entre as telas sozinho, funciona pelo teclado (← → Esc) e pode ser pulado.
 */
export function TourOverlay() {
  const t = messages.tour;
  const { open, step: index, fromDemo, goTo, close } = useTourStore();
  const router = useRouter();
  const municipality = useMunicipalities()[0];
  const { role } = useSession();
  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery("(max-width: 639px)");
  const [layout, setLayout] = useState<Layout>({ rect: null, host: null, card: null });
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigatedRef = useRef<string | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    void useTourStore.persist.rehydrate();
  }, []);

  const step = TOUR_STEPS[index] ?? TOUR_STEPS[0];
  const total = TOUR_STEPS.length - 1;
  const isIntro = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;

  const top = useQuery({
    ...queries.ranking({ municipality: municipality?.id ?? "", pageSize: 1 }),
    enabled: open && !!municipality,
  });
  const topBlock = top.data?.data[0];
  const href = open && step.path && topBlock ? step.path({ blockId: topBlock.id }) : null;

  // Leva o apresentador à tela do passo (uma vez por passo; ele pode navegar depois).
  useEffect(() => {
    if (!href) return;
    const key = `${index}:${href}`;
    if (navigatedRef.current === key) return;
    navigatedRef.current = key;
    if (!isAtStepLocation(href, window.location)) router.push(href, { scroll: false });
  }, [href, index, router]);

  // Acompanha o alvo (rolagem, redimensionamento, telas carregando) a cada quadro.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let scrolled = false;
    const tick = () => {
      const element = step.target
        ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
        : null;
      const r = element?.getBoundingClientRect();
      const rect =
        r && r.width > 0 && r.height > 0
          ? { top: r.top, left: r.left, width: r.width, height: r.height }
          : null;
      if (element && rect && !scrolled) {
        scrolled = true;
        const outside = rect.top < 72 || rect.top + Math.min(rect.height, 240) > window.innerHeight;
        if (outside)
          element.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
      }
      const host = openModalDialog();
      const size = cardRef.current
        ? { width: cardRef.current.offsetWidth, height: cardRef.current.offsetHeight }
        : null;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const card = size ? placeCard(rect, size, viewport) : null;
      setLayout((prev) =>
        sameBox(prev.rect, rect) &&
        prev.host === host &&
        prev.card?.top === card?.top &&
        prev.card?.left === card?.left
          ? prev
          : {
              rect,
              host,
              card: card && { top: Math.round(card.top), left: Math.round(card.left) },
            },
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step.target, reducedMotion]);

  // Foco no título a cada passo: o leitor de tela anuncia o novo conteúdo.
  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open, index, layout.host]);

  if (!open || typeof document === "undefined") return null;

  const needsProfileSwitch = isIntro && role !== null && role.id !== TOUR_ROLE;
  const waiting = !!step.target && !layout.rect;

  function begin() {
    if (municipality) useAppStore.getState().setMunicipalityId(municipality.id);
    goTo(1);
  }
  const previous = () => goTo(Math.max(1, index - 1));
  const next = () => (isLast ? close() : goTo(index + 1));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // Não deixa o Esc fechar também a gaveta em que o tour está desenhado.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (!isIntro && event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (!isIntro && event.key === "ArrowLeft" && index > 1) {
      event.preventDefault();
      previous();
    }
  }

  const spotlight = layout.rect && {
    top: layout.rect.top - SPOTLIGHT_PADDING,
    left: layout.rect.left - SPOTLIGHT_PADDING,
    width: layout.rect.width + SPOTLIGHT_PADDING * 2,
    height: layout.rect.height + SPOTLIGHT_PADDING * 2,
  };

  const layer = (
    <div className="pointer-events-none fixed inset-0 z-[60]" data-tour-layer>
      {isIntro && (
        <div aria-hidden className="absolute inset-0 animate-fade-in bg-verde-ipe-950/45" />
      )}
      {spotlight && (
        <div
          aria-hidden
          className="absolute rounded-xl transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            ...spotlight,
            boxShadow: "0 0 0 3px #fab20a, 0 0 0 9999px rgb(4 37 26 / 0.38)",
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-body`}
        onKeyDown={onKeyDown}
        className={cn(
          "pointer-events-auto fixed flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-4 rounded-card border border-line bg-surface p-5 text-fg shadow-pop",
          compact && "inset-x-3 bottom-3 w-auto",
          !compact && !layout.card && "invisible",
        )}
        style={
          compact || !layout.card ? undefined : { top: layout.card.top, left: layout.card.left }
        }
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 rounded-t-card brand-gradient" />
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
            {isIntro ? (
              <>
                <Presentation aria-hidden className="size-4 text-highlight-ink" />
                {t.regionLabel}
              </>
            ) : (
              t.progress(index, total)
            )}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={t.skip}
            title={t.skip}
            className="-m-1 rounded-md p-1 text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2
            ref={headingRef}
            id={`${uid}-title`}
            tabIndex={-1}
            className="text-lg leading-snug font-semibold focus:outline-none"
          >
            {step.title}
          </h2>
          <p id={`${uid}-body`} className="text-sm leading-relaxed text-fg-muted">
            {step.body}
          </p>
          {isIntro && fromDemo && municipality && topBlock && (
            <p className="rounded-control bg-accent-soft px-3 py-2 text-sm text-fg">
              <strong className="font-semibold">{messages.presentation.ready}.</strong>{" "}
              {messages.presentation.readyDetail(municipality.name, topBlock.code)}
            </p>
          )}
          {needsProfileSwitch && (
            <p className="rounded-control bg-warning-soft px-3 py-2 text-xs text-warning-fg">
              {t.switchingProfile}
            </p>
          )}
          {waiting && (
            <p role="status" className="text-xs text-fg-subtle">
              {t.waiting}
            </p>
          )}
        </div>

        {!isIntro && (
          <div aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
        )}

        {isIntro ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-xs text-fg-muted">
              <Clock aria-hidden className="size-3.5" />
              {t.duration} · {t.keyboardHint}
            </p>
            <div className="flex flex-wrap gap-2">
              {needsProfileSwitch ? (
                <form
                  action={signInAs}
                  onSubmit={() => {
                    if (municipality) useAppStore.getState().setMunicipalityId(municipality.id);
                    goTo(1);
                  }}
                >
                  <input type="hidden" name="role" value={TOUR_ROLE} />
                  <input type="hidden" name="proximo" value="/mapa" />
                  <Button type="submit">
                    {t.begin}
                    <ArrowRight aria-hidden />
                  </Button>
                </form>
              ) : (
                <Button onClick={begin} disabled={!topBlock}>
                  {t.begin}
                  <ArrowRight aria-hidden />
                </Button>
              )}
              <Button variant="ghost" onClick={close}>
                {t.explore}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={previous} disabled={index <= 1}>
              <ArrowLeft aria-hidden />
              {t.previous}
            </Button>
            <Button size="sm" onClick={next}>
              {isLast ? t.finish : t.next}
              {!isLast && <ArrowRight aria-hidden />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Ao trocar de tela, a gaveta da tela anterior some; o tour volta para o <body>.
  return createPortal(layer, layout.host ?? document.body);
}

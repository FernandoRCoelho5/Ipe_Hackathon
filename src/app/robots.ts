import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

/**
 * A landing e a privacidade são públicas. As telas não precisam de bloqueio aqui: sem
 * sessão, o proxy redireciona para `/entrar`, que tem `noindex`. Ficam bloqueadas só a
 * API e as páginas de login e de acesso restrito.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/entrar", "/acesso-restrito"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

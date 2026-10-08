import type { MetadataRoute } from "next";
import { PLATFORM_ROUTES } from "@/domain/access/access";
import { siteConfig } from "@/lib/config/site";

/** Só a landing e a privacidade são públicas; as telas, o login e a API não são indexados. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacidade"],
      disallow: ["/api/", "/entrar", ...PLATFORM_ROUTES],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

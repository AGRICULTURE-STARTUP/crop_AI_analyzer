import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/farmer/",
        "/agency/",
        "/lender/",
        "/admin/",
      ],
    },
    sitemap: "https://ukulimabora.co.ke/sitemap.xml",
    host: "https://ukulimabora.co.ke",
  };
}

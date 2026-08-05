import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/farmer/",
        "/buyer/",
        "/agency/",
        "/lender/",
        "/admin/",
      ],
    },
    sitemap: "https://agriscan.co.ke/sitemap.xml",
    host: "https://agriscan.co.ke",
  };
}

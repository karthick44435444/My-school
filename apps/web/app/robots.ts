import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://schoolvajo.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/tour",
          "/download",
          "/contact",
          "/login",
          "/privacy",
          "/register-school",
          "/blog",
          "/blog/*",
          "/Tour/*",
          "/*.png",
          "/*.jpg",
          "/*.svg",
          "/*.ico",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/teacher",
          "/teacher/*",
          "/principal",
          "/principal/*",
          "/student",
          "/student/*",
          "/parent",
          "/parent/*",
          "/dashboard",
          "/dashboard/*",
          "/api/*",
          "/uploads/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

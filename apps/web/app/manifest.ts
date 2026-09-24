import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SchoolVajo - Online School Management System",
    short_name: "SchoolVajo",
    description:
      "Modern multi-tenant cloud school management system and mobile app for Attendance, Exams, Homework, and Administration.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#4F46E5",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

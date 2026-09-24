import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download SchoolVajo Mobile App (Android APK & iOS) | SchoolVajo",
  description:
    "Download the official SchoolVajo Mobile Application. Instant daily attendance alerts, homework assignments, exam scorecards, and push notifications for students and parents.",
  keywords: [
    "download school app",
    "SchoolVajo APK download",
    "school mobile app Android",
    "parent student school app",
    "SchoolVajo app download",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/download",
  },
  openGraph: {
    title: "Download SchoolVajo Mobile App (Android APK)",
    description:
      "Direct mobile app download for fast, real-time campus management and parent notifications.",
    url: "https://schoolvajo.com/download",
    images: [{ url: "/about-banner.jpg", width: 1200, height: 630, alt: "Download SchoolVajo Mobile App" }],
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

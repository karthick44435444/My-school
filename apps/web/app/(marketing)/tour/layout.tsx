import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Tour & UI Showcase | SchoolVajo School Management Software",
  description:
    "Explore SchoolVajo's 15+ feature modules. Visual walkthrough of Admin dashboards, Principal oversight, Teacher gradebooks, Student portals, and Parent mobile apps.",
  keywords: [
    "school software demo",
    "school management UI tour",
    "online attendance preview",
    "digital report card tour",
    "SchoolVajo features showcase",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/tour",
  },
  openGraph: {
    title: "Platform Tour & UI Showcase | SchoolVajo",
    description:
      "Explore SchoolVajo's 15+ feature modules with complete Web and Mobile app parity.",
    url: "https://schoolvajo.com/tour",
    images: [{ url: "/about-banner.jpg", width: 1200, height: 630, alt: "SchoolVajo Platform Tour" }],
  },
};

export default function TourLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

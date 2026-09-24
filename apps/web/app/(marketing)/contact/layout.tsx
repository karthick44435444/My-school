import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact SchoolVajo Support & Schedule a Campus Demo | SchoolVajo",
  description:
    "Get in touch with the SchoolVajo institutional onboarding team. Request a live campus walkthrough, inquire about enterprise tiers, or reach technical support.",
  keywords: [
    "contact SchoolVajo",
    "school software demo",
    "school ERP support",
    "school software pricing inquiry",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/contact",
  },
  openGraph: {
    title: "Contact SchoolVajo Support & Campus Demo",
    description:
      "Request a personalized school walkthrough or contact our institutional support team.",
    url: "https://schoolvajo.com/contact",
    images: [{ url: "/contact-banner.jpg", width: 1200, height: 630, alt: "Contact SchoolVajo" }],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

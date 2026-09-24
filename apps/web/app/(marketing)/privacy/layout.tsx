import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Student Data Protection Standards | SchoolVajo",
  description:
    "Explore SchoolVajo's institutional privacy policy and security architecture. Learn how tenant isolation, SSL encryption, and strict data governance safeguard student records.",
  keywords: [
    "school software privacy policy",
    "student data protection",
    "school ERP data security",
    "SchoolVajo security standards",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy & Student Data Protection | SchoolVajo",
    description:
      "Enterprise data protection standards and tenant isolation for educational institutions.",
    url: "https://schoolvajo.com/privacy",
    images: [{ url: "/privacy-banner.jpg", width: 1200, height: 630, alt: "SchoolVajo Privacy Policy" }],
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

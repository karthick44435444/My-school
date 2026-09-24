import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About SchoolVajo | Modern Educational Management Platform",
  description:
    "Learn about SchoolVajo's mission to empower educational institutions, principals, teachers, students, and parents with intelligent cloud campus workflows and mobile accessibility.",
  keywords: [
    "about SchoolVajo",
    "school management software company",
    "cloud campus mission",
    "EdTech India",
    "school ERP creators",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/about",
  },
  openGraph: {
    title: "About SchoolVajo | Modern Educational Management Platform",
    description:
      "Empowering educational institutions with modern academic workflows, real-time attendance, digital gradebooks, and parent collaboration.",
    url: "https://schoolvajo.com/about",
    images: [{ url: "/about-banner.jpg", width: 1200, height: 630, alt: "About SchoolVajo" }],
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

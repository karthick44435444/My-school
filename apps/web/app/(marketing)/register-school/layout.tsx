import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Your School Online Free | SchoolVajo Cloud Campus",
  description:
    "Set up your school on SchoolVajo in 2 minutes. Free trial with full administrative control, teacher onboarding, classroom attendance, homework tracking, and mobile access.",
  keywords: [
    "register school online",
    "create school account",
    "free school management software",
    "school registration portal",
    "SchoolVajo free trial",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/register-school",
  },
  openGraph: {
    title: "Register Your School Online Free | SchoolVajo",
    description:
      "Set up your cloud campus in 2 minutes. Free trial with full administrative control and parent mobile apps.",
    url: "https://schoolvajo.com/register-school",
    images: [{ url: "/about-banner.jpg", width: 1200, height: 630, alt: "Register Your School on SchoolVajo" }],
  },
};

export default function RegisterSchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

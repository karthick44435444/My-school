import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Portal Sign In | SchoolVajo Management System",
  description:
    "Secure sign-in for School Administrators, Principals, Teachers, Students, and Parents on SchoolVajo.",
  keywords: [
    "school login",
    "SchoolVajo login",
    "student portal login",
    "teacher portal login",
    "parent portal login",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/login",
  },
  openGraph: {
    title: "School Portal Sign In | SchoolVajo",
    description:
      "Secure sign-in for School Administrators, Principals, Teachers, Students, and Parents.",
    url: "https://schoolvajo.com/login",
    images: [{ url: "/login-banner.jpg", width: 1200, height: 630, alt: "SchoolVajo Portal Login" }],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

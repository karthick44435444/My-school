import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import PushNotificationManager from "@/components/PushNotificationManager";
import TopProgressBar from "@/components/TopProgressBar";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://schoolvajo.com"),
  title: {
    default: "SchoolVajo | #1 Online School Management Software & ERP Portal",
    template: "%s | SchoolVajo",
  },
  description:
    "SchoolVajo is India's leading cloud-based online school management software & mobile app. Streamline student attendance, homework, exams, digital report cards, parent communication, and administration for K-12 schools, colleges, and educational institutions.",
  applicationName: "SchoolVajo",
  authors: [{ name: "SchoolVajo Team", url: "https://schoolvajo.com" }],
  generator: "Next.js",
  keywords: [
    "school management software",
    "online school management system",
    "online school manage",
    "school ERP software",
    "cloud school management platform",
    "student attendance management system",
    "digital report card generator",
    "school mobile app for parents",
    "school administration software",
    "school management app India",
    "best school ERP",
    "classroom homework tracker",
    "exam marks management system",
    "school management portal",
    "school communication app",
    "SchoolVajo",
    "SchoolVajo app",
    "schoolvajo.com",
  ],
  referrer: "origin-when-cross-origin",
  creator: "SchoolVajo",
  publisher: "SchoolVajo",
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: "https://schoolvajo.com",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon-precomposed.png",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://schoolvajo.com",
    siteName: "SchoolVajo",
    title: "SchoolVajo | #1 Online School Management Software & ERP Portal",
    description:
      "Modern cloud school management platform and mobile app for Attendance, Exams, Homework, Digital Report Cards, and Multi-Role Administration.",
    images: [
      {
        url: "/about-banner.jpg",
        width: 1200,
        height: 630,
        alt: "SchoolVajo - Modern Online School Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SchoolVajo | Online School Management Software & ERP Portal",
    description:
      "Modern cloud school management platform and mobile app for Attendance, Exams, Homework, Digital Report Cards, and Multi-Role Administration.",
    images: ["/about-banner.jpg"],
    creator: "@schoolvajo",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google-site-verification-token",
  },
  category: "education",
};

// Global Structured Data Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://schoolvajo.com/#organization",
      name: "SchoolVajo",
      url: "https://schoolvajo.com",
      logo: {
        "@type": "ImageObject",
        "@id": "https://schoolvajo.com/#logo",
        url: "https://schoolvajo.com/logo.png",
        caption: "SchoolVajo Logo",
      },
      image: "https://schoolvajo.com/logo.png",
      description:
        "Comprehensive online school management platform providing multi-tenant attendance, examinations, homework, and mobile access.",
      email: "schoolvajo@gmail.com",
      sameAs: [
        "https://www.instagram.com/schoolvajo/",
        "https://www.facebook.com/profile.php?id=61594499947847",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://schoolvajo.com/#software",
      name: "SchoolVajo School Management System",
      operatingSystem: "Web, Android, iOS",
      applicationCategory: "EducationalApplication, BusinessApplication",
      offers: {
        "@type": "Offer",
        price: "299",
        priceCurrency: "INR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "128",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://schoolvajo.com/#website",
      url: "https://schoolvajo.com",
      name: "SchoolVajo",
      publisher: {
        "@id": "https://schoolvajo.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://schoolvajo.com/blog?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://schoolvajo.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <TopProgressBar />
        <PushNotificationManager />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import PushNotificationManager from "@/components/PushNotificationManager";
import TopProgressBar from "@/components/TopProgressBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My School",
  description:
    "Complete multi-tenant school management platform with beautiful UI for Admin, Principal, Teachers, Students & Parents.",
  applicationName: "My School",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <TopProgressBar />
        <PushNotificationManager />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

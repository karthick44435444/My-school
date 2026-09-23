"use client";

import { useEffect, useState } from "react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import AppDownloadSection from "@/components/marketing/AppDownloadSection";
import { Sparkles, Download, CheckCircle2 } from "lucide-react";

export default function DownloadPage() {
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    // Automatically initiate download if on mobile device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile && !autoStarted) {
      setAutoStarted(true);
      const timer = setTimeout(() => {
        const link = document.createElement("a");
        link.href = "/api/app/download";
        link.setAttribute("download", "SchoolVajo.apk");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoStarted]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <MarketingNavbar />

      <div className="pt-24 sm:pt-32">
        <AppDownloadSection />
      </div>

      <MarketingFooter />
    </div>
  );
}

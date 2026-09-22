"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/shared/QRCodeDisplay";

const DIRECT_APK_URL =
  "https://expo.dev/artifacts/eas/8b530834-7f6b-42fc-be94-2a20a2e658bb.apk";

export default function AppDownloadSection() {
  const [copied, setCopied] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(DIRECT_APK_URL);

  useEffect(() => {
    // Determine public download URL based on window location
    if (typeof window !== "undefined") {
      setDownloadUrl(`${window.location.origin}/api/app/download`);
    }
  }, []);

  const handleDownload = () => {
    toast.info("Starting direct SchoolVajo APK download...");
    // Direct browser download trigger
    const link = document.createElement("a");
    link.href = DIRECT_APK_URL;
    link.setAttribute("download", "SchoolVajo.apk");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl || DIRECT_APK_URL);
      setCopied(true);
      toast.success("App download link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "SchoolVajo Mobile App",
      text: "Download the official SchoolVajo School Management Mobile App for Android:",
      url: downloadUrl || DIRECT_APK_URL,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      // Fallback for browsers without native share
      handleCopy();
    }
  };

  return (
    <section
      id="download-app"
      className="relative py-20 bg-gradient-to-b from-slate-50 via-indigo-50/40 to-slate-50 border-t border-slate-200/80 overflow-hidden"
    >
      {/* Background ambient decorative shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Smartphone className="w-3.5 h-3.5" /> Official Android Mobile App
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Get the <span className="text-indigo-600">SchoolVajo App</span> on
            Your Phone
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Empower Teachers, Students, Parents, and Administrators with
            real-time attendance, instant circulars, homework tracking, and
            report cards on the go.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 lg:p-12 items-center">
            {/* Left Col: Download Controls & Trust Details (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Trust & Play Store Notice Banner */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Direct Early Access &amp; Verified Security</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-800 text-[10px] font-extrabold">
                      v1.0.0
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Our apps will soon be available on the <strong>Google Play Store</strong> and <strong>Apple App Store</strong>. In the meantime, you can safely download our official, verified early-access Android app directly with 100% secure cryptographic builds.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Download, Copy, Share */}
              <div className="space-y-3 pt-2">
                {/* Primary 1-Click Direct Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Download APK Directly (Android)</span>
                  <span className="text-xs font-normal opacity-80 bg-indigo-700/80 px-2.5 py-0.5 rounded-lg ml-1">
                    ~81 MB
                  </span>
                </button>

                {/* Secondary Quick Actions: Copy Link & Share */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-2 shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy App Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-2 shadow-xs"
                  >
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share App</span>
                  </button>
                </div>
              </div>

              {/* Verified Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Virus &amp; Malware Free</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>EAS Secure Build</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700 col-span-2 sm:col-span-1">
                  <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Android 8.0 &amp; Above</span>
                </div>
              </div>

              {/* 3-Step Quick Install Instructions */}
              <div className="pt-2 border-t border-slate-100">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" /> Quick 3-Step
                  Installation Guide:
                </h5>
                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <li className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-900 block">
                      1. Download APK
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tap the Download button or scan QR code.
                    </span>
                  </li>
                  <li className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-900 block">
                      2. Allow Installation
                    </span>
                    <span className="text-[11px] text-slate-500">
                      If prompted, enable &ldquo;Allow from this source&rdquo;.
                    </span>
                  </li>
                  <li className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-900 block">
                      3. Sign In
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Open SchoolVajo and enter your school credentials.
                    </span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Col: Laptop View QR Code Card & Phone Mockup Preview (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl space-y-6 text-center border border-slate-800">
                {/* QR Section (Prominent on Laptop / Desktop view) */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    <QrCode className="w-3.5 h-3.5" /> Scan to Download
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Scan with Mobile Camera
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto">
                    Point your phone camera at this QR code to instantly download the mobile app on your Android device.
                  </p>
                </div>

                {/* QR Code Frame */}
                <div className="p-3.5 bg-white rounded-3xl shadow-xl inline-block mx-auto">
                  <QRCodeDisplay
                    value={downloadUrl || DIRECT_APK_URL}
                    size={210}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                    includeLogo={true}
                  />
                </div>

                {/* Desktop Quick Copy Link */}
                <div className="pt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Download Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

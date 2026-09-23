"use client";

import { useState, useEffect } from "react";
import {
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/shared/QRCodeDisplay";

const DIRECT_DOWNLOAD_PATH = "/api/app/download";
const FALLBACK_EAS_URL =
  "https://expo.dev/artifacts/eas/8b530834-7f6b-42fc-be94-2a20a2e658bb.apk";

export default function AppDownloadSection() {
  const [copied, setCopied] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(FALLBACK_EAS_URL);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDownloadUrl(`${window.location.origin}${DIRECT_DOWNLOAD_PATH}`);
    }
  }, []);

  const handleDownload = () => {
    toast.info("Downloading SchoolVajo.apk...");
    const link = document.createElement("a");
    link.href = DIRECT_DOWNLOAD_PATH;
    link.setAttribute("download", "SchoolVajo.apk");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl || FALLBACK_EAS_URL);
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
      text: "Download the official SchoolVajo School Management Mobile App for Android (SchoolVajo.apk):",
      url: downloadUrl || FALLBACK_EAS_URL,
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
      handleCopy();
    }
  };

  return (
    <section
      id="download-app"
      className="relative py-20 bg-gradient-to-b from-slate-50 via-indigo-50/40 to-slate-50 border-t border-slate-200/80 overflow-hidden"
    >
      {/* Background ambient decorative glows */}
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

        {/* ========================================================================= */}
        {/* 1. LAPTOP / DESKTOP VIEW (Display size is BIG -> Show QR Code ONLY)       */}
        {/* ========================================================================= */}
        <div className="hidden md:block">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Information & Trust Banner & Quick Actions */}
              <div className="lg:col-span-7 space-y-6">
                {/* Verified Trust Banner (Shown on both big & small displays) */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Direct Early Access &amp; Verified Security</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 text-[11px] font-extrabold">
                        v1.0.0
                      </span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Our apps will soon be available on the{" "}
                      <strong>Google Play Store</strong> and{" "}
                      <strong>Apple App Store</strong>. In the meantime, you can
                      safely download our official, verified early-access
                      Android app directly with 100% secure cryptographic
                      builds.
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Virus &amp; Malware Free</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>EAS Secure Build</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Android 8.0 &amp; Above</span>
                  </div>
                </div>

                {/* Laptop Action buttons (Copy link & Share only — NO download button on big screen) */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center gap-2 shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy Mobile App Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center gap-2 shadow-xs"
                  >
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share App Link</span>
                  </button>
                </div>
              </div>

              {/* Right Column: QR Code Display Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-7 shadow-2xl space-y-5 text-center border border-slate-800">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                      <QrCode className="w-3.5 h-3.5" /> Scan QR to Download
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Scan with Mobile Camera
                    </h3>
                    <p className="text-xs text-slate-300">
                      Point your phone camera at this QR code to download
                      SchoolVajo on your phone.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto">
                    <QRCodeDisplay
                      value={downloadUrl || FALLBACK_EAS_URL}
                      size={210}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                      includeLogo={true}
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
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
                          <span>Copy Link</span>
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

        {/* ========================================================================= */}
        {/* 2. MOBILE & TABLET VIEW (Display size is SMALL -> Show Download Button)   */}
        {/* ========================================================================= */}
        <div className="block md:hidden">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-6 space-y-5">
            {/* App Icon Preview & Details */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-white p-2.5 shadow-md border border-slate-200 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="SchoolVajo App"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900 leading-tight">
                    SchoolVajo
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  School ERP &amp; Campus Portal
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Safe &amp; Verified
                  </span>
                  <span>•</span>
                  <span className="text-slate-400">~81 MB</span>
                </div>
              </div>
            </div>

            {/* Verified Trust Banner (Shown on both big & small displays) */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Direct Early Access &amp; Verified Security</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 text-[9px] font-extrabold">
                    v1.0.0
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Our apps will soon be available on the{" "}
                  <strong>Google Play Store</strong> and{" "}
                  <strong>Apple App Store</strong>. In the meantime, you can
                  safely download our official, verified early-access Android
                  app directly with 100% secure cryptographic builds.
                </p>
              </div>
            </div>

            {/* Direct 1-Click Download Button (Downloads as SchoolVajo.apk) */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Download App (SchoolVajo)</span>
            </button>

            {/* Quick Actions: Copy Link & Share */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share App</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Virus &amp; Malware Free</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>EAS Secure Build</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

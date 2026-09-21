"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Maximize2,
  X,
  Layers,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Calendar,
  FileCheck,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { TOUR_ITEMS, TourItem } from "@/lib/tourData";

const CATEGORIES = [
  { id: "all", label: "All Interfaces", count: TOUR_ITEMS.length },
  { id: "dashboards", label: "Role Dashboards", count: TOUR_ITEMS.filter((t) => t.category === "dashboards").length },
  { id: "attendance", label: "Attendance System", count: TOUR_ITEMS.filter((t) => t.category === "attendance").length },
  { id: "academics", label: "Exams & Homework", count: TOUR_ITEMS.filter((t) => t.category === "academics").length },
  { id: "admin", label: "Admin & Communication", count: TOUR_ITEMS.filter((t) => t.category === "admin").length },
];

export default function PlatformTourPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string; type: "Web" | "Mobile" } | null>(null);

  const filteredItems =
    selectedCategory === "all"
      ? TOUR_ITEMS
      : TOUR_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <MarketingNavbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold tracking-wide shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Platform Tour &amp; Live UI Gallery</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Explore Every Feature on{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Web &amp; Mobile
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Inspect real interfaces for Administrators, Principals, Teachers, Students, and Parents.
              Every workflow is engineered for speed, zero-hassle attendance, automated gradebooks, and instant parent updates.
            </p>

            {/* Quick Filter Tabs */}
            <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Gallery Cards Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6"
            >
              {/* Card Header & Description */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${item.badgeColor}`}>
                      {item.roleBadge}
                    </span>
                    <span className="text-xs font-bold text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-500">
                      {item.categoryLabel}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {item.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/register-school"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Parallel Showcase: Desktop Web + Mobile Phone Frames */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Desktop Web Window Frame (8 Cols) */}
                <div className="lg:col-span-8 group relative rounded-2xl border border-slate-200 bg-slate-900/5 p-2 sm:p-3 shadow-md hover:shadow-xl transition-all">
                  <div className="rounded-xl overflow-hidden bg-white border border-slate-200/90 shadow-xs">
                    {/* Browser Address Bar */}
                    <div className="h-8 bg-slate-100/90 border-b border-slate-200 px-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-3 py-0.5 rounded-md border border-slate-200 text-[10px] font-mono text-slate-500 font-semibold shadow-2xs max-w-[240px] truncate">
                        <Monitor className="w-3 h-3 text-indigo-600" />
                        <span>{item.webUrl}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                        Web View
                      </span>
                    </div>

                    {/* Screenshot */}
                    <div
                      className="relative overflow-hidden cursor-pointer aspect-16/10 bg-slate-50 flex items-center justify-center group/img"
                      onClick={() => setLightboxImg({ src: item.webImage, title: item.title, type: "Web" })}
                    >
                      <img
                        src={item.webImage}
                        alt={`${item.title} Web View`}
                        className="w-full h-full object-contain object-top group-hover/img:scale-[1.01] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                        <span className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Full Size</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Desktop Web Application</span>
                    </span>
                    <span className="text-slate-400">Click image to expand</span>
                  </div>
                </div>

                {/* Mobile Phone Mockup Frame (4 Cols) - Clean Bezel Without Notch */}
                <div className="lg:col-span-4 group relative flex flex-col items-center">
                  <div className="w-full max-w-[220px] sm:max-w-[235px] rounded-[32px] border-[5px] border-slate-800 bg-slate-900 p-1 shadow-xl hover:shadow-2xl transition-all">
                    <div className="rounded-[26px] overflow-hidden bg-slate-950 border border-slate-800 relative">
                      <div
                        className="relative overflow-hidden cursor-pointer aspect-9/18.5 bg-slate-900 flex items-center justify-center group/mimg"
                        onClick={() => setLightboxImg({ src: item.mobileImage, title: item.title, type: "Mobile" })}
                      >
                        <img
                          src={item.mobileImage}
                          alt={`${item.title} Mobile View`}
                          className="w-full h-full object-contain group-hover/mimg:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover/mimg:bg-slate-900/30 transition-all flex items-center justify-center opacity-0 group-hover/mimg:opacity-100">
                          <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-bold shadow-md flex items-center gap-1">
                            <Maximize2 className="w-3 h-3 text-indigo-600" />
                            <span>Expand</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 text-center text-[11px] text-slate-500 font-medium flex items-center gap-1.5 justify-center">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mobile App (iOS &amp; Android)</span>
                  </div>
                </div>
              </div>

              {/* Extra Screenshot if available (e.g. Bulk Upload) */}
              {item.extraWebImage && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Additional View: {item.extraLabel || "Extended Feature"}</span>
                  </div>
                  <div
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 cursor-pointer group/extra"
                    onClick={() => setLightboxImg({ src: item.extraWebImage!, title: `${item.title} - ${item.extraLabel || 'Extra View'}`, type: "Web" })}
                  >
                    <img
                      src={item.extraWebImage}
                      alt={item.extraLabel || item.title}
                      className="w-full h-auto max-h-[400px] object-contain object-top rounded-xl group-hover/extra:scale-[1.01] transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              {/* Highlights Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6 border-t border-slate-100">
                {item.features.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </section>

        {/* CTA Bottom Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                Ready to transform your school&apos;s digital operations?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Join hundreds of educational institutions managing attendance, gradebooks, announcements, and parent engagement effortlessly.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register-school"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Register School Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition flex items-center justify-center cursor-pointer"
                >
                  <span>Institution Portal Login</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Zoom Modal */}
      <AnimatePresence>
        {lightboxImg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl w-full max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            >
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLightboxImg(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer border border-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-600 text-white">
                      {lightboxImg.type} View
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                      {lightboxImg.title}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                  title="Close (Esc)"
                >
                  <span className="text-xs font-medium text-slate-400 hidden sm:inline">Close</span>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 max-h-[calc(92vh-60px)]">
                <img
                  src={lightboxImg.src}
                  alt={lightboxImg.title}
                  className="max-h-[82vh] w-auto object-contain rounded-lg shadow-sm"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MarketingFooter />
    </div>
  );
}

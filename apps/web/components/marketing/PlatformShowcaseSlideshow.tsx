"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Maximize2,
  X,
  Layers,
} from "lucide-react";
import { TOUR_ITEMS, TourItem } from "@/lib/tourData";

export default function PlatformShowcaseSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string; type: "Web" | "Mobile" } | null>(null);

  const currentItem = TOUR_ITEMS[currentIndex];

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % TOUR_ITEMS.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + TOUR_ITEMS.length) % TOUR_ITEMS.length);
  }, []);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-advance timer (5.5 seconds)
  useEffect(() => {
    if (isPaused || lightboxImg !== null) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(timer);
  }, [nextSlide, isPaused, lightboxImg]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImg) {
        if (e.key === "Escape") setLightboxImg(null);
        return;
      }
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, lightboxImg]);

  return (
    <div
      className="relative max-w-5xl mx-auto text-left"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Category & Screen Quick Pills */}
      <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-2 px-2 no-scrollbar">
        {TOUR_ITEMS.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={item.id}
              onClick={() => goToSlide(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                  : "bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-slate-400"}`} />
              <span>{item.title.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Slideshow Container */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-xl shadow-indigo-500/5 overflow-hidden">
        {/* Top Header & Slide Progress Bar */}
        <div className="relative border-b border-slate-100 px-5 py-3 bg-slate-50/70 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${currentItem.badgeColor}`}>
              {currentItem.roleBadge}
            </span>
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
              {currentItem.categoryLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Slide index badge */}
            <span className="text-xs font-mono font-bold text-slate-400">
              <strong className="text-slate-800">{currentIndex + 1}</strong> / {TOUR_ITEMS.length}
            </span>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous Slide"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next Slide"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Animated timer bar indicator */}
          {!isPaused && (
            <motion.div
              key={currentIndex}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5.5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-indigo-600"
            />
          )}
        </div>

        {/* Slide Content Area */}
        <div className="p-4 sm:p-6 min-h-[460px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-5"
            >
              {/* Slide Title & Feature Explanation Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 text-left">
                <div className="space-y-1 max-w-2xl text-left">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>{currentItem.title}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
                    {currentItem.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/tour"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all shadow-2xs hover:gap-2"
                  >
                    <span>Full Platform Tour</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Parallel Showcase: Web Desktop + Mobile Phone Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-center">
                {/* 1. Web Portal Window Frame (8 Cols) */}
                <div className="lg:col-span-8 group relative rounded-2xl border border-slate-200 bg-slate-900/5 p-1.5 shadow-md hover:shadow-lg transition-all">
                  <div className="rounded-xl overflow-hidden bg-white border border-slate-200/90 shadow-xs">
                    {/* Web Browser Bar */}
                    <div className="h-7 bg-slate-100/90 border-b border-slate-200 px-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500 font-semibold shadow-2xs max-w-[200px] truncate">
                        <Monitor className="w-3 h-3 text-indigo-600" />
                        <span>{currentItem.webUrl}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                        Web Portal
                      </span>
                    </div>

                    {/* Web Screenshot Image */}
                    <div
                      className="relative overflow-hidden cursor-pointer aspect-16/10 bg-slate-50 flex items-center justify-center group/img"
                      onClick={() => setLightboxImg({ src: currentItem.webImage, title: currentItem.title, type: "Web" })}
                    >
                      <img
                        src={currentItem.webImage}
                        alt={`${currentItem.title} Web View`}
                        className="w-full h-full object-contain object-top group-hover/img:scale-[1.01] transition-transform duration-300"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                        <span className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Fullscreen</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-600" />
                      <span>Desktop Web App</span>
                    </span>
                    <span className="text-slate-400">Click to expand</span>
                  </div>
                </div>

                {/* 2. Mobile App Phone Frame (4 Cols) - Clean Bezel Without Notch */}
                <div className="lg:col-span-4 group relative flex flex-col items-center">
                  <div className="w-full max-w-[210px] sm:max-w-[225px] rounded-[30px] border-[4px] border-slate-800 bg-slate-900 p-1 shadow-lg hover:shadow-xl transition-all">
                    {/* Clean Phone Screen Container (No Notch) */}
                    <div className="rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 relative">
                      {/* Mobile Screenshot Image */}
                      <div
                        className="relative overflow-hidden cursor-pointer aspect-9/18.5 bg-slate-900 flex items-center justify-center group/mimg"
                        onClick={() => setLightboxImg({ src: currentItem.mobileImage, title: currentItem.title, type: "Mobile" })}
                      >
                        <img
                          src={currentItem.mobileImage}
                          alt={`${currentItem.title} Mobile View`}
                          className="w-full h-full object-contain group-hover/mimg:scale-[1.02] transition-transform duration-300"
                          loading="eager"
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
                  <div className="mt-2 text-center text-[10px] text-slate-500 font-medium flex items-center gap-1.5 justify-center">
                    <Smartphone className="w-3 h-3 text-indigo-600" />
                    <span>Native Mobile App</span>
                  </div>
                </div>
              </div>

              {/* Function Highlights Checklist for Active Screen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-left">
                {currentItem.features.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-200/70 text-[11px] text-slate-700 font-medium text-left"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-tight text-left">{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA Strip */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-purple-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 text-left">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Explore all <strong>15+ feature modules</strong> with complete Web &amp; Mobile parity.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/tour"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>See Full Platform Tour</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal with Clear Back Button */}
      <AnimatePresence>
        {lightboxImg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative max-w-5xl w-full max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            >
              {/* Lightbox Header with Back Button */}
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
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { TOUR_ITEMS, type TourItem } from "@/lib/tourData";

const getPillLabel = (item: TourItem) => {
  if (item.id === "admin-dashboard") return "Admin";
  if (item.id === "principal-dashboard") return "Principal";
  if (item.id === "teacher-dashboard") return "Teacher";
  if (item.id === "student-dashboard") return "Student";
  if (item.id === "parent-dashboard") return "Parents";
  if (item.id === "attendance-marking") return "Attendance";
  if (item.id === "attendance-reports") return "Reports";
  if (item.id === "parent-attendance-monitor") return "Calendar";
  if (item.id === "leave-notification") return "Alerts";
  if (item.id === "exams-and-marks") return "Exams";
  if (item.id === "student-marks") return "Marks";
  if (item.id === "homework-management") return "Homework";
  if (item.id === "announcements") return "Notices";
  if (item.id === "bulk-import") return "Bulk Upload";
  if (item.id === "school-settings") return "Branding";
  return item.title.split(" ")[0];
};

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 280, damping: 30, mass: 0.8 },
      opacity: { duration: 0.28, ease: "easeOut" },
      scale: { duration: 0.28, ease: "easeOut" },
    },
  },
  exit: (dir: number) => ({
    zIndex: 0,
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.985,
    transition: {
      x: { type: "spring", stiffness: 280, damping: 30, mass: 0.8 },
      opacity: { duration: 0.2, ease: "easeIn" },
      scale: { duration: 0.2, ease: "easeIn" },
    },
  }),
};

export default function PlatformShowcaseSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [isUserInteracted, setIsUserInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pillListRef = useRef<HTMLDivElement>(null);

  const currentItem = TOUR_ITEMS[currentIndex];

  const nextSlide = useCallback((isAuto = false) => {
    if (!isAuto) {
      setIsUserInteracted(true);
    }
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % TOUR_ITEMS.length);
  }, []);

  const prevSlide = useCallback((isAuto = false) => {
    if (!isAuto) {
      setIsUserInteracted(true);
    }
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + TOUR_ITEMS.length) % TOUR_ITEMS.length);
  }, []);

  const goToSlide = (idx: number) => {
    if (idx === currentIndex) return;
    setIsUserInteracted(true);
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Auto-advance timer (5.5s) - Active ONLY when user hasn't manually interacted
  useEffect(() => {
    if (isUserInteracted || isHovered) return;
    const timer = setInterval(() => {
      nextSlide(true);
    }, 5500);
    return () => clearInterval(timer);
  }, [nextSlide, isUserInteracted, isHovered]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSlide(false);
      if (e.key === "ArrowLeft") prevSlide(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div
      className="relative max-w-5xl mx-auto text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Category & Screen Quick Pills */}
      <div
        ref={pillListRef}
        className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-2 px-2 no-scrollbar scroll-smooth"
      >
        {TOUR_ITEMS.map((item, idx) => {
          const isActive = idx === currentIndex;
          const label = getPillLabel(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSlide(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                  : "bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isActive ? "bg-white" : "bg-slate-400"
                }`}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Slideshow Container */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-xl shadow-indigo-500/5 overflow-hidden">
        {/* Top Header & Slide Progress Bar */}
        <div className="relative border-b border-slate-100 px-5 py-3 bg-slate-50/70 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${currentItem.badgeColor}`}
            >
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
                onClick={() => prevSlide(false)}
                aria-label="Previous Slide"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => nextSlide(false)}
                aria-label="Next Slide"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Animated timer bar indicator (only active during auto-play mode) */}
          {!isUserInteracted && (
            <motion.div
              key={currentIndex}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5.5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-indigo-600 z-10 pointer-events-none"
            />
          )}
        </div>

        {/* Slide Content Area with Carousel Sliding Animation */}
        <div className="p-4 sm:p-6 min-h-[460px] flex flex-col justify-between overflow-hidden relative">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={currentItem.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5 w-full"
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
                <div className="lg:col-span-8 relative rounded-2xl border border-slate-200 bg-slate-900/5 p-1.5 shadow-md transition-all">
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
                    <div className="relative overflow-hidden aspect-16/10 bg-slate-100 flex items-center justify-center">
                      <img
                        src={currentItem.webImage}
                        alt={`${currentItem.title} Web View`}
                        className="w-full h-full object-contain object-top"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  </div>
                  <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-600" />
                      <span>Desktop Web App</span>
                    </span>
                  </div>
                </div>

                {/* 2. Mobile App Phone Frame (4 Cols) */}
                <div className="lg:col-span-4 relative flex flex-col items-center">
                  <div className="w-full max-w-[210px] sm:max-w-[225px] rounded-[30px] border-[4px] border-slate-800 bg-slate-900 p-1 shadow-lg transition-all">
                    {/* Clean Phone Screen Container */}
                    <div className="rounded-[24px] overflow-hidden bg-slate-950 border border-slate-800 relative">
                      {/* Mobile Screenshot Image */}
                      <div className="relative overflow-hidden aspect-9/18.5 bg-slate-900 flex items-center justify-center">
                        <img
                          src={currentItem.mobileImage}
                          alt={`${currentItem.title} Mobile View`}
                          className="w-full h-full object-contain"
                          loading="eager"
                          decoding="async"
                        />
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
    </div>
  );
}

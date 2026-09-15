"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketingNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preload routes for instantaneous transitions
  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/about");
    router.prefetch("/contact");
    router.prefetch("/privacy");
    router.prefetch("/login");
    router.prefetch("/register-school");
  }, [router]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
  ];

  const triggerTopLoader = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("startTopLoader"));
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 pointer-events-none transition-all">
      {/* Centered Floating Bar with blur transparent background only */}
      <div className="pointer-events-auto max-w-7xl mx-auto rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all hover:bg-white/80">
        {/* Brand Logo */}
        <Link
          href="/"
          prefetch={true}
          onClick={triggerTopLoader}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 p-2 flex items-center justify-center border border-slate-200/80 shadow-xs group-hover:scale-105 group-hover:border-indigo-300 transition-all">
            <img src="/logo.png" alt="My School" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1 leading-tight">
              My School
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-wider -mt-0.5">
              Cloud Campus
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links in pill grouping */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-full border border-slate-200/50 shadow-inner">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                onClick={triggerTopLoader}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs with generous horizontal padding */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            prefetch={true}
            onClick={triggerTopLoader}
            className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition px-4 py-2 rounded-full hover:bg-white/60"
          >
            Sign In
          </Link>
          <Link
            href="/register-school"
            prefetch={true}
            onClick={triggerTopLoader}
            className="px-6 sm:px-7 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>Register School</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            onClick={triggerTopLoader}
            className="text-xs font-bold text-slate-700 px-3.5 py-1.5 rounded-full border border-slate-200/80 bg-white/80"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full border border-slate-200/80 text-slate-700 hover:bg-white/90 bg-white/70 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Mobile Menu Card */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto md:hidden mt-2 max-w-7xl mx-auto rounded-3xl bg-white/85 backdrop-blur-xl border border-white/80 shadow-2xl p-4 space-y-2"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    triggerTopLoader();
                  }}
                  className={`block px-4 py-2.5 rounded-2xl text-xs font-bold transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                      : "text-slate-700 hover:bg-white/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/register-school"
                onClick={() => {
                  setMobileMenuOpen(false);
                  triggerTopLoader();
                }}
                className="w-full text-center py-2.5 px-6 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                Register School
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

"use client";

import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin } from "lucide-react";

export default function MarketingFooter() {
  const triggerTopLoader = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("startTopLoader"));
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              onClick={triggerTopLoader}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shadow-indigo-500/10 border border-slate-200">
                <img
                  src="/logo.png"
                  alt="SchoolVajo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                SchoolVajo
              </span>
            </Link>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Unified multi-tenant cloud platform empowering educational
              institutions with modern academic workflows, real-time attendance,
              gradebooks, and seamless parent collaboration.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link
                  href="/"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Overview & Features
                </Link>
              </li>
              <li>
                <Link
                  href="/tour"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Platform Tour & UI Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  About Our Mission
                </Link>
              </li>
              <li>
                <Link
                  href="/register-school"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Portal Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Legal & Support
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link
                  href="/contact"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Help & Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#isolation"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Data Security Standards
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#student-data"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Student Privacy Rights
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Direct */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Contact Info
            </h4>
            <ul className="space-y-3 text-xs text-slate-500 font-medium">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>support@schoolvajo.com</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Tech Park, Bangalore, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} SchoolVajo. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              onClick={triggerTopLoader}
              className="hover:text-slate-600 transition"
            >
              Privacy Policy
            </Link>
            <Link
              href="/contact"
              onClick={triggerTopLoader}
              className="hover:text-slate-600 transition"
            >
              Contact Support
            </Link>
            <Link
              href="/login"
              onClick={triggerTopLoader}
              className="hover:text-slate-600 transition"
            >
              Institution Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

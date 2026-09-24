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
                  href="/download"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition font-bold text-indigo-600"
                >
                  Mobile App (Android APK)
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
                  href="/blog"
                  onClick={triggerTopLoader}
                  className="hover:text-indigo-600 transition"
                >
                  Blog & EdTech Resources
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
              Contact & Social
            </h4>
            <ul className="space-y-3 text-xs text-slate-500 font-medium">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <a
                  href="mailto:schoolvajo@gmail.com"
                  className="hover:text-indigo-600 transition"
                >
                  schoolvajo@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <a
                  href="https://www.instagram.com/schoolvajo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-pink-600 hover:text-pink-700 font-semibold transition"
                >
                  <svg
                    className="w-4 h-4 fill-current shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>@schoolvajo on Instagram</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <a
                  href="https://www.facebook.com/profile.php?id=61594499947847"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-blue-600 hover:text-blue-700 font-semibold transition"
                >
                  <svg
                    className="w-4 h-4 fill-current shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>SchoolVajo on Facebook</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Serving Schools Across India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SchoolVajo. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
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
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <a
                href="https://www.instagram.com/schoolvajo/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-slate-400 hover:text-pink-600 transition"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61594499947847"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-slate-400 hover:text-blue-600 transition"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

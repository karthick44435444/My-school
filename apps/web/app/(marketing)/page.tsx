"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS } from "@myschool/shared";
import {
  Sparkles,
  School,
  Users,
  BarChart3,
  Bell,
  Shield,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  Smartphone,
  ChevronDown,
  Layers,
  Award,
  Zap,
  Lock,
  Building2,
  Check,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PlatformShowcaseSlideshow from "@/components/marketing/PlatformShowcaseSlideshow";

export default function MarketingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    {
      title: "Smart Attendance Tracking",
      tag: "Zero Friction",
      desc: "One-click classroom roll calls by subject teachers. Parents receive immediate mobile updates and administrators monitor daily campus attendance in real time.",
      icon: CalendarCheck,
      points: [
        "Period-wise & daily attendance recording",
        "Instant SMS/Push notification to absent student parents",
        "Automated monthly percentage calculations & defaulter alerts",
      ],
      metric: "99.8%",
      metricLabel: "Attendance Logging Accuracy",
    },
    {
      title: "Exams & Digital Report Cards",
      tag: "Academic Excellence",
      desc: "Configure terms, subjects, max marks, and grading rules. Teachers enter scores effortlessly while the system automatically generates printable report cards.",
      icon: FileSpreadsheet,
      points: [
        "Dynamic grading scales (CBSE, ICSE, State Boards)",
        "Automated GPA, subject rank, and class percentiles",
        "Secure digital report cards accessible to parents & students",
      ],
      metric: "2.5x",
      metricLabel: "Faster Gradebook Publishing",
    },
    {
      title: "5-Role Collaborative Portal",
      tag: "Multi-Role Ecosystem",
      desc: "Fine-grained permissions and custom UI tailored for Admins, Principals, Teachers, Students, and Parents on both responsive Web and native Mobile apps.",
      icon: Users,
      points: [
        "Admin control: fees, plan management, branding & staff setup",
        "Principal oversight: teacher workloads & student performance analytics",
        "Parent dashboard: fee receipts, daily homework & notice board",
      ],
      metric: "5 in 1",
      metricLabel: "Unified Role Dashboards",
    },
    {
      title: "Mobile First & Real-Time Sync",
      tag: "Always Connected",
      desc: "Instant cloud synchronization across web browsers, Android, and iOS devices. Homework, circulars, and announcements reach stakeholders immediately.",
      icon: Smartphone,
      points: [
        "Live push notifications for timetable changes & announcements",
        "Offline-friendly mobile app caching for low-connectivity zones",
        "Biometric authentication and secure cloud backup",
      ],
      metric: "100%",
      metricLabel: "Real-Time Cloud Sync",
    },
  ];

  const faqs = [
    {
      q: "How does SchoolVajo isolate each school's data?",
      a: "Every registered institution is assigned a unique, isolated cryptographic tenant ID in our database. Data, documents, student records, and marks are strictly partitioned so no two schools can ever access each other's records.",
    },
    {
      q: "Can we customize our school branding and theme color?",
      a: "Yes! School administrators can upload their custom school logo, enter official contact information, and select their primary brand color theme (with automatic accessibility and contrast validation).",
    },
    {
      q: "Are credentials automatically generated for new staff and students?",
      a: "Yes. When an administrator or principal adds a teacher, student, or parent, the system automatically creates their secure login ID and temporary password, with one-click copy options and automated email dispatch.",
    },
    {
      q: "Is there a free trial before purchasing a subscription plan?",
      a: "Yes. All newly registered schools receive a complimentary trial period to test all features including attendance, marks entry, timetable management, and role-based access.",
    },
    {
      q: "What devices are supported?",
      a: "SchoolVajo runs on any modern web browser (Chrome, Safari, Firefox, Edge) on desktop/tablets, as well as dedicated responsive mobile interfaces for smartphones.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Modern School Management & Cloud Campus</span>
          </motion.div>

          {/* Main Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6"
          >
            Run your school{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              smarter, faster
            </span>{" "}
            &amp; beautifully
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A unified multi-tenant platform built for Administrators, Principals, Teachers, Students, and Parents.
            Automate attendance, examinations, report cards, timetables, and communication with ease.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              href="/register-school"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5"
            >
              <span>Create Your School Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm sm:text-base shadow-sm hover:bg-slate-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
            >
              <span>Institution Login</span>
            </Link>
          </motion.div>

          {/* Hero Dashboard Interactive Slideshow Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full"
          >
            <PlatformShowcaseSlideshow />
          </motion.div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="py-12 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: "100%", label: "Paperless Operations", sub: "Digital registers & reports" },
              { val: "5-in-1", label: "Multi-Role Dashboards", sub: "Admin, Principal, Teacher, Student, Parent" },
              { val: "< 1 Sec", label: "Real-time Sync", sub: "Instant mobile & web alerts" },
              { val: "99.99%", label: "Cloud Reliability", sub: "Encrypted multi-tenant isolation" },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">
                  {stat.val}
                </div>
                <div className="text-xs font-bold text-slate-900">{stat.label}</div>
                <div className="text-[11px] text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Feature Deep Dive */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Built for Scale &amp; Simplicity
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Everything Your Institution Needs in One Place
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Engineered from the ground up to replace outdated legacy systems with clean, responsive, and delightful software.
          </p>
        </div>

        {/* Feature Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {features.map((feat, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <feat.icon className="w-4 h-4" />
                <span>{feat.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Display Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-xl shadow-slate-200/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase">
                {features[activeTab].tag}
              </div>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {features[activeTab].title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {features[activeTab].desc}
              </p>

              <div className="space-y-3 pt-2">
                {features[activeTab].points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-700">{pt}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href="/register-school"
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <span>Explore in Live Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md text-indigo-600 flex items-center justify-center border border-indigo-100">
                {(() => {
                  const Icon = features[activeTab].icon;
                  return <Icon className="w-8 h-8" />;
                })()}
              </div>
              <div>
                <span className="text-4xl sm:text-5xl font-extrabold text-indigo-600 block">
                  {features[activeTab].metric}
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider mt-1 block">
                  {features[activeTab].metricLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Guaranteed high performance on all low-bandwidth mobile and web connections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Role Dedicated Cards */}
      <section className="py-20 bg-slate-100/60 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase">
              <Users className="w-3.5 h-3.5" /> Tailored Portals
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              One Unified System. Five Tailored Roles.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Each user enters a clean, clutter-free workspace designed exclusively for their responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {[
              {
                role: "Administrators",
                icon: Building2,
                desc: "School configuration, branding, subscription plans, fees, and staff accounts.",
                color: "text-blue-600 bg-blue-50 border-blue-100",
              },
              {
                role: "Principals",
                icon: Award,
                desc: "Academic oversight, teacher attendance reports, grade trends, and institution circulars.",
                color: "text-purple-600 bg-purple-50 border-purple-100",
              },
              {
                role: "Teachers",
                icon: GraduationCap,
                desc: "Class attendance marking, exam marks entry, homework allocation, and timetable views.",
                color: "text-indigo-600 bg-indigo-50 border-indigo-100",
              },
              {
                role: "Students",
                icon: School,
                desc: "Personal academic timeline, daily timetable, homework tracker, and report cards.",
                color: "text-emerald-600 bg-emerald-50 border-emerald-100",
              },
              {
                role: "Parents",
                icon: Users,
                desc: "Real-time attendance alerts, fee receipts, teacher remarks, and school notices.",
                color: "text-pink-600 bg-pink-50 border-pink-100",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.role}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 pt-2 border-t border-slate-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Dedicated Portal</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="plans" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Plans for Schools of All Sizes
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            No hidden setup fees. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan, idx) => {
            const isAvailable = plan.id === "BASIC";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl bg-white p-8 border transition-all flex flex-col justify-between ${
                  isAvailable
                    ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-2xl scale-105 z-10"
                    : "border-slate-200 bg-slate-50/50 opacity-75 shadow-sm"
                }`}
              >
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md ${
                    isAvailable
                      ? "bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 ring-2 ring-white"
                      : "bg-slate-500 ring-2 ring-white"
                  }`}
                >
                  {isAvailable ? "FREE TRIAL — ₹99" : (plan.badge || "UPCOMING")}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      ₹{plan.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/month</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isAvailable ? "Special introductory offer with full features" : "Full academic tier (Coming Soon)"}
                  </p>

                  <div className="my-6 border-t border-slate-100" />

                  <ul className="space-y-3">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isAvailable ? "text-emerald-500" : "text-slate-400"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  {isAvailable ? (
                    <Link
                      href="/register-school?plan=BASIC"
                      className="w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
                    >
                      <span>Choose 1-Month Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <div className="w-full py-3.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center cursor-not-allowed">
                      <span>Upcoming Plan</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) Accordion */}
      <section className="py-20 bg-slate-100/60 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about the SchoolVajo cloud platform.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-indigo-600 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-600" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-8 sm:p-14 text-center space-y-6 shadow-xl shadow-indigo-600/20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Instant 2-Minute Setup
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Transform Your School Management Today
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
              Join forward-thinking schools using SchoolVajo to empower faculty, delight parents, and streamline administration.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register-school"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-indigo-700 font-extrabold text-sm shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all"
              >
                Start Free Registration
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-700/60 border border-indigo-400/40 text-white font-bold text-sm hover:bg-indigo-700 transition"
              >
                Schedule Campus Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

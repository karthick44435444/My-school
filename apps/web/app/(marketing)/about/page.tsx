"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Award,
  Globe2,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function AboutPage() {
  const roles = [
    {
      title: "Administrators",
      desc: "Full school governance, multi-branch control, billing, global branding, and user account provisioning.",
      icon: Building2,
      bg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Principals",
      desc: "Comprehensive academic oversight, teacher monitoring, attendance analytics, and performance insights.",
      icon: Award,
      bg: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      title: "Teachers",
      desc: "Effortless attendance tracking, digital gradebooks, examination marks entry, and homework distribution.",
      icon: GraduationCap,
      bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Students",
      desc: "Personalized academic timeline, real-time timetable, exam report cards, and digital homework tracker.",
      icon: BookOpen,
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      title: "Parents",
      desc: "Instant attendance notifications, exam performance tracking, teacher remarks, and school notices.",
      icon: Users,
      bg: "bg-pink-50 text-pink-600 border-pink-100",
    },
  ];

  const stats = [
    { label: "Attendance Precision", value: "99.8%", desc: "Real-time verification" },
    { label: "Paperless Efficiency", value: "100%", desc: "Fully digital workflows" },
    { label: "Grading Speedup", value: "2.5x", desc: "Automated report cards" },
    { label: "Platform Uptime", value: "99.9%", desc: "Cloud infrastructure" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-20 overflow-hidden">
        {/* Ambient background light gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> About SchoolVajo
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Empowering Modern Education with a{" "}
                <span className="text-indigo-600">Unified Campus Cloud</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                SchoolVajo was built to bridge the gap between educational administration, faculty workflows, student engagement, and parent transparency. We combine intuitive design with enterprise-grade multi-tenant architecture.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/register-school"
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <span>Start Your Campus</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Contact Our Team
                </Link>
              </div>
            </motion.div>

            {/* Right Image Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-6 relative"
            >
              <div className="rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 p-2">
                <img
                  src="/about-banner.jpg"
                  alt="SchoolVajo Community & Ecosystem"
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="py-12 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-1"
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-slate-900">{stat.label}</div>
                <div className="text-[11px] text-slate-500">{stat.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5-Role Ecosystem Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" /> 5 Dedicated Experiences
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Stakeholder
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A harmonious interface crafted specifically for each role in your school ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${role.bg}`}>
                  <role.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{role.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Custom Portal Experience</span>
              </div>
            </motion.div>
          ))}

          {/* Quick Mission Statement Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-md flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Our Global Mission</h3>
              <p className="text-xs text-indigo-100 leading-relaxed">
                To replace fragmented spreadsheets, paper registers, and complex software with a delightfully modern school experience accessible on web and mobile.
              </p>
            </div>
            <Link
              href="/register-school"
              className="inline-flex items-center gap-2 text-xs font-bold text-white underline underline-offset-4 hover:text-indigo-200"
            >
              Get started with SchoolVajo →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ready to modernise your school operations?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Get instant access to your school portal with automated setup and admin credentials.
          </p>
          <div>
            <Link
              href="/register-school"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"
            >
              <span>Register Your School Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  Users,
  Server,
  UserCheck,
  CheckCircle2,
  Mail,
  Sparkles,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      id: "isolation",
      title: "1. Multi-Tenant School Data Isolation",
      content:
        "Every school operating on SchoolVajo is assigned a dedicated, strictly isolated cryptographic tenant identifier. Student records, faculty files, attendance logs, and marks belonging to one institution are never accessible or co-mingled with another institution.",
    },
    {
      id: "student-data",
      title: "2. Student Privacy & Child Protection",
      content:
        "We adhere strictly to global student data privacy frameworks including COPPA and FERPA equivalents. Student information is collected solely for legitimate educational administration, attendance verification, exam report card generation, and parental communication. We never sell, monetize, or profile student data for advertising.",
    },
    {
      id: "collection",
      title: "3. Information We Collect",
      content:
        "We collect only the minimum required data to operate your school portal: (a) User details: Name, Role, Class, Section, Roll number, Phone number, and Email; (b) Academic records: Daily attendance, Subject marks, Examination grades, and Teacher remarks; (c) Operational logs: School notices, timetable schedules, and homework submissions.",
    },
    {
      id: "security",
      title: "4. Encryption & Security Standards",
      content:
        "All communications across web and mobile apps are protected with TLS 1.3 encryption in transit and AES-256 encryption at rest. Multi-tier Role-Based Access Control (RBAC) ensures administrators, principals, teachers, students, and parents access strictly authorized scopes.",
    },
    {
      id: "rights",
      title: "5. Parent, Student & Faculty Rights",
      content:
        "Parents and adult students have the right to inspect, verify, and request corrections to their personal profile and attendance records via their designated school administrator. At any time, authorized institution administrators may export or request permanent deletion of their school's database records.",
    },
    {
      id: "retention",
      title: "6. Data Retention & Deletion",
      content:
        "Academic and attendance data is retained throughout the active school academic year and subscription term. Upon account termination or written request from the institution administrator, all associated records are permanently purged from active databases and secondary backups within 30 days.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">
      <MarketingNavbar />

      {/* Hero Header */}
      <section className="relative pt-28 sm:pt-36 pb-16 overflow-hidden">
        {/* Ambient background light gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Header Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Enterprise-Grade Trust
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Privacy & Data <span className="text-indigo-600">Protection Policy</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We believe trust is the cornerstone of education. Learn how SchoolVajo protects student, faculty, and institutional data with multi-tenant isolation, encrypted storage, and non-commercialization guarantees.
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                <span>Last Updated: September 2026</span>
                <span>•</span>
                <span>Version 2.4</span>
              </div>
            </motion.div>

            {/* Right Visual Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="rounded-3xl overflow-hidden border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-200/60">
                <img
                  src="/privacy-banner.jpg"
                  alt="Data Privacy and Protection"
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Policy Content & Quick Navigation */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Key Guarantee Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Zero Ad Tracking</h4>
                <p className="text-[11px] text-slate-500">No selling of student data</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Isolated Tenants</h4>
                <p className="text-[11px] text-slate-500">Strict database segregation</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">FERPA / COPPA Ready</h4>
                <p className="text-[11px] text-slate-500">Child safety standards</p>
              </div>
            </div>
          </div>

          {/* Detailed Policy Clauses */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm space-y-8">
            {sections.map((sec) => (
              <div key={sec.id} id={sec.id} className="space-y-2 border-b border-slate-100 pb-6 last:border-b-0 last:pb-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  {sec.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          {/* DPO Contact Box */}
          <div className="rounded-3xl bg-indigo-50/70 border border-indigo-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-base font-bold text-indigo-950">Data Protection Officer (DPO)</h4>
              <p className="text-xs text-indigo-700">
                For security audits, data export requests, or compliance inquiries, reach out to our privacy office.
              </p>
            </div>
            <a
              href="mailto:privacy@schoolvajo.com"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm shrink-0 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> privacy@schoolvajo.com
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

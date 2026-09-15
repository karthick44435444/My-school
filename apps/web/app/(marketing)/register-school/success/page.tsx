"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Check,
  Key,
  School,
  User,
  Mail,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Credentials {
  schoolCode: string;
  schoolName: string;
  adminUsername: string;
  adminPassword: string;
  email: string;
  themeColor: string;
  plan: string;
}

export default function RegisterSuccessPage() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("myschool_new_school");
    if (raw) {
      try {
        setCredentials(JSON.parse(raw));
      } catch {
        setCredentials(null);
      }
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    if (!credentials) return;
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://myschool.app/login";
    const text = `My School Login Credentials
==============================
School Name: ${credentials.schoolName}
School Code: ${credentials.schoolCode}
Admin Username: ${credentials.adminUsername}
Admin Password: ${credentials.adminPassword}
Admin Email: ${credentials.email}
Login URL: ${loginUrl}
==============================`;
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    toast.success("All credentials copied!");
    setTimeout(() => setAllCopied(false), 2500);
  };

  if (!credentials) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 max-w-md w-full text-center shadow-lg">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Credentials Found</h1>
          <p className="text-slate-500 mb-6 text-sm">
            Please register your school first to generate credentials.
          </p>
          <Link
            href="/register-school"
            className="inline-block px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm"
          >
            Create School
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-slate-50/80 text-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden select-none">
      {/* Soft Ambient Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60"
      >
        {/* Success Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3 shadow-sm"
          >
            <CheckCircle2 className="w-8 h-8" />
          </motion.div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Institution Activated
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            School Created Successfully!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-900">{credentials.schoolName}</span> is now ready.
          </p>
        </div>

        {/* Notice Alert */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-950 block mb-0.5">Save these credentials now!</strong>
            A copy has also been sent to <span className="font-bold underline">{credentials.email}</span>.
            Use these details to log into your administrator account.
          </div>
        </div>

        {/* Credentials Cards */}
        <div className="space-y-3 mb-6">
          {/* School Code */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <School className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">School Code</span>
                <code className="text-lg font-black font-mono tracking-wider text-indigo-600">
                  {credentials.schoolCode}
                </code>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(credentials.schoolCode, "School Code")}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Copy School Code"
            >
              {copiedField === "School Code" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Admin Username */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Admin Username</span>
                <code className="text-base font-bold font-mono text-slate-800">
                  {credentials.adminUsername}
                </code>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(credentials.adminUsername, "Username")}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Copy Username"
            >
              {copiedField === "Username" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Admin Password */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Admin Password</span>
                <code className="text-base font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {showPassword ? credentials.adminPassword : "••••••••••••"}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition shadow-sm"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(credentials.adminPassword, "Password")}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                title="Copy Password"
              >
                {copiedField === "Password" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={copyAll}
            className={`w-full py-3 rounded-xl border font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm ${
              allCopied
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            {allCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{allCopied ? "All Credentials Copied!" : "Copy All Credentials"}</span>
          </motion.button>

          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 flex items-center justify-center gap-2 transition"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Email Footnote */}
        <p className="text-center text-xs text-slate-400 mt-5 flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-indigo-500" />
          <span>Credentials also dispatched to {credentials.email}</span>
        </p>
      </motion.div>
    </div>
  );
}



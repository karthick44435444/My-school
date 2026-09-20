"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  School,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { clearAuthCache } from "@/hooks/useAuth";

const ROLE_PATH: Record<string, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({
    schoolCode: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    // Check if school code was previously stored
    if (typeof window !== "undefined") {
      const savedSchoolCode = localStorage.getItem("myschool_last_school_code");
      if (savedSchoolCode) {
        setForm((prev) => ({ ...prev, schoolCode: savedSchoolCode }));
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolCode.trim() || !form.username.trim() || !form.password) {
      toast.error("Please fill in all credentials");
      return;
    }
    setLoading(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("startTopLoader"));
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: form.schoolCode.trim(),
          username: form.username.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");

      clearAuthCache();
      const str = JSON.stringify(data.user);
      sessionStorage.setItem("myschool_user", str);
      localStorage.setItem("myschool_user", str);
      if (rememberMe) {
        localStorage.setItem(
          "myschool_last_school_code",
          form.schoolCode.trim(),
        );
      }
      if (typeof window !== "undefined") {
        (window as any).__myschool_user = data.user;
      }
      toast.success("Welcome back! Signing in...");
      const targetDashboard = ROLE_PATH[data.user.role] || "/admin";
      window.location.replace(targetDashboard);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finishTopLoader"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50/80 overflow-hidden select-none">
      {/* Soft Ambient Pastel Background Shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />

      {/* Subtle Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />

      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* LEFT COLUMN: Campus Illustration Banner (Reduced Shadow & Light Aesthetics) */}
        <div className="hidden lg:flex lg:col-span-6 relative p-8 flex-col justify-between overflow-hidden bg-slate-100/70 border-r border-slate-200/70">
          {/* Background Image Container */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src="/login-banner.jpg"
              alt="School Campus & Students"
              className="w-full h-full object-cover opacity-90 scale-100 transition-transform duration-700 hover:scale-105"
            />
            {/* Soft Light Overlay Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          </div>

          {/* Top Floating Badges */}
          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/60 text-slate-800 text-xs font-semibold shadow-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>99.8% Attendance Precision</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/60 text-slate-800 text-xs font-semibold shadow-sm w-max ml-auto">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Smart Gradebook & Exams</span>
            </div>
          </div>

          {/* Bottom Banner Info Box */}
          <div className="relative z-10 mt-auto">
            <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-white/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Unified Campus Cloud
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Admin • Principal • Teacher • Student • Parent
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Empowering modern institutions with real-time attendance,
                gradebooks, automated notices, and parent engagement.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form Fields */}
        <div className="lg:col-span-6 p-7 sm:p-10 md:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Top Brand Header with Work Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shadow-indigo-500/10 border border-slate-200">
                <img
                  src="/logo.png"
                  alt="MySchool"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  My School
                </span>
                <p className="text-xs text-slate-500 font-medium">
                  Smart Campus Management System
                </p>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Enter your assigned school code and credentials to sign in.
              </p>
            </div>

            {/* Login Form */}
            <form
              onSubmit={handleLogin}
              className="space-y-4"
              autoComplete="on"
            >
              {/* School Code Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  School Code <span className="text-indigo-600">*</span>
                </label>
                <div className="relative group">
                  <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                  <input
                    type="text"
                    name="schoolCode"
                    autoComplete="organization"
                    value={form.schoolCode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        schoolCode: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-mono text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition shadow-sm"
                    placeholder="SCH-xxxxx"
                    required
                  />
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Username <span className="text-indigo-600">*</span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition shadow-sm"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password <span className="text-indigo-600">*</span>
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="login-password-input w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition shadow-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-xs font-medium text-slate-600 cursor-pointer"
                >
                  Remember school code on this device
                </label>
              </div>

              {/* Submit Button (Clean "Sign In") */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:brightness-105 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          {/* Bottom Security Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure
              SSL Encrypted
            </span>
            <span>v2.4</span>
          </div>
        </div>
      </motion.div>

      {/* Hide browser native password reveal icons */}
      <style jsx global>{`
        .login-password-input::-ms-reveal,
        .login-password-input::-ms-clear {
          display: none;
        }
        .login-password-input::-webkit-credentials-auto-fill-button,
        .login-password-input::-webkit-contacts-auto-fill-button {
          visibility: hidden;
          display: none !important;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

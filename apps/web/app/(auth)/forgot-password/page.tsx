"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ schoolCode: "", usernameOrEmail: "", code: "", newPassword: "" });
  const [demoCode, setDemoCode] = useState("");

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgot",
          schoolCode: form.schoolCode,
          usernameOrEmail: form.usernameOrEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDemoCode(data.demoCode || "");
      toast.success(data.message || "OTP sent");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          schoolCode: form.schoolCode,
          usernameOrEmail: form.usernameOrEmail,
          code: form.code,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Password reset! Please login.");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur border rounded-2xl p-8 w-full max-w-md shadow-xl">
        <Link href="/login" className="text-sm text-slate-500 flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
        <p className="text-sm text-slate-500 mb-6">OTP will be sent to your registered email.</p>

        {step === 1 ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <input
              required
              placeholder="School Code"
              value={form.schoolCode}
              onChange={(e) => setForm({ ...form, schoolCode: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 rounded-xl border uppercase"
            />
            <input
              required
              placeholder="Username or Email"
              value={form.usernameOrEmail}
              onChange={(e) => setForm({ ...form, usernameOrEmail: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border"
            />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold flex justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            {demoCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                Demo OTP: <strong className="font-mono text-lg">{demoCode}</strong>
              </div>
            )}
            <input required placeholder="OTP Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            <input required type="password" placeholder="New Password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold">
              {loading ? "..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

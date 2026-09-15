"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordViewProps {
  onBack: () => void;
  themeColor?: string;
}

export default function ChangePasswordView({ onBack, themeColor = "#6366F1" }: ChangePasswordViewProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.scrollTo(0, 0);
    onBack();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change",
          oldPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        handleBack();
      }, 700);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Back Button at top */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-sm font-semibold shadow-xs group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Profile</span>
        </button>
      </div>

      {/* Main Change Password Card */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header with gradient */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, #a855f7)` }}
          >
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose a strong password to protect your account. Minimum 6 characters.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: themeColor }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{saving ? "Updating Password..." : "Update Password"}</span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

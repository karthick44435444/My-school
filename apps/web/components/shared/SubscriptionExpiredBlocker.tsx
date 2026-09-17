"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, LogOut, RefreshCw, Sparkles, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearAuthCache } from "@/hooks/useAuth";

interface BlockerProps {
  role: string;
  schoolName?: string;
  onRefresh?: () => void;
}

export default function SubscriptionExpiredBlocker({ role, schoolName, onRefresh }: BlockerProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearAuthCache();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const isAdmin = role === "ADMIN";

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-lg w-full overflow-hidden text-center p-8 sm:p-10 relative"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-6 shadow-inner">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 uppercase tracking-wider mb-3">
          Subscription Expired
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          School Access Inactive
        </h2>

        <p className="text-slate-600 text-sm mt-3 leading-relaxed">
          {isAdmin
            ? `Your school subscription for ${schoolName || "your school"} has reached its expiration date. Please recharge or upgrade your plan to restore immediate access for all staff, teachers, students, and parents.`
            : `The subscription plan for ${schoolName || "your school"} has expired. Access to attendance, homework, marks, and dashboard features is temporarily paused.`}
        </p>

        {!isAdmin && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 text-xs text-left flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Please contact your <strong>School Administrator</strong> or Management to renew the school plan. All your records and history remain secure and will be restored immediately upon renewal.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {isAdmin ? (
            <button
              onClick={() => router.push("/admin/subscription")}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Renew / Upgrade Now
            </button>
          ) : (
            <button
              onClick={() => {
                if (onRefresh) onRefresh();
                else window.location.reload();
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Check Status
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}

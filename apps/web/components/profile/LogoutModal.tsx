"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { clearAuthCache } from "@/hooks/useAuth";

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LogoutModal({ open, onClose }: LogoutModalProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  if (!open) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearAuthCache();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch {
      setLoggingOut(false);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
          <LogOut className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 mb-1">Confirm Logout</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to log out of your session?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loggingOut}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { toast } from "sonner";

/**
 * Plays a pleasant, two-tone notification audio chime using the Web Audio API.
 * 100% client-side, zero assets needed, instant response.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Gentle melodic chime: D5 (587.33Hz) -> A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.warn("[audio] notification chime error", e);
  }
}

export type NotificationPopupOptions = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  notificationId?: string;
};

/**
 * Unified notification display for Web:
 * 1. Melodic audio chime.
 * 2. Native OS desktop pop-up (if browser permission granted).
 * 3. Animated floating in-app toast card featuring the App Logo.
 * 4. Real-time badge refresh.
 */
export function displayNotificationAlert(opts: NotificationPopupOptions) {
  if (typeof window === "undefined") return;

  const title = opts.title || "🔔 My School Notification";
  const body = opts.body || "";
  const icon = opts.icon || "/logo.png";
  const url = opts.url || (opts.notificationId ? `/?markRead=${opts.notificationId}` : undefined);

  // 1. Play chime audio
  playNotificationSound();

  // 2. Native OS Desktop Notification (when permitted)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: "/logo.png",
        tag: opts.notificationId || `myschool_${Date.now()}`,
      });
      notif.onclick = () => {
        window.focus();
        if (url && url !== "#") {
          window.location.href = url;
        }
      };
    } catch (e) {
      console.warn("[push:desktop] Notification error", e);
    }
  }

  // 3. Floating In-App Toast Popup with School Logo
  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-2xl border border-indigo-100 ring-1 ring-black/5 max-w-sm w-full animate-in slide-in-from-top-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center overflow-hidden">
          <img
            src={icon}
            alt="My School"
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{body}</p>
          {url && (
            <button
              onClick={() => {
                toast.dismiss(t);
                window.location.href = url;
              }}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              View Details →
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-slate-400 hover:text-slate-600 p-1 text-xs font-bold"
        >
          ✕
        </button>
      </div>
    ),
    { duration: 6000 }
  );

  // 4. Update in-app badge count
  window.dispatchEvent(new CustomEvent("myschool:badges-updated", { detail: opts }));
}

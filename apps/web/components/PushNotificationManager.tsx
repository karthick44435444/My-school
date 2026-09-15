"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  checkAndMarkNotificationReadFromUrl,
  registerWebPushToken,
  setupForegroundPushListener,
} from "@/lib/firebaseClient";

export default function PushNotificationManager() {
  const pathname = usePathname();

  // 1. Check & mark read from URL whenever route changes or on initial load
  useEffect(() => {
    checkAndMarkNotificationReadFromUrl();
  }, [pathname]);

  // 2. Set up foreground listener and register token if user is logged in
  useEffect(() => {
    const unsub = setupForegroundPushListener();

    // Check if session user exists before attempting push registration
    try {
      const hasUser =
        sessionStorage.getItem("myschool_user") || localStorage.getItem("myschool_user");
      if (hasUser) {
        registerWebPushToken().then((res) => {
          if (res.success) {
            console.log("[push:web] Registered FCM token successfully");
          }
        });
      }
    } catch {}

    return () => {
      unsub();
    };
  }, []);

  return null;
}

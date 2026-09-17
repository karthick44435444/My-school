import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { addNotificationListeners } from "@/lib/notifications";

export type ChildBadgeInfo = {
  homework: number;
  marks: number;
  total: number;
};

type Badges = {
  notifications: number;
  homework: number;
  announcements: number;
  marks: number;
  childBadges: Record<string, ChildBadgeInfo>;
  refresh: () => Promise<void>;
  markNotificationsSeen: () => Promise<void>;
  markHomeworkSeen: (ids: string[]) => Promise<void>;
  markAnnouncementsSeen: (ids: string[]) => Promise<void>;
  markMarksSeen: (ids: string[]) => Promise<void>;
};

const Ctx = createContext<Badges>({
  notifications: 0,
  homework: 0,
  announcements: 0,
  marks: 0,
  childBadges: {},
  refresh: async () => {},
  markNotificationsSeen: async () => {},
  markHomeworkSeen: async () => {},
  markAnnouncementsSeen: async () => {},
  markMarksSeen: async () => {},
});

const SEEN_HW = "seen_hw_ids";
const SEEN_ANN = "seen_ann_ids";
const SEEN_MARKS = "seen_marks_ids";

async function loadSeen(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function saveSeen(key: string, ids: Set<string>) {
  const arr = Array.from(ids).slice(-500);
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setN] = useState(0);
  const [homework, setH] = useState(0);
  const [announcements, setA] = useState(0);
  const [marks, setM] = useState(0);
  const [childBadges, setChildBadges] = useState<Record<string, ChildBadgeInfo>>({});
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await api<any>("/api/badges");
      if (data && data.success !== false) {
        setN(data.notifications || 0);
        setH(data.homework || 0);
        setA(data.announcements || 0);
        setM(data.marks || 0);
        if (data.childBadges) setChildBadges(data.childBadges);
      }
    } catch {
      /* ignore */
    } finally {
      inFlightRef.current = false;
    }
  }, [user?.id]);

  const markNotificationsSeen = useCallback(async () => {
    try {
      await api("/api/notifications", { method: "POST", body: { action: "readAll" } });
    } catch {
      /* ignore */
    }
    setN(0);
    await refresh();
  }, [refresh]);

  const markHomeworkSeen = useCallback(async (ids: string[]) => {
    if (!ids || !ids.length) return;
    try {
      await api("/api/read", { method: "POST", body: { type: "HOMEWORK", itemIds: ids.map(String) } });
    } catch {
      await Promise.all(
        ids.map((id) =>
          api("/api/read", { method: "POST", body: { type: "HOMEWORK", itemId: String(id) } }).catch(() => {})
        )
      );
    }
    setH(0);
    await refresh();
  }, [refresh]);

  const markAnnouncementsSeen = useCallback(async (ids: string[]) => {
    if (!ids || !ids.length) return;
    try {
      await api("/api/read", { method: "POST", body: { type: "ANNOUNCEMENT", itemIds: ids.map(String) } });
    } catch {
      await Promise.all(
        ids.map((id) =>
          api("/api/read", { method: "POST", body: { type: "ANNOUNCEMENT", itemId: String(id) } }).catch(() => {})
        )
      );
    }
    setA(0);
    await refresh();
  }, [refresh]);

  const markMarksSeen = useCallback(async (ids: string[]) => {
    if (!ids || !ids.length) return;
    try {
      await api("/api/read", { method: "POST", body: { type: "MARKS", itemIds: ids.map(String) } });
    } catch {
      await Promise.all(
        ids.map((id) =>
          api("/api/read", { method: "POST", body: { type: "MARKS", itemId: String(id) } }).catch(() => {})
        )
      );
    }
    setM(0);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    // 1. Single initial fetch on mount
    refresh();

    // 2. Real-time Socket.IO subscription
    let unsubBadges: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    (async () => {
      if (!user) return;
      try {
        const { subscribeMobileBadges, subscribeMobileNewNotification } = await import("@/lib/socket");
        unsubBadges = await subscribeMobileBadges((data) => {
          if (data) {
            setN(data.notifications ?? 0);
            setH(data.homework ?? 0);
            setA(data.announcements ?? 0);
            setM(data.marks ?? 0);
            if (data.childBadges) setChildBadges(data.childBadges);
          }
        });

        unsubNotifs = await subscribeMobileNewNotification(() => {
          setN((prev) => prev + 1);
        });
      } catch {
        /* socket fallback */
      }
    })();

    // 3. Instant refresh on incoming push notification
    const unsubPush = addNotificationListeners({
      onReceive: () => {
        refresh();
      },
    });

    return () => {
      if (unsubBadges) unsubBadges();
      if (unsubNotifs) unsubNotifs();
      unsubPush();
    };
  }, [user?.id, refresh]);

  const value = useMemo(
    () => ({
      notifications,
      homework,
      announcements,
      marks,
      childBadges,
      refresh,
      markNotificationsSeen,
      markHomeworkSeen,
      markAnnouncementsSeen,
      markMarksSeen,
    }),
    [
      notifications,
      homework,
      announcements,
      marks,
      childBadges,
      refresh,
      markNotificationsSeen,
      markHomeworkSeen,
      markAnnouncementsSeen,
      markMarksSeen,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBadges() {
  return useContext(Ctx);
}


"use client";

import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export type BadgeCounts = {
  notifications: number;
  homework: number;
  announcements: number;
  marks: number;
  childBadges?: Record<string, { homework: number; marks: number; total: number }>;
};

export type RealtimeNotification = {
  id: string;
  schoolId?: string;
  userId?: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  meta?: any;
  data?: any;
  read?: boolean;
  createdAt?: string;
};

/**
 * Get or initialize the singleton Socket.IO client instance for Web.
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    socketInstance = io({
      path: "/api/socket/io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      // Sync badges once upon connection/reconnection
      socketInstance?.emit("sync:badges");
    });

    socketInstance.on("reconnect", () => {
      // Sync badges once on reconnect
      socketInstance?.emit("sync:badges");
    });
  }

  return socketInstance;
}

/**
 * Subscribe to real-time badge updates from Socket.IO.
 * Returns an cleanup unsubscribe function.
 */
export function subscribeBadges(callback: (badges: BadgeCounts) => void): () => void {
  const s = getSocket();
  if (!s) return () => {};

  const handler = (data: any) => {
    if (data && typeof data === "object") {
      callback({
        notifications: data.notifications ?? 0,
        homework: data.homework ?? 0,
        announcements: data.announcements ?? 0,
        marks: data.marks ?? 0,
        childBadges: data.childBadges,
      });
    }
  };

  s.on("badges:update", handler);
  return () => {
    s.off("badges:update", handler);
  };
}

/**
 * Subscribe to real-time incoming notifications.
 */
export function subscribeNewNotification(callback: (notification: RealtimeNotification) => void): () => void {
  const s = getSocket();
  if (!s) return () => {};

  const handler = (data: any) => {
    if (data) {
      callback(data);
    }
  };

  s.on("notification:new", handler);
  return () => {
    s.off("notification:new", handler);
  };
}

/**
 * Subscribe to notification read events across tabs/devices.
 */
export function subscribeNotificationRead(callback: (data: { id: string }) => void): () => void {
  const s = getSocket();
  if (!s) return () => {};

  const handler = (data: any) => {
    if (data) {
      callback(data);
    }
  };

  s.on("notification:read", handler);
  return () => {
    s.off("notification:read", handler);
  };
}

/**
 * Explicitly request a fresh badge sync once (e.g. after network reconnection).
 */
export function requestBadgeSync() {
  const s = getSocket();
  if (s && s.connected) {
    s.emit("sync:badges");
  }
}

/**
 * Emit notification read event via socket.
 */
export function emitSocketNotificationRead(id: string) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit("notification:read", { id });
  }
}

/**
 * Emit all notifications read event via socket.
 */
export function emitSocketReadAllNotifications() {
  const s = getSocket();
  if (s && s.connected) {
    s.emit("notifications:read_all");
  }
}

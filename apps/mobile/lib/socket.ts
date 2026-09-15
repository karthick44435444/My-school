import { io, Socket } from "socket.io-client";
import { getApiBase, getToken } from "./api";

let mobileSocket: Socket | null = null;
let currentToken: string | null = null;
let currentBaseUrl: string | null = null;

export type MobileBadgeCounts = {
  notifications: number;
  homework: number;
  announcements: number;
  marks: number;
  childBadges?: Record<string, { homework: number; marks: number; total: number }>;
};

export type MobileRealtimeNotification = {
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
 * Initialize or retrieve the authenticated Socket.IO connection for Mobile.
 */
export async function getMobileSocket(): Promise<Socket | null> {
  const [token, baseUrl] = await Promise.all([getToken(), getApiBase()]);

  if (!token) {
    if (mobileSocket) {
      mobileSocket.disconnect();
      mobileSocket = null;
      currentToken = null;
      currentBaseUrl = null;
    }
    return null;
  }

  // If already connected with same credentials and url, return existing instance
  if (mobileSocket && currentToken === token && currentBaseUrl === baseUrl) {
    if (!mobileSocket.connected) {
      mobileSocket.connect();
    }
    return mobileSocket;
  }

  // Disconnect previous socket if url or token changed
  if (mobileSocket) {
    mobileSocket.disconnect();
    mobileSocket = null;
  }

  currentToken = token;
  currentBaseUrl = baseUrl;

  mobileSocket = io(baseUrl, {
    path: "/api/socket/io",
    auth: { token },
    query: { token },
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  mobileSocket.on("connect", () => {
    // Single sync on connect
    mobileSocket?.emit("sync:badges");
  });

  mobileSocket.on("reconnect", () => {
    // Single sync on reconnect
    mobileSocket?.emit("sync:badges");
  });

  return mobileSocket;
}

/**
 * Disconnect socket on user logout.
 */
export function disconnectMobileSocket() {
  if (mobileSocket) {
    mobileSocket.disconnect();
    mobileSocket = null;
    currentToken = null;
    currentBaseUrl = null;
  }
}

/**
 * Subscribe to real-time badge updates on mobile.
 */
export async function subscribeMobileBadges(
  callback: (badges: MobileBadgeCounts) => void
): Promise<() => void> {
  const s = await getMobileSocket();
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
 * Subscribe to real-time incoming notifications on mobile.
 */
export async function subscribeMobileNewNotification(
  callback: (notification: MobileRealtimeNotification) => void
): Promise<() => void> {
  const s = await getMobileSocket();
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
 * Request explicit badge sync once from server.
 */
export function requestMobileBadgeSync() {
  if (mobileSocket && mobileSocket.connected) {
    mobileSocket.emit("sync:badges");
  }
}

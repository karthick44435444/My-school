/**
 * Realtime Event Hub for instant push of notifications and unread badge updates
 * via Socket.IO / WebSocket and Server-Sent Events (SSE) with 0 client-side polling.
 */

type Listener = (event: { type: string; data: any }) => void;

// Global listener registry across active SSE streams
const userListeners = new Map<string, Set<Listener>>();

export function subscribeUserEvents(userId: string, listener: Listener): () => void {
  if (!userListeners.has(userId)) {
    userListeners.set(userId, new Set());
  }
  const set = userListeners.get(userId)!;
  set.add(listener);

  return () => {
    set.delete(listener);
    if (set.size === 0) {
      userListeners.delete(userId);
    }
  };
}

/** Get global Socket.IO server instance if available */
function getIO(): any {
  return (global as any).io || null;
}

/** Emit real-time event to a specific user across both Socket.IO and SSE */
export function emitToUser(userId: string, event: { type: string; data: any }) {
  if (!userId) return;

  // 1. Socket.IO WebSocket broadcast to user room
  const io = getIO();
  if (io) {
    try {
      const room = `user:${userId}`;
      if (event.type === "BADGES") {
        io.to(room).emit("badges:update", { success: true, ...event.data });
      } else if (event.type === "NOTIFICATION_NEW") {
        io.to(room).emit("notification:new", event.data);
      } else if (event.type === "NOTIFICATION_READ") {
        io.to(room).emit("notification:read", event.data);
      } else {
        io.to(room).emit(event.type.toLowerCase(), event.data);
      }
    } catch (err) {
      console.warn("[realtime] Socket.IO emitToUser error:", err);
    }
  }

  // 2. In-memory SSE listener dispatch (backward compatibility)
  const set = userListeners.get(userId);
  if (set) {
    for (const listener of set) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[realtime] SSE listener error:", err);
      }
    }
  }
}

/** Emit event to multiple users */
export function emitToUsers(userIds: string[], event: { type: string; data: any }) {
  if (!Array.isArray(userIds)) return;
  for (const uid of userIds) {
    if (uid) emitToUser(uid, event);
  }
}

/** Emit event to an entire school */
export function emitToSchool(schoolId: string, event: { type: string; data: any }) {
  if (!schoolId) return;
  const io = getIO();
  if (io) {
    try {
      io.to(`school:${schoolId}`).emit(event.type.toLowerCase(), event.data);
    } catch (err) {
      console.warn("[realtime] Socket.IO emitToSchool error:", err);
    }
  }
}

/** Emit fresh badge counts to a specific user */
export async function emitBadgeUpdate(userId: string) {
  if (!userId) return;
  try {
    const { findUserById, getUnreadCounts } = await import("./store");
    const full = findUserById(userId);
    if (!full?.user) return;
    const counts = getUnreadCounts(
      userId,
      full.user.schoolId,
      full.user.role,
      full.user.className,
      full.user.section
    );
    emitToUser(userId, { type: "BADGES", data: counts });
  } catch (e) {
    console.warn("[realtime] emitBadgeUpdate error:", e);
  }
}

/** Emit fresh badge counts to multiple users */
export async function emitBadgeUpdateToUsers(userIds: string[]) {
  if (!Array.isArray(userIds)) return;
  for (const uid of userIds) {
    if (uid) await emitBadgeUpdate(uid);
  }
}

/** Emit a newly created notification directly to the user and trigger instant badge update */
export async function emitNewNotification(userId: string, notification: any) {
  if (!userId || !notification) return;
  try {
    // 1. Send full notification item to user
    emitToUser(userId, { type: "NOTIFICATION_NEW", data: notification });
    // 2. Immediately recalculate and push updated unread badges
    await emitBadgeUpdate(userId);
  } catch (e) {
    console.warn("[realtime] emitNewNotification error:", e);
  }
}

/** Emit newly created notification to multiple recipients */
export async function emitNewNotificationToUsers(userIds: string[], notification: any) {
  if (!Array.isArray(userIds)) return;
  for (const uid of userIds) {
    if (uid) {
      await emitNewNotification(uid, notification);
    }
  }
}

/** Emit notification read event and update badges */
export async function emitNotificationRead(userId: string, notificationId: string) {
  if (!userId) return;
  try {
    emitToUser(userId, { type: "NOTIFICATION_READ", data: { id: notificationId } });
    await emitBadgeUpdate(userId);
  } catch (e) {
    console.warn("[realtime] emitNotificationRead error:", e);
  }
}

// Expose handlers globally so custom server.js can invoke them safely across TypeScript boundary
if (typeof global !== "undefined") {
  (global as any).realtimeEmitBadgeUpdate = emitBadgeUpdate;
  (global as any).realtimeMarkNotificationRead = async (id: string, userId: string) => {
    const { markNotificationRead } = await import("./store");
    markNotificationRead(id, userId);
    await emitNotificationRead(userId, id);
  };
  (global as any).realtimeMarkAllNotificationsRead = async (userId: string) => {
    const { markAllNotificationsRead } = await import("./store");
    markAllNotificationsRead(userId);
    await emitBadgeUpdate(userId);
  };
}


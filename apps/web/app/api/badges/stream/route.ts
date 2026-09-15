import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById, getUnreadCounts } from "@/lib/store";
import { subscribeUserEvents } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = auth.userId;
  const schoolId = auth.schoolId;
  const role = auth.role;

  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (name: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // 1. Send initial badge counts immediately upon connection
      try {
        const full = findUserById(userId);
        const counts = getUnreadCounts(
          userId,
          schoolId,
          role,
          full?.user.className,
          full?.user.section
        );
        sendEvent("badges", { success: true, ...counts });
      } catch (e) {
        console.warn("[sse:badges] initial load error", e);
      }

      // 2. Subscribe to real-time events for this user
      unsubscribe = subscribeUserEvents(userId, (event) => {
        if (event.type === "BADGES") {
          sendEvent("badges", { success: true, ...event.data });
        } else {
          sendEvent(event.type.toLowerCase(), event.data);
        }
      });

      // 3. Heartbeat ping every 25 seconds to keep the connection alive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

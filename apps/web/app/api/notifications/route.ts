import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const typeFilter = (searchParams.get("type") || "").trim().toUpperCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let list = getNotifications(auth.userId, auth.schoolId);
    if (typeFilter && typeFilter !== "ALL") {
      list = list.filter((n: any) => String(n.type || "").toUpperCase() === typeFilter);
    }
    if (q) {
      list = list.filter((n: any) => {
        const title = String(n.title || "").toLowerCase();
        const body = String(n.body || n.message || "").toLowerCase();
        const type = String(n.type || "").toLowerCase();
        return title.includes(q) || body.includes(q) || type.includes(q);
      });
    }

    const unread = getUnreadNotificationCount(auth.userId, auth.schoolId);
    const total = list.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? list.slice((page - 1) * limit, page * limit) : list;

    return NextResponse.json({
      success: true,
      notifications: paginated,
      unread,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
      hasMore: limit > 0 ? page < totalPages : false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (body.action === "readAll") {
      await markAllNotificationsRead(auth.userId, auth.schoolId);
      const { emitBadgeUpdate } = await import("@/lib/realtime");
      await emitBadgeUpdate(auth.userId);
      return NextResponse.json({ success: true });
    }
    if (body.id) {
      await markNotificationRead(body.id, auth.userId);
      const { emitNotificationRead } = await import("@/lib/realtime");
      await emitNotificationRead(auth.userId, body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

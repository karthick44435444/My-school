import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getReadReceipts, markAsRead } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const receipts = getReadReceipts(auth.userId);
    return NextResponse.json({ readReceipts: receipts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    // 1. Bulk by itemIds: { type: "HOMEWORK", itemIds: ["id1", "id2"] }
    if (body.type && Array.isArray(body.itemIds)) {
      for (const id of body.itemIds) {
        if (id) markAsRead(auth.userId, body.type, String(id));
      }
      try {
        const { emitBadgeUpdate } = await import("@/lib/realtime");
        emitBadgeUpdate(auth.userId);
      } catch {}
      return NextResponse.json({ success: true });
    }

    // 2. Bulk by items: { items: [{ type: "HOMEWORK", itemId: "id1" }, ...] }
    if (Array.isArray(body.items)) {
      for (const it of body.items) {
        if (it?.type && (it?.itemId || it?.id)) {
          markAsRead(auth.userId, it.type, String(it.itemId || it.id));
        }
      }
      try {
        const { emitBadgeUpdate } = await import("@/lib/realtime");
        emitBadgeUpdate(auth.userId);
      } catch {}
      return NextResponse.json({ success: true });
    }

    // 3. Single item: { type: "...", itemId: "..." }
    if (body.type && (body.itemId || body.id)) {
      markAsRead(auth.userId, body.type, String(body.itemId || body.id));
      try {
        const { emitBadgeUpdate } = await import("@/lib/realtime");
        emitBadgeUpdate(auth.userId);
      } catch {}
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "type and itemId or itemIds required" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


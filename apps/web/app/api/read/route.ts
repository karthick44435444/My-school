import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getReadReceipts, markAsRead } from "@/lib/store";

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
    if (!body.type || !body.itemId) {
      return NextResponse.json({ error: "type and itemId required" }, { status: 400 });
    }
    markAsRead(auth.userId, body.type, body.itemId);
    const { emitBadgeUpdate } = await import("@/lib/realtime");
    emitBadgeUpdate(auth.userId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


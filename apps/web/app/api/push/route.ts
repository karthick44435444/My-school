import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { savePushToken, removePushToken, sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (body.action === "register" && body.token) {
      savePushToken(auth.userId, body.token, body.platform);
      return NextResponse.json({ success: true });
    }
    if (body.action === "unregister") {
      removePushToken(auth.userId, body.token);
      return NextResponse.json({ success: true });
    }
    if (body.action === "test") {
      const r = await sendPushToUser(auth.userId, {
        title: "My School test",
        body: "Push notifications are working",
      });
      return NextResponse.json(r);
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

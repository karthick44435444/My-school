import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { savePushToken, removePushToken, sendPushToUser, notifyUser, getTokensForUser, isPushEnabled } from "@/lib/push";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tokens = getTokensForUser(auth.userId);
    const hasServiceAccount = Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    );
    return NextResponse.json({
      enabled: isPushEnabled(),
      tokenCount: tokens.length,
      userId: auth.userId,
      firebaseConfigured: hasServiceAccount,
      projectId: process.env.FIREBASE_PROJECT_ID || "my-school-1980d",
      tokensPreview: tokens.map((t) => t.length > 20 ? `${t.slice(0, 8)}...${t.slice(-8)}` : t),
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

    if (body.action === "register" && body.token) {
      savePushToken(auth.userId, body.token, body.platform);
      return NextResponse.json({ success: true, registered: true });
    }
    if (body.action === "unregister") {
      removePushToken(auth.userId, body.token);
      return NextResponse.json({ success: true, unregistered: true });
    }
    if (body.action === "test") {
      const targetUserId = body.userId || auth.userId;
      const tokens = getTokensForUser(targetUserId);
      const testResult = await notifyUser(targetUserId, {
        title: body.title || "🔔 My School Test Notification",
        body: body.body || "Push notifications are working smoothly across your device and web browser!",
        type: "GENERAL",
      });
      return NextResponse.json({
        success: true,
        targetUserId,
        registeredTokensCount: tokens.length,
        result: testResult,
      });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

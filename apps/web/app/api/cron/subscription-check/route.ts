import { NextRequest, NextResponse } from "next/server";
import { checkAndDispatchExpiryNotifications } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const result = await checkAndDispatchExpiryNotifications();
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("Cron subscription-check error:", error);
    return NextResponse.json({ error: error.message || "Failed to run subscription check" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

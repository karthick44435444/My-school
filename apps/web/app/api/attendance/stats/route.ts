import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAttendanceStats } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const className = searchParams.get("className") || undefined;
    const section = searchParams.get("section") || undefined;

    const stats = getAttendanceStats(auth.schoolId, date, { from, to, className, section });

    return NextResponse.json({ success: true, ...stats });
  } catch (error: any) {
    console.error("Attendance stats error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

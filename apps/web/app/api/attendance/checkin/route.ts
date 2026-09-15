import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { teacherCheckIn } from "@/lib/store";
import { getLocalDateString } from "@/lib/utils";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function readAttendances(schoolId: string, teacherId: string, date: string) {
  const DATA_DIR = path.join(process.cwd(), ".data");
  const DB_FILE = path.join(DATA_DIR, "db.json");
  if (!fs.existsSync(DB_FILE)) return null;
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.attendances || []).find(
    (a: any) => a.schoolId === schoolId && a.teacherId === teacherId && a.date === date
  );
}

/** GET - check if already checked in today */
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "TEACHER") {
      return NextResponse.json({ error: "Only teachers" }, { status: 403 });
    }
    const date = getLocalDateString();
    const existing = readAttendances(auth.schoolId, auth.userId, date);
    return NextResponse.json({
      checkedIn: !!existing,
      attendance: existing || null,
      date,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/** POST - teacher self check-in */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "TEACHER") {
      return NextResponse.json({ error: "Only teachers can check in" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result = teacherCheckIn({
      schoolId: auth.schoolId,
      teacherId: auth.userId,
      date: body.date,
    });

    if (result.alreadyCheckedIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: "You already checked in today.",
        attendance: result.attendance,
      });
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      message: "Checked in successfully. You are marked Present.",
      attendance: result.attendance,
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

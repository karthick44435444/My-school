import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getPendingLeaveNotifications,
  markNotificationsSent,
  findUserById,
  getUsersBySchool,
} from "@/lib/store";
import { notifyUser } from "@/lib/push";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;

    const pending = getPendingLeaveNotifications(auth.schoolId, date);

    return NextResponse.json({
      success: true,
      count: pending.length,
      pending,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { attendanceIds } = body;

    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return NextResponse.json({ error: "attendanceIds required" }, { status: 400 });
    }

    // Load pending to get student info
    const pending = getPendingLeaveNotifications(auth.schoolId);
    const selected = pending.filter((p: any) => attendanceIds.includes(p.id));

    let sent = 0;
    for (const p of selected) {
      try {
        if (!p.studentId) continue;
        const st = findUserById(p.studentId);
        if (!st?.user) continue;
        const student = st.user;
        const title = "Leave / Absent";
        const bodyText = `Your child ${student.firstName} (${student.className || ""}${
          student.section ? `-${student.section}` : ""
        }) is on leave today (${p.date || "today"}).`;

        if (student.parentEmail) {
          const parents = getUsersBySchool(student.schoolId, "PARENT") || [];
          const parent = parents.find(
            (u: any) => u.email?.toLowerCase() === student.parentEmail?.toLowerCase()
          );
          if (parent) {
            await notifyUser(parent.id, {
              title,
              body: bodyText,
              type: "LEAVE",
              data: { type: "LEAVE", studentId: student.id, date: p.date },
            });
          }
        }
        await notifyUser(student.id, {
          title,
          body: `You were marked absent on ${p.date || "today"}.`,
          type: "LEAVE",
          data: { type: "LEAVE", studentId: student.id, date: p.date },
        });
        sent++;
      } catch (e) {
        console.error("[pending leave notify]", e);
      }
    }

    markNotificationsSent(attendanceIds);

    return NextResponse.json({
      success: true,
      sent,
      message: `Leave notifications sent for ${sent} students.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { markStudentAttendance, findUserById, getUsersBySchool } from "@/lib/store";
import { notifyUser } from "@/lib/push";
import { getLocalDateString } from "@/lib/utils";

/**
 * POST /api/attendance/mark
 * Body: { date?: "YYYY-MM-DD", records: [{ studentId, status }] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { date, records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "records array required" }, { status: 400 });
    }

    for (const r of records) {
      if (!r.studentId || !["PRESENT", "ABSENT", "LATE", "HALF_DAY"].includes(r.status)) {
        return NextResponse.json(
          { error: "Each record needs studentId and valid status" },
          { status: 400 }
        );
      }
    }

    const result = markStudentAttendance({
      schoolId: auth.schoolId,
      date,
      records,
      markedById: auth.userId,
    });

    const day = date || getLocalDateString();
    const absents = records.filter((r: any) => r.status === "ABSENT");

    // Immediate push + email for leave/absent
    const seen = new Set<string>();
    seen.add(auth.userId); // Never notify teacher who marked attendance

    for (const r of absents) {
      try {
        const st = findUserById(r.studentId);
        if (!st?.user) continue;
        const student = st.user;
        const title = "Leave / Absent";
        const bodyText = `${student.firstName} ${student.lastName || ""} (${student.className || ""}${
          student.section ? `-${student.section}` : ""
        }) marked absent on ${day}`.replace(/\s+/g, " ").trim();

        if (student.id && !seen.has(student.id)) {
          seen.add(student.id);
          await notifyUser(student.id, {
            title,
            body: bodyText,
            email: student.email?.includes("@student.local") ? undefined : student.email,
            type: "LEAVE",
            data: { type: "LEAVE", studentId: student.id, date: day },
          });
        }

        if (student.parentEmail) {
          const parents = getUsersBySchool(student.schoolId, "PARENT") || [];
          const parent = parents.find(
            (u: any) => u.email?.toLowerCase() === student.parentEmail?.toLowerCase()
          );
          const parentBodyText = `Your child ${student.firstName} ${student.lastName || ""} (${student.className || ""}${
            student.section ? `-${student.section}` : ""
          }) is marked absent on ${day}.`.replace(/\s+/g, " ").trim();

          if (parent?.id && !seen.has(parent.id)) {
            seen.add(parent.id);
            await notifyUser(parent.id, {
              title,
              body: parentBodyText,
              email: parent.email,
              type: "LEAVE",
              data: { type: "LEAVE", studentId: student.id, date: day },
            });
          } else if (!parent && !seen.has(student.parentEmail.toLowerCase())) {
            seen.add(student.parentEmail.toLowerCase());
            // email parent even without account push
            const { sendEmail, notificationEmailHtml } = await import("@/lib/email");
            await sendEmail({
              to: student.parentEmail,
              subject: title,
              html: notificationEmailHtml(
                title,
                parentBodyText
              ),
              text: parentBodyText,
            });
          }
        }
      } catch (e) {
        console.error("[leave notify]", e);
      }
    }

    return NextResponse.json({
      success: true,
      marked: result.length,
      absentCount: absents.length,
      message:
        absents.length > 0
          ? `Attendance saved. ${absents.length} absent — push & email notifications sent.`
          : "Attendance saved successfully.",
      records: result,
    });
  } catch (error: any) {
    console.error("Mark attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

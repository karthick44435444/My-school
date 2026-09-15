import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getTeacherCheckInReport } from "@/lib/store";

/**
 * GET /api/attendance/teachers?date=YYYY-MM-DD
 * GET /api/attendance/teachers?from=&to=&format=json|csv
 * Principal/Admin: teacher check-in summary + list
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const format = (searchParams.get("format") || "json").toLowerCase();
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || searchParams.get("filter") || "all").toLowerCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    const report = getTeacherCheckInReport(auth.schoolId, { date, from, to });

    if (format === "csv") {
      const lines = ["Date,Teacher Name,Email,Phone,Education,Class,Status,Marked At"];
      for (const r of report.records) {
        lines.push(
          [
            r.date,
            `"${(r.teacherName || "").replace(/"/g, '""')}"`,
            r.email || "",
            r.phone || "",
            `"${(r.education || "").replace(/"/g, '""')}"`,
            `"${(r.classLabel || "").replace(/"/g, '""')}"`,
            r.status,
            r.markedAt || "",
          ].join(",")
        );
      }
      const filename = `teacher-checkin_${from || date || "report"}.csv`;
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    let teachersList = report.teachers || [];

    if (statusFilter === "in") {
      teachersList = teachersList.filter((t: any) => !!t.checkedIn);
    } else if (statusFilter === "out") {
      teachersList = teachersList.filter((t: any) => !t.checkedIn);
    }

    if (q) {
      teachersList = teachersList.filter((t: any) => {
        const name = `${t.firstName || ""} ${t.lastName || ""}`.toLowerCase();
        const email = (t.email || "").toLowerCase();
        const phone = (t.phone || "").toLowerCase();
        const edu = (t.education || "").toLowerCase();
        const cls = (t.classLabel || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || edu.includes(q) || cls.includes(q);
      });
    }

    const total = teachersList.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? teachersList.slice((page - 1) * limit, page * limit) : teachersList;

    return NextResponse.json({
      success: true,
      ...report,
      teachers: paginated,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

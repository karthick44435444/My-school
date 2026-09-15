import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getStudentAttendance, findUserById } from "@/lib/store";
import { formatDDMMYYYY } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/attendance/student?studentId=xxx&from=2026-07-01&to=2026-08-17&page=1&limit=20&q=xxx&status=ALL
 * Student can only view own. Parent can view their children. Admin/Principal/Teacher can view any.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = searchParams.get("limit") !== null ? parseInt(searchParams.get("limit") || "20", 10) : 20;
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const status = (searchParams.get("status") || "ALL").trim().toUpperCase();
    const all = searchParams.get("all") === "1" || limit <= 0;

    // Student viewing self
    if (auth.role === "STUDENT") {
      studentId = auth.userId;
    }

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const childResult = findUserById(studentId);
    const child = childResult?.user;
    if (!child || child.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: "Student not found in this school" }, { status: 404 });
    }

    // Parent: ensure child belongs to them
    if (auth.role === "PARENT") {
      const parentResult = findUserById(auth.userId);
      const parent = parentResult?.user;

      const pEmail = (parent?.email || auth.email || "").trim().toLowerCase();
      const pUsername = (parent?.username || "").trim().toLowerCase();
      const childParentEmail = (child?.parentEmail || "").trim().toLowerCase();

      const isChildLinked =
        (Array.isArray(parent?.childrenIds) && parent.childrenIds.includes(studentId)) ||
        (childParentEmail && (childParentEmail === pEmail || childParentEmail === pUsername));

      if (!isChildLinked) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const list = getStudentAttendance(studentId, from, to, auth.schoolId);

    // Compute stats on the full list (unfiltered by search/status) so KPIs remain accurate
    const present = list.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const presentOnly = list.filter((a) => a.status === "PRESENT").length;
    const absent = list.filter((a) => a.status === "ABSENT").length;
    const late = list.filter((a) => a.status === "LATE").length;
    const total = list.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Filter list by status & search query
    let filtered = list;
    if (status && status !== "ALL") {
      filtered = filtered.filter((r) => (r.status || "").toUpperCase() === status);
    }
    if (q) {
      filtered = filtered.filter((r) => {
        const rawDate = String(r.date || "").toLowerCase();
        const formatted = formatDDMMYYYY(r.date).toLowerCase();
        const d = new Date(r.date + "T00:00:00");
        const dayName = !Number.isNaN(d.getTime())
          ? d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
          : "";
        const rStatus = String(r.status || "").toLowerCase();
        return (
          rawDate.includes(q) ||
          formatted.includes(q) ||
          dayName.includes(q) ||
          rStatus.includes(q)
        );
      });
    }

    const totalRecords = filtered.length;
    const totalPages = all ? 1 : Math.ceil(totalRecords / limit) || 1;
    const hasMore = all ? false : page < totalPages;
    const records = all ? filtered : filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      studentId,
      total,
      present,
      presentOnly,
      absent,
      late,
      percentage,
      page,
      limit: all ? totalRecords : limit,
      totalRecords,
      totalPages,
      hasMore,
      records,
    });
  } catch (error: any) {
    console.error("Student attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getClassAttendance } from "@/lib/store";
import { getLocalDateString } from "@/lib/utils";

/**
 * GET /api/attendance/class?className=Class%2010&section=A&date=2026-08-17
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get("className");
    const section = searchParams.get("section") || undefined;
    const date = searchParams.get("date") || undefined;

    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const limitParam = searchParams.get("limit");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    if (!className) {
      return NextResponse.json({ error: "className is required" }, { status: 400 });
    }

    const list = getClassAttendance(auth.schoolId, className, section, date);

    const present = list.filter((s) => s.status === "PRESENT" || s.status === "LATE").length;
    const absent = list.filter((s) => s.status === "ABSENT").length;
    const unmarked = list.filter((s) => !s.status).length;
    const totalCount = list.length;

    let filtered = list;
    if (q) {
      filtered = filtered.filter((s: any) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const roll = String(s.rollNumber || s.rollNo || "").toLowerCase();
        const email = String(s.email || "").toLowerCase();
        const status = (s.status || "not marked").toLowerCase();
        const cls = `${s.className || ""}-${s.section || ""}`.toLowerCase();
        return name.includes(q) || roll.includes(q) || email.includes(q) || status.includes(q) || cls.includes(q);
      });
    }

    if (limitParam !== null && limitParam !== "all" && limitParam !== "0") {
      const limit = Math.max(1, parseInt(limitParam || "20", 10) || 20);
      const filteredTotal = filtered.length;
      const totalPages = Math.ceil(filteredTotal / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        className,
        section: section || "ALL",
        date: date || getLocalDateString(),
        total: filteredTotal,
        totalStudents: totalCount,
        totalPages,
        page,
        limit,
        present,
        absent,
        unmarked,
        students: paginated,
      });
    }

    return NextResponse.json({
      className,
      section: section || "ALL",
      date: date || getLocalDateString(),
      total: totalCount,
      present,
      absent,
      unmarked,
      students: filtered,
    });
  } catch (error: any) {
    console.error("Class attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

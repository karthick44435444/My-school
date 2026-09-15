import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  exportAttendance,
  attendanceToCSV,
  attendanceToExcelXML,
  getTeacherCheckInReport,
  teacherCheckInToExcelXML,
  getTeacherClasses,
  getSchoolById,
} from "@/lib/store";

/**
 * GET /api/attendance/export
 * Query: type=student|teacher, className, section, from, to, studentId, status, format=csv|json
 *
 * Returns CSV file download or JSON
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const school = getSchoolById(auth.schoolId);
    const resolvedSchoolName = school?.name || "School";
    const resolvedSchoolLogo = school?.logoUrl || null;

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "student").toLowerCase();
    const className = searchParams.get("className") || undefined;
    const section = searchParams.get("section") || undefined;
    const fromDate = searchParams.get("from") || undefined;
    const toDate = searchParams.get("to") || undefined;
    const status = searchParams.get("status") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const format = (searchParams.get("format") || "csv").toLowerCase();

    // Teachers are NOT permitted to export teacher check-in data
    if (auth.role === "TEACHER" && type === "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teachers can only export student attendance records." },
        { status: 403 }
      );
    }

    // Teacher check-in export (Admin and Principal only)
    if (type === "teacher") {
      const report = getTeacherCheckInReport(auth.schoolId, {
        from: fromDate,
        to: toDate,
        date: fromDate || toDate,
      });

      if (format === "json") {
        return NextResponse.json({
          success: true,
          count: report.records.length,
          schoolName: resolvedSchoolName,
          schoolLogo: resolvedSchoolLogo,
          filters: { type: "teacher", fromDate, toDate },
          records: report.records,
        });
      }

      if (format === "excel" || format === "xlsx" || format === "xls") {
        const xml = teacherCheckInToExcelXML(report.records as any, {
          schoolName: resolvedSchoolName,
          from: fromDate,
          to: toDate,
        });

        const filenameParts = ["teacher_attendance"];
        if (fromDate && toDate && fromDate === toDate) {
          filenameParts.push(fromDate);
        } else {
          if (fromDate) filenameParts.push(`from_${fromDate}`);
          if (toDate) filenameParts.push(`to_${toDate}`);
        }
        const filename = `${filenameParts.join("_")}.xls`;

        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.ms-excel; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      }

      // Teacher CSV
      const lines = ["Date,Teacher Name,Email,Phone,Education,Class/Section,Status,Marked At"];
      for (const r of report.records) {
        lines.push(
          [
            r.date,
            `"${(r.teacherName || "").replace(/"/g, '""')}"`,
            `"${(r.email || "").replace(/"/g, '""')}"`,
            `"${(r.phone || "").replace(/"/g, '""')}"`,
            `"${(r.education || "").replace(/"/g, '""')}"`,
            `"${(r.classLabel || "").replace(/"/g, '""')}"`,
            r.status,
            r.markedAt || "",
          ].join(",")
        );
      }

      const filenameParts = ["teacher_attendance"];
      if (fromDate && toDate && fromDate === toDate) {
        filenameParts.push(fromDate);
      } else {
        if (fromDate) filenameParts.push(`from_${fromDate}`);
        if (toDate) filenameParts.push(`to_${toDate}`);
      }
      const filename = `${filenameParts.join("_")}.csv`;

      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Student attendance export
    const rawRows = exportAttendance({
      schoolId: auth.schoolId,
      className,
      section,
      fromDate,
      toDate,
      studentId,
      status: status && status !== "ALL" ? status : undefined,
    });

    // For TEACHER role: strictly filter to only their class-teacher / mapped classes
    let rows = rawRows;
    if (auth.role === "TEACHER") {
      const mappings = getTeacherClasses(auth.userId);
      const ctClasses = mappings.filter((m: any) => m.role === "CLASS_TEACHER");
      const allowed = ctClasses.length > 0 ? ctClasses : mappings;

      if (allowed.length > 0) {
        rows = rawRows.filter((r) =>
          allowed.some(
            (c: any) =>
              c.className === r.className &&
              (!c.section || !r.section || c.section === r.section)
          )
        );
      } else if ((auth as any).className) {
        rows = rawRows.filter(
          (r) =>
            r.className === (auth as any).className &&
            (!(auth as any).section || !r.section || r.section === (auth as any).section)
        );
      } else {
        rows = [];
      }
    }

    if (format === "json") {
      return NextResponse.json({
        success: true,
        count: rows.length,
        schoolName: resolvedSchoolName,
        schoolLogo: resolvedSchoolLogo,
        filters: { className, section, fromDate, toDate, studentId, status },
        records: rows,
      });
    }

    // Student Excel download
    if (format === "excel" || format === "xlsx" || format === "xls") {
      const xml = attendanceToExcelXML(rows, {
        schoolName: resolvedSchoolName,
        from: fromDate,
        to: toDate,
        className,
        section,
        status,
      });

      const filenameParts = ["student_attendance"];
      if (className) filenameParts.push(className.replace(/\s+/g, "-"));
      if (section) filenameParts.push(section);
      if (status && status !== "ALL") filenameParts.push(status);
      if (fromDate && toDate && fromDate === toDate) {
        filenameParts.push(fromDate);
      } else {
        if (fromDate) filenameParts.push(`from_${fromDate}`);
        if (toDate) filenameParts.push(`to_${toDate}`);
      }
      const filename = `${filenameParts.join("_")}.xls`;

      return new NextResponse(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Student CSV download
    const csv = attendanceToCSV(rows);
    const filenameParts = ["student_attendance"];
    if (className) filenameParts.push(className.replace(/\s+/g, "-"));
    if (section) filenameParts.push(section);
    if (status && status !== "ALL") filenameParts.push(status);
    if (fromDate && toDate && fromDate === toDate) {
      filenameParts.push(fromDate);
    } else {
      if (fromDate) filenameParts.push(`from_${fromDate}`);
      if (toDate) filenameParts.push(`to_${toDate}`);
    }
    const filename = `${filenameParts.join("_")}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Export attendance error:", error);
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 });
  }
}

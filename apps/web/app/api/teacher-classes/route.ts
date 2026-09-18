import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  mapTeacherToClass,
  getTeacherClasses,
  getStudentsForTeacher,
  deleteTeacherClassMapping,
  normalizeClassName,
  normalizeSection,
  isExactClassAndSection,
  isSameClassAndSection,
} from "@/lib/store";
import fs from "fs";
import path from "path";

function readAllMappings(schoolId: string) {
  const DB_FILE = path.join(process.cwd(), ".data", "db.json");
  if (!fs.existsSync(DB_FILE)) return [];
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.teacherClasses || []).filter((t: any) => t.schoolId === schoolId);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId") || auth.userId;

  if (searchParams.get("students") === "1") {
    let students = getStudentsForTeacher(auth.schoolId, teacherId);
    const className = searchParams.get("className");
    const section = searchParams.get("section");
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    if (className) {
      students = students.filter((s: any) =>
        section
          ? isExactClassAndSection(s.className, s.section, className, section)
          : normalizeClassName(s.className) === normalizeClassName(className)
      );
    }

    if (q) {
      students = students.filter((s: any) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const email = (s.email || "").toLowerCase();
        const roll = String(s.rollNumber || s.rollNo || "").toLowerCase();
        const cls = `${s.className || ""} ${s.section || ""}`.toLowerCase();
        return name.includes(q) || email.includes(q) || roll.includes(q) || cls.includes(q);
      });
    }

    const total = students.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? students.slice((page - 1) * limit, page * limit) : students;
    const sanitizedStudents = paginated.map((s: any) => ({
      ...s,
      photoUrl: s.photoUrl || s.avatar || s.photo || s.image || null,
    }));

    return NextResponse.json({
      success: true,
      students: sanitizedStudents,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
    });
  }

  if (searchParams.get("all") === "1" || searchParams.get("className")) {
    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      // teachers can still see own
      const classes = getTeacherClasses(auth.userId);
      return NextResponse.json({ success: true, classes, mappings: classes });
    }
    let list = readAllMappings(auth.schoolId);
    const className = searchParams.get("className");
    const section = searchParams.get("section");
    if (className) {
      list = list.filter((m: any) =>
        section
          ? isExactClassAndSection(m.className, m.section, className, section)
          : normalizeClassName(m.className) === normalizeClassName(className)
      );
    }
    return NextResponse.json({ success: true, classes: list, mappings: list });
  }

  const classes = getTeacherClasses(teacherId);
  return NextResponse.json({ success: true, classes });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const entry = mapTeacherToClass({
    schoolId: auth.schoolId,
    teacherId: body.teacherId,
    className: body.className,
    section: body.section,
    role: body.role || "SUBJECT_TEACHER",
    subjectId: body.subjectId,
    subjectName: body.subjectName,
    transferData: body.transferData,
  });
  return NextResponse.json({ success: true, mapping: entry });
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("mappingId");

    if (!id) {
      return NextResponse.json({ error: "Mapping id required" }, { status: 400 });
    }

    await deleteTeacherClassMapping(id, auth.schoolId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

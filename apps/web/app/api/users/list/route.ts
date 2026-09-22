import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getUsersBySchool,
  getStudentsForTeacher,
  getStudentsForClassTeacher,
  findUserById,
  normalizeClassName,
  normalizeSection,
  isSameClassAndSection,
  isExactClassAndSection,
} from "@/lib/store";

function filterBySearch(items: any[], q: string) {
  if (!q) return items;
  const term = q.trim().toLowerCase();
  return items.filter((u: any) => {
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = (u.phone || "").toLowerCase();
    const roll = String(u.rollNumber || u.rollNo || "").toLowerCase();
    const username = (u.username || "").toLowerCase();
    const parent = `${u.parentName || ""} ${u.parentEmail || ""} ${u.parentPhone || ""}`.toLowerCase();
    const cls = `${u.className || ""} ${u.section || ""}`.toLowerCase();
    const education = (u.education || u.qualification || "").toLowerCase();

    return (
      fullName.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      roll.includes(term) ||
      username.includes(term) ||
      parent.includes(term) ||
      cls.includes(term) ||
      education.includes(term)
    );
  });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || undefined;
    const className = searchParams.get("className") || undefined;
    const section = searchParams.get("section") || undefined;
    const attendanceOnly = searchParams.get("attendanceOnly") === "1";
    const q = searchParams.get("q") || searchParams.get("search") || "";
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let rawList: any[] = [];

    const matchClass = (userCls?: string, queryCls?: string) => {
      if (!queryCls) return true;
      if (!userCls) return false;
      return normalizeClassName(userCls) === normalizeClassName(queryCls);
    };

    const matchSection = (userSec?: string, querySec?: string) => {
      if (!querySec) return true;
      if (!userSec) return false;
      return normalizeSection(userSec) === normalizeSection(querySec);
    };

    if (auth.role === "TEACHER" && role === "STUDENT") {
      let students = attendanceOnly
        ? getStudentsForClassTeacher(auth.schoolId, auth.userId)
        : getStudentsForTeacher(auth.schoolId, auth.userId);
      if (className) students = students.filter((s: any) => matchClass(s.className, className));
      if (section) students = students.filter((s: any) => matchSection(s.section, section));
      rawList = students;
    } else if (auth.role === "PARENT") {
      const allStudents = getUsersBySchool(auth.schoolId, "STUDENT");
      const pEmail = (auth.email || "").trim().toLowerCase();
      const parentUser = findUserById(auth.userId)?.user;
      const pUsername = (parentUser?.username || "").trim().toLowerCase();
      const parentStoredIds = Array.isArray(parentUser?.childrenIds) ? parentUser.childrenIds : [];

      let kids = allStudents.filter((s: any) => {
        if (!s.isActive) return false;
        const sParentEmail = (s.parentEmail || "").trim().toLowerCase();
        const matchEmail = sParentEmail && (sParentEmail === pEmail || sParentEmail === pUsername);
        const matchIds = parentStoredIds.includes(s.id);
        return matchEmail || matchIds;
      });
      if (className) kids = kids.filter((s: any) => matchClass(s.className, className));
      if (section) kids = kids.filter((s: any) => matchSection(s.section, section));
      rawList = kids;
    } else {
      let users = getUsersBySchool(auth.schoolId, role);
      if (className) users = users.filter((u: any) => matchClass(u.className, className));
      if (section) users = users.filter((u: any) => matchSection(u.section, section));
      rawList = users;
    }

    rawList.sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));

    // Server-side search filter
    const filtered = filterBySearch(rawList, q);
    const total = filtered.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? filtered.slice((page - 1) * limit, page * limit) : filtered;
    const sanitizedUsers = paginated.map((u: any) => ({
      ...u,
      email: u.role === "STUDENT"
        ? (u.parentEmail || (u.email && !u.email.includes("@student.local") ? u.email : undefined))
        : u.email,
      photoUrl: u.photoUrl || u.avatar || u.photo || u.image || null,
    }));

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

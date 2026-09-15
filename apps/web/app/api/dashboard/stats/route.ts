import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDashboardStats, getUsersBySchool, getTopStudentsByClass } from "@/lib/store";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = getDashboardStats(auth.schoolId);
    const teachers = getUsersBySchool(auth.schoolId, "TEACHER");
    const students = getUsersBySchool(auth.schoolId, "STUDENT");
    const principals = getUsersBySchool(auth.schoolId, "PRINCIPAL");
    const topStudentsByClass = getTopStudentsByClass(auth.schoolId, 5);

    return NextResponse.json({
      stats,
      teachers,
      students,
      principals,
      topStudents: topStudentsByClass,
      topStudentsByClass,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

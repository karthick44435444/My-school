import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  deleteUser,
  updateUser,
  findUserById,
  getStudentsForClassTeacher,
  ensureClass,
  readDB,
} from "@/lib/store";

function teacherOwnsStudent(teacherId: string, schoolId: string, studentId: string) {
  const list = getStudentsForClassTeacher(schoolId, teacherId);
  return list.some((s: any) => s.id === studentId);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, studentIds, className, section } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }

    if (action === "delete") {
      let deletedCount = 0;
      for (const id of studentIds) {
        const target = findUserById(id);
        if (!target || target.user.schoolId !== auth.schoolId || target.user.role !== "STUDENT") {
          continue;
        }

        if (auth.role === "TEACHER" && !teacherOwnsStudent(auth.userId, auth.schoolId, id)) {
          continue;
        }

        try {
          deleteUser(id, auth.schoolId);
          deletedCount++;
        } catch (err) {
          console.error(`[bulk delete error for ${id}]`, err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully removed ${deletedCount} student(s)`,
        count: deletedCount,
      });
    }

    if (action === "change-class") {
      const targetClassName = (className || "").trim();
      const targetSection = (section || "A").trim().toUpperCase();

      if (!targetClassName) {
        return NextResponse.json({ error: "Target class is required" }, { status: 400 });
      }

      // If Admin or Principal, ensure target class exists in classes table
      if (["ADMIN", "PRINCIPAL"].includes(auth.role)) {
        ensureClass(auth.schoolId, targetClassName, targetSection);
      }

      let updatedCount = 0;
      for (const id of studentIds) {
        const target = findUserById(id);
        if (!target || target.user.schoolId !== auth.schoolId || target.user.role !== "STUDENT") {
          continue;
        }

        if (auth.role === "TEACHER" && !teacherOwnsStudent(auth.userId, auth.schoolId, id)) {
          continue;
        }

        try {
          updateUser(id, {
            className: targetClassName,
            section: targetSection,
          });
          updatedCount++;
        } catch (err) {
          console.error(`[bulk change class error for ${id}]`, err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully moved ${updatedCount} student(s) to ${targetClassName} - ${targetSection}`,
        count: updatedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported: 'delete', 'change-class'" }, { status: 400 });
  } catch (error: any) {
    console.error("[bulk-action error]", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

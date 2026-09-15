import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  updateUser,
  deleteUser,
  findUserById,
  getStudentsForClassTeacher,
} from "@/lib/store";

export const dynamic = "force-dynamic";

function teacherOwnsStudent(teacherId: string, schoolId: string, studentId: string) {
  const list = getStudentsForClassTeacher(schoolId, teacherId);
  return list.some((s: any) => s.id === studentId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const result = findUserById(id);
    if (!result || result.user.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { passwordHash, ...safe } = result.user as any;
    return NextResponse.json({ success: true, user: safe });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const body = await req.json();
    const target = findUserById(id);
    if (!target || target.user.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isSelf = auth.userId === id;
    const canManage = ["ADMIN", "PRINCIPAL"].includes(auth.role);
    const isTeacherEditingStudent =
      auth.role === "TEACHER" &&
      target.user.role === "STUDENT" &&
      teacherOwnsStudent(auth.userId, auth.schoolId, id);

    if (!isSelf && !canManage && !isTeacherEditingStudent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rollNum = body.rollNumber !== undefined ? String(body.rollNumber).trim() : (body.rollNo !== undefined ? String(body.rollNo).trim() : undefined);
    if (rollNum !== undefined && rollNum !== "" && !/^\d+$/.test(rollNum)) {
      return NextResponse.json(
        { error: "Roll number must contain only numbers" },
        { status: 400 }
      );
    }

    const allowed: any = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      photoUrl: body.photoUrl,
      gender: body.gender,
      education: body.education,
      className: body.className,
      section: body.section,
      rollNumber: rollNum,
      rollNo: rollNum,
      parentName: body.parentName,
      parentEmail: body.parentEmail,
      dateOfBirth: body.dateOfBirth,
    };
    Object.keys(allowed).forEach((k) => {
      if (allowed[k] === undefined) delete allowed[k];
    });

    const user = updateUser(id, allowed);
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    if (id === auth.userId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const target = findUserById(id);
    if (!target || target.user.schoolId !== auth.schoolId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const canManage = ["ADMIN", "PRINCIPAL"].includes(auth.role);
    const isTeacherDeletingStudent =
      auth.role === "TEACHER" &&
      target.user.role === "STUDENT" &&
      teacherOwnsStudent(auth.userId, auth.schoolId, id);

    if (!canManage && !isTeacherDeletingStudent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    deleteUser(id, auth.schoolId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

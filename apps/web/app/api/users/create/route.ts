import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createPrincipal,
  createTeacher,
  createStudent,
  findDuplicateUser,
  normalizeEmail,
  isSamePhone,
  getTeacherClasses,
} from "@/lib/store";
import { sendEmail, credentialsEmailHtml, studentAndParentCredentialsEmailHtml } from "@/lib/email";

async function mailCredentials(
  to: string | undefined,
  role: string,
  schoolCode: string,
  username: string,
  password: string,
  schoolName?: string,
  recipientName?: string,
  className?: string,
  section?: string
) {
  if (!to || to.includes("@student.local") || to.includes("@teacher.local")) return;
  try {
    await sendEmail({
      to,
      subject: `My School — Your ${role} login credentials (${schoolName || schoolCode})`,
      html: credentialsEmailHtml({
        role,
        schoolCode,
        username,
        password,
        schoolName,
        recipientName,
        className,
        section,
      }),
      text: `Role: ${role}\nSchool: ${schoolCode}\nUsername: ${username}\nPassword: ${password}`,
    });
  } catch (e) {
    console.error("[credentials email]", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body?.dateOfBirth) {
      const dob = new Date(String(body.dateOfBirth) + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime()) || dob >= today) {
        return NextResponse.json({ error: "Date of birth must be a past date" }, { status: 400 });
      }
    }
    const { role } = body;

    if (role === "PRINCIPAL" && auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Admin can create Principal" }, { status: 403 });
    }
    if (role === "TEACHER" && !["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role === "STUDENT" && !["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!role || !["PRINCIPAL", "TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!body.firstName?.trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }
    if ((role === "PRINCIPAL" || role === "TEACHER") && !body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (role === "PRINCIPAL") {
      const dup = findDuplicateUser({
        schoolId: auth.schoolId,
        role: "PRINCIPAL",
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
      });
      if (dup) {
        if (dup.email && normalizeEmail(dup.email) === normalizeEmail(body.email)) {
          return NextResponse.json(
            { error: "Principal with this email already exists in this school." },
            { status: 409 }
          );
        }
        if (dup.phone && body.phone && isSamePhone(dup.phone, body.phone)) {
          return NextResponse.json(
            { error: "Principal with this phone number already exists in this school." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: `Principal already exists with same name (${dup.firstName} ${dup.lastName || ""})`.trim() },
          { status: 409 }
        );
      }

      const result = createPrincipal({
        schoolId: auth.schoolId,
        schoolCode: auth.schoolCode,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        education: body.education,
        gender: body.gender,
        photoUrl: body.photoUrl,
        createdById: auth.userId,
      });
      await mailCredentials(
        body.email,
        "Principal",
        auth.schoolCode,
        result.credentials.username,
        result.credentials.password,
        (auth as any).schoolName,
        body.firstName
      );
      return NextResponse.json({
        success: true,
        user: { id: result.user.id, role: result.user.role, firstName: result.user.firstName },
        credentials: result.credentials,
      });
    }

    if (role === "TEACHER") {
      const dup = findDuplicateUser({
        schoolId: auth.schoolId,
        role: "TEACHER",
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
      });
      if (dup) {
        if (dup.email && normalizeEmail(dup.email) === normalizeEmail(body.email)) {
          return NextResponse.json(
            { error: "Teacher with this email already exists in this school." },
            { status: 409 }
          );
        }
        if (dup.phone && body.phone && isSamePhone(dup.phone, body.phone)) {
          return NextResponse.json(
            { error: "Teacher with this phone number already exists in this school." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: `Teacher already exists with the same name (${dup.firstName} ${dup.lastName || ""}).`.trim(),
          },
          { status: 409 }
        );
      }

      const result = createTeacher({
        schoolId: auth.schoolId,
        schoolCode: auth.schoolCode,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        gender: body.gender || "MALE",
        education: body.education,
        teacherType: body.teacherType || "SUBJECT_TEACHER",
        className: body.className,
        section: body.section,
        photoUrl: body.photoUrl,
        createdById: auth.userId,
      });
      await mailCredentials(
        body.email,
        "Teacher",
        auth.schoolCode,
        result.credentials.username,
        result.credentials.password,
        (auth as any).schoolName,
        body.firstName,
        body.className,
        body.section
      );
      return NextResponse.json({
        success: true,
        user: { id: result.user.id, role: result.user.role, firstName: result.user.firstName },
        credentials: result.credentials,
      });
    }

    // STUDENT
    if (!body.dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }
    if (!body.className) {
      return NextResponse.json({ error: "Class is required" }, { status: 400 });
    }

    if (auth.role === "TEACHER") {
      const teacherClasses = getTeacherClasses(auth.userId);
      const isClassTeacher = teacherClasses.some(
        (c: any) =>
          c.role === "CLASS_TEACHER" &&
          c.className?.toLowerCase() === String(body.className).toLowerCase() &&
          (!c.section || !body.section || c.section?.toLowerCase() === String(body.section).toLowerCase())
      );
      if (!isClassTeacher) {
        return NextResponse.json(
          { error: "Teachers can only enroll students for classes where they are the Class Teacher" },
          { status: 403 }
        );
      }
    }
    if (!body.parentName?.trim()) {
      return NextResponse.json({ error: "Parent name is required" }, { status: 400 });
    }
    if (!body.parentEmail?.trim()) {
      return NextResponse.json({ error: "Parent email is required" }, { status: 400 });
    }

    if (body.email && body.parentEmail && !body.email.includes("@student.local")) {
      if (normalizeEmail(body.email) === normalizeEmail(body.parentEmail)) {
        return NextResponse.json(
          { error: "Student email and Parent email cannot be the same." },
          { status: 400 }
        );
      }
    }

    const dup = findDuplicateUser({
      schoolId: auth.schoolId,
      role: "STUDENT",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
    });
    if (dup) {
      return NextResponse.json(
        {
          error: `Student already exists with the same name, email and date of birth (${dup.firstName} ${dup.lastName || ""}).`.trim(),
        },
        { status: 409 }
      );
    }

    const rollNum = body.rollNumber !== undefined ? String(body.rollNumber).trim() : (body.rollNo !== undefined ? String(body.rollNo).trim() : "");
    if (rollNum && !/^\d+$/.test(rollNum)) {
      return NextResponse.json(
        { error: "Roll number must contain only numbers" },
        { status: 400 }
      );
    }

    const result = createStudent({
      schoolId: auth.schoolId,
      schoolCode: auth.schoolCode,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      gender: body.gender || "MALE",
      className: body.className,
      section: body.section || "A",
      rollNumber: rollNum || undefined,
      rollNo: rollNum || undefined,
      dateOfBirth: body.dateOfBirth,
      parentName: body.parentName,
      parentEmail: body.parentEmail,
      photoUrl: body.photoUrl,
      createdById: auth.userId,
    });

    if (body.parentEmail) {
      try {
        await sendEmail({
          to: body.parentEmail,
          subject: `My School — Student & Parent Credentials (${(auth as any).schoolName || auth.schoolCode})`,
          html: studentAndParentCredentialsEmailHtml({
            studentName: `${body.firstName} ${body.lastName || ""}`.trim(),
            parentName: body.parentName || "Parent",
            schoolName: (auth as any).schoolName || "My School",
            schoolCode: auth.schoolCode,
            studentUsername: result.credentials.student.username,
            studentPassword: result.credentials.student.password,
            parentUsername: result.credentials.parent.username,
            parentPassword: result.credentials.parent.password,
            className: body.className,
            section: body.section,
          }),
          text: `School Code: ${auth.schoolCode}\nStudent: ${result.credentials.student.username} / ${result.credentials.student.password}\nParent: ${result.credentials.parent.username} / ${result.credentials.parent.password}`,
        });
      } catch (e) {
        console.error("[parent credentials email]", e);
      }
    }

    if (body.email && !body.email.includes("@student.local")) {
      try {
        await sendEmail({
          to: body.email,
          subject: `My School — Student Portal Credentials (${(auth as any).schoolName || auth.schoolCode})`,
          html: credentialsEmailHtml({
            role: "STUDENT",
            schoolCode: auth.schoolCode,
            username: result.credentials.student.username,
            password: result.credentials.student.password,
            schoolName: (auth as any).schoolName,
            recipientName: `${body.firstName} ${body.lastName || ""}`.trim(),
            className: body.className,
            section: body.section,
          }),
          text: `Role: Student\nSchool: ${auth.schoolCode}\nUsername: ${result.credentials.student.username}\nPassword: ${result.credentials.student.password}`,
        });
      } catch (e) {
        console.error("[student direct credentials email]", e);
      }
    }

    // FIX: createStudent returns { student, parent, credentials } — not { user }
    return NextResponse.json({
      success: true,
      user: {
        id: result.student.id,
        role: result.student.role,
        firstName: result.student.firstName,
      },
      credentials: result.credentials,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createExam,
  updateExam,
  getExams,
  getExamsForTeacher,
  deleteExam,
  saveMarks,
  publishExam,
  getExamWithMarks,
  getStudentMarks,
  findUserById,
  getUsersBySchool,
  getTeacherClasses,
  createNotification,
} from "@/lib/store";
import { notifyUser, notifyUsersBatch } from "@/lib/push";
import { formatDDMMYYYY } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const examId = searchParams.get("examId");
    let rawClassName = searchParams.get("className") || undefined;
    let section = searchParams.get("section") || undefined;

    let className = rawClassName;
    if (rawClassName && rawClassName.includes("||")) {
      const [cPart, sPart] = rawClassName.split("||");
      className = cPart || undefined;
      section = section || sPart || undefined;
    }

    if (examId) {
      const detail = getExamWithMarks(examId);
      if (!detail || detail.exam.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // Students/parents only see published EXAM (TEST always visible if has marks)
      if (["STUDENT", "PARENT"].includes(auth.role)) {
        const ex = detail.exam;
        if (ex.type === "EXAM" && !ex.published) {
          return NextResponse.json({ error: "Not published yet" }, { status: 403 });
        }
      }
      return NextResponse.json({ success: true, ...detail });
    }

    if (studentId || auth.role === "STUDENT") {
      const id = auth.role === "STUDENT" ? auth.userId : studentId!;
      const stUser = findUserById(id)?.user;
      if (!stUser || stUser.schoolId !== auth.schoolId) {
        return NextResponse.json({ error: "Student not found in this school" }, { status: 404 });
      }
      if (auth.role === "PARENT") {
        const parentUser = findUserById(auth.userId)?.user;
        const pEmail = (parentUser?.email || auth.email || "").trim().toLowerCase();
        const pUsername = (parentUser?.username || "").trim().toLowerCase();
        const childParentEmail = (stUser.parentEmail || "").trim().toLowerCase();
        const isChildLinked =
          (Array.isArray(parentUser?.childrenIds) && parentUser.childrenIds.includes(id)) ||
          (childParentEmail && (childParentEmail === pEmail || childParentEmail === pUsername));
        if (!isChildLinked) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      const publishedOnly = ["STUDENT", "PARENT"].includes(auth.role);
      const rawMarks = getStudentMarks(id!, { publishedOnly, schoolId: auth.schoolId }) || [];

      let allExams = getExams(auth.schoolId).filter((e: any) => {
        if (publishedOnly) {
          if (e.type === "EXAM" && !e.published) return false;
        }
        if (e.className && stUser.className && e.className !== stUser.className) {
          const hasMarksForExam = rawMarks.some((m: any) => m.examId === e.id);
          if (!hasMarksForExam) return false;
        }
        return true;
      });

      // Ensure orphan marks are also represented in allExams
      const existingExamIds = new Set(allExams.map((e: any) => e.id));
      for (const m of rawMarks) {
        if (m.examId && !existingExamIds.has(m.examId)) {
          existingExamIds.add(m.examId);
          allExams.push({
            id: m.examId,
            name: m.examName || m.subject || "Examination",
            type: m.examType || "TEST",
            date: m.subjectDate || m.examDate || m.dateFrom || "",
            dateFrom: m.dateFrom || m.examDate || "",
            dateTo: m.dateTo || m.examDate || "",
            subject: m.subject,
            maxMarks: m.maxMarks || 100,
            passMarks: m.passMarks || 35,
            published: m.published ?? true,
          });
        }
      }

      // Filter by q / search
      const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
      if (q) {
        allExams = allExams.filter((e: any) => {
          const name = (e.name || "").toLowerCase();
          const sub = (e.subject || "").toLowerCase();
          const type = (e.type || "").toLowerCase();
          const date = (e.date || e.dateFrom || "").toLowerCase();
          const subNames = (e.subjects || []).map((s: any) => (s.subjectName || "").toLowerCase()).join(" ");
          return name.includes(q) || sub.includes(q) || type.includes(q) || date.includes(q) || subNames.includes(q);
        });
      }

      const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

      const total = allExams.length;
      const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
      const paginatedExams = limit > 0 ? allExams.slice((page - 1) * limit, page * limit) : allExams;
      const hasMore = limit > 0 ? page < totalPages : false;

      return NextResponse.json({
        success: true,
        marks: rawMarks,
        exams: paginatedExams,
        total,
        count: total,
        page,
        limit: limit > 0 ? limit : total,
        totalPages,
        hasMore,
      });
    }

    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let exams =
      auth.role === "TEACHER"
        ? getExamsForTeacher(auth.schoolId, auth.userId, className, section)
        : getExams(auth.schoolId, className, undefined, section);

    if (q) {
      exams = exams.filter((e: any) => {
        const name = (e.name || e.title || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        const cls = `${e.className || ""} ${e.section || ""}`.toLowerCase();
        const sub = (e.subject || "").toLowerCase();
        const subNames = (e.subjects || []).map((s: any) => (s.subjectName || "").toLowerCase()).join(" ");
        const type = (e.type || "").toLowerCase();
        const date = (e.date || e.dateFrom || "").toLowerCase();
        return (
          name.includes(q) ||
          desc.includes(q) ||
          cls.includes(q) ||
          sub.includes(q) ||
          subNames.includes(q) ||
          type.includes(q) ||
          date.includes(q)
        );
      });
    }

    const total = exams.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? exams.slice((page - 1) * limit, page * limit) : exams;
    const hasMore = limit > 0 ? page < totalPages : false;

    return NextResponse.json({
      success: true,
      exams: paginated,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
      hasMore,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();

    if (body.action === "marks") {
      saveMarks(body.examId, body.records || [], auth.userId, { notify: false });
      return NextResponse.json({ success: true });
    }

    if (body.action === "publish") {
      const result = publishExam(body.examId, auth.schoolId, auth.userId);
      // Push notify students and parents
      try {
        const studentIdsToNotify = result.changedStudentIds?.length
          ? result.changedStudentIds
          : Object.keys((result.exam as any)?.publishedSnapshot || {});
        const allParents = getUsersBySchool(auth.schoolId, "PARENT") || [];

        const studentRecipients: any[] = [];
        const parentRecipients: any[] = [];

        for (const sid of studentIdsToNotify) {
          const st = findUserById(sid);
          if (!st?.user) continue;

          studentRecipients.push({
            id: st.user.id,
            schoolId: st.user.schoolId,
            role: st.user.role,
            email: st.user.email?.includes("@student.local") ? undefined : st.user.email,
            firstName: st.user.firstName,
          });

          const pEmail = st.user.parentEmail?.trim().toLowerCase();
          const parents = allParents.filter(
            (u: any) =>
              (pEmail &&
                (u.email?.trim().toLowerCase() === pEmail ||
                  u.username?.trim().toLowerCase() === pEmail)) ||
              u.childrenIds?.includes(sid)
          );
          for (const parent of parents) {
            parentRecipients.push({
              id: parent.id,
              schoolId: parent.schoolId,
              role: "PARENT",
              email: parent.email,
              firstName: parent.firstName,
            });
          }
        }

        await notifyUsersBatch(studentRecipients, {
          title: "Exam results published",
          body: `${result.exam?.name || "Exam"} results are available`,
          type: "MARKS",
          data: { type: "MARKS", examId: body.examId },
        });

        await notifyUsersBatch(parentRecipients, {
          title: "Exam results updated",
          body: `${result.exam?.name || "Exam"} results are available for your child`,
          type: "MARKS",
          data: { type: "MARKS", examId: body.examId },
        });
      } catch (e) {
        console.error("[publish notify]", e);
      }
      return NextResponse.json({ ...result, success: true });
    }

    if (!body.name || !body.className) {
      return NextResponse.json({ error: "name and className required" }, { status: 400 });
    }

    const exam = createExam({
      schoolId: auth.schoolId,
      name: body.name,
      className: body.className,
      section: body.section,
      subject: body.subject,
      maxMarks: body.maxMarks || 100,
      passMarks: body.passMarks,
      date: body.date || new Date().toISOString().slice(0, 10),
      createdById: auth.userId,
      type: body.type || "TEST",
      subjects: body.subjects,
    });

    // In-app and Push notifications for both Students and Parents
    try {
      const students = (getUsersBySchool(auth.schoolId, "STUDENT") || []).filter(
        (u: any) =>
          u.className === exam.className &&
          (!exam.section || u.section === exam.section)
      );
      const allParents = getUsersBySchool(auth.schoolId, "PARENT") || [];

      const seen = new Set<string>();
      seen.add(auth.userId); // Never notify creator teacher

      const studentRecipients: any[] = [];
      const parentRecipients: any[] = [];

      const studentTitle =
        exam.type === "EXAM"
          ? `Exam Timetable: ${exam.name}`
          : `Test Announced: ${exam.name}`;
      const studentBody =
        exam.type === "EXAM"
          ? `Timetable published for ${exam.name} (${exam.className}${exam.section ? `-${exam.section}` : ""})`
          : `Test on ${exam.subject || "General"} scheduled for ${formatDDMMYYYY(exam.date)} (Max: ${exam.maxMarks})`;

      for (const st of students) {
        if (st?.id && !seen.has(st.id)) {
          seen.add(st.id);
          studentRecipients.push({
            id: st.id,
            schoolId: st.schoolId,
            role: st.role,
            email: st.email?.includes("@student.local") ? undefined : st.email,
            firstName: st.firstName,
          });
        }

        const pEmail = st.parentEmail?.trim().toLowerCase();
        const parents = allParents.filter(
          (p: any) =>
            (pEmail &&
              (p.email?.trim().toLowerCase() === pEmail ||
                p.username?.trim().toLowerCase() === pEmail)) ||
            p.childrenIds?.includes(st.id)
        );

        for (const parent of parents) {
          if (parent?.id && !seen.has(parent.id)) {
            seen.add(parent.id);
            parentRecipients.push({
              id: parent.id,
              schoolId: parent.schoolId,
              role: "PARENT",
              email: parent.email,
              firstName: parent.firstName,
            });
          }
        }
      }

      await notifyUsersBatch(studentRecipients, {
        title: studentTitle,
        body: studentBody,
        type: exam.type === "EXAM" ? "EXAM" : "TEST",
        data: {
          type: exam.type === "EXAM" ? "EXAM_TIMETABLE" : "TEST",
          examId: exam.id,
          table: exam.subjects?.length ? JSON.stringify(exam.subjects) : "",
        },
      });

      await notifyUsersBatch(parentRecipients, {
        title: exam.type === "EXAM" ? `Exam Timetable: ${exam.name}` : `Test Announced: ${exam.name}`,
        body: studentBody,
        type: exam.type === "EXAM" ? "EXAM" : "TEST",
        data: {
          type: exam.type === "EXAM" ? "EXAM_TIMETABLE" : "TEST",
          examId: exam.id,
        },
      });
    } catch (e) {
      console.error("[exam create notify]", e);
    }

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (auth.role === "TEACHER") {
      const existing = getExamWithMarks(body.id);
      if (existing?.exam) {
        const isCreator = existing.exam.createdById === auth.userId;
        const teacherClasses = getTeacherClasses(auth.userId);
        const isClassTeacher = teacherClasses.some(
          (c: any) =>
            c.className === existing.exam.className &&
            (!existing.exam.section || !c.section || c.section === existing.exam.section) &&
            c.role === "CLASS_TEACHER"
        );
        if (!isCreator && !isClassTeacher) {
          return NextResponse.json(
            { error: "Only the creator class teacher can edit this exam" },
            { status: 403 }
          );
        }
      }
    }

    const exam = updateExam(
      body.id,
      auth.schoolId,
      {
        name: body.name,
        className: body.className,
        section: body.section,
        subject: body.subject,
        maxMarks: body.maxMarks,
        passMarks: body.passMarks,
        date: body.date,
        type: body.type,
        subjects: body.subjects,
      },
      auth.userId,
      auth.role
    );

    return NextResponse.json({ success: true, exam });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (auth.role === "TEACHER") {
      const existing = getExamWithMarks(id);
      if (existing?.exam) {
        const isCreator = existing.exam.createdById === auth.userId;
        const teacherClasses = getTeacherClasses(auth.userId);
        const isClassTeacher = teacherClasses.some(
          (c: any) =>
            c.className === existing.exam.className &&
            (!existing.exam.section || !c.section || c.section === existing.exam.section) &&
            c.role === "CLASS_TEACHER"
        );
        if (!isCreator && !isClassTeacher) {
          return NextResponse.json(
            { error: "Only the creator class teacher can delete this exam" },
            { status: 403 }
          );
        }
      }
    }

    await deleteExam(id, auth.schoolId, auth.userId, auth.role);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

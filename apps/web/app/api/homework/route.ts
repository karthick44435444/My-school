import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createHomework,
  getUsersBySchool,
  getHomeworks,
  getHomeworksForTeacher,
  deleteHomework,
  findUserById,
} from "@/lib/store";
import { notifyUser, notifyUsersBatch } from "@/lib/push";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let className = searchParams.get("className") || undefined;
    let section = searchParams.get("section") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let list: any[] = [];

    // Teachers: their own created homework
    if (auth.role === "TEACHER") {
      list = getHomeworksForTeacher(auth.schoolId, auth.userId);
      if (className) list = list.filter((h) => h.className === className);
      if (section) list = list.filter((h) => !h.section || h.section === section);
    } else if (auth.role === "STUDENT" || auth.role === "PARENT") {
      const studentId = searchParams.get("studentId") || searchParams.get("childId");
      if (studentId) {
        const childUser = findUserById(studentId)?.user;
        if (childUser) {
          className = className || childUser.className;
          section = section || childUser.section;
        }
      } else if (auth.role === "STUDENT") {
        const full = findUserById(auth.userId);
        className = className || full?.user.className;
        section = section || full?.user.section;
      }
      list = getHomeworks(auth.schoolId, { className, section });
    } else {
      // Admin / Principal
      list = getHomeworks(auth.schoolId, { className, section });
    }

    if (subject) {
      list = list.filter((h) => (h.subject || "").toLowerCase() === subject.toLowerCase());
    }

    if (q) {
      list = list.filter((h) => {
        const title = (h.title || "").toLowerCase();
        const desc = (h.description || "").toLowerCase();
        const sub = (h.subject || "").toLowerCase();
        const cls = `${h.className || ""} ${h.section || ""}`.toLowerCase();
        const author = (h.createdByName || "").toLowerCase();
        return title.includes(q) || desc.includes(q) || sub.includes(q) || cls.includes(q) || author.includes(q);
      });
    }

    const total = list.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? list.slice((page - 1) * limit, page * limit) : list;

    return NextResponse.json({
      success: true,
      homeworks: paginated,
      homework: paginated,
      total,
      count: total,
      page,
      limit: limit > 0 ? limit : total,
      totalPages,
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
    if (!body.title || !body.className) {
      return NextResponse.json({ error: "title and className required" }, { status: 400 });
    }

    const hw = createHomework({
      schoolId: auth.schoolId,
      className: body.className,
      section: body.section,
      subject: body.subject,
      title: body.title,
      description: body.description || "",
      attachmentUrl: body.attachmentUrl || (Array.isArray(body.attachments) ? body.attachments[0] : undefined),
      attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 2) : body.attachmentUrl ? [body.attachmentUrl] : [],
      createdById: auth.userId,
      createdByName: auth.firstName,
    });

    // Notify students (and parents) in class only (exclude the creator teacher)
    try {
      const students = (getUsersBySchool(auth.schoolId, "STUDENT") || []).filter(
        (s: any) =>
          s.className === body.className &&
          (!body.section || s.section === body.section)
      );
      const allParents = getUsersBySchool(auth.schoolId, "PARENT") || [];
      const title = `New homework: ${body.title}`;
      const bodyText = `${body.subject || "General"} — ${body.className}${
        body.section ? `-${body.section}` : ""
      }`;

      const seen = new Set<string>();
      seen.add(auth.userId); // Never notify the teacher who created the homework

      const recipients: any[] = [];
      for (const s of students) {
        if (s?.id && !seen.has(s.id)) {
          seen.add(s.id);
          recipients.push(s);
        }

        if (s.parentEmail) {
          const parent = allParents.find(
            (u: any) => u.email?.toLowerCase() === s.parentEmail?.toLowerCase()
          );
          if (parent?.id && !seen.has(parent.id)) {
            seen.add(parent.id);
            recipients.push(parent);
          }
        }
      }

      await notifyUsersBatch(recipients, {
        title,
        body: bodyText,
        type: "HOMEWORK",
        data: { type: "HOMEWORK", itemId: hw.id },
      });
    } catch (e) {
      console.error("[homework notify]", e);
    }

    return NextResponse.json({ success: true, homework: hw });
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
    deleteHomework(id, auth.schoolId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

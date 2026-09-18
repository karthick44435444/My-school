import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createAnnouncement,
  getUsersBySchool,
  getAnnouncements,
  getAnnouncementsForTeacher,
  deleteAnnouncement,
  findUserById,
} from "@/lib/store";
import { notifyUser, notifyUsersBatch } from "@/lib/push";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const targetFilter = searchParams.get("target") || undefined;
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let list: any[] = [];

    // Teachers viewing their own created list for manage/delete
    if (auth.role === "TEACHER" && mine) {
      list = getAnnouncementsForTeacher(auth.schoolId, auth.userId);
    } else {
      const full = findUserById(auth.userId);
      const className = full?.user.className;
      const section = full?.user.section;
      list = getAnnouncements(auth.schoolId, auth.role, className, section, auth.userId);
    }

    if (targetFilter && targetFilter !== "ALL") {
      list = list.filter((a) => a.target === targetFilter);
    }

    if (q) {
      list = list.filter((a) => {
        const title = (a.title || "").toLowerCase();
        const content = (a.content || "").toLowerCase();
        const author = (a.createdByName || "").toLowerCase();
        const cls = `${a.className || ""} ${a.section || ""}`.toLowerCase();
        return title.includes(q) || content.includes(q) || author.includes(q) || cls.includes(q);
      });
    }

    const total = list.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? list.slice((page - 1) * limit, page * limit) : list;

    return NextResponse.json({
      success: true,
      announcements: paginated,
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
    if (["STUDENT", "PARENT"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.content) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }

    let target = body.target || "ALL";
    if (auth.role === "TEACHER") {
      target =
        body.target === "PARENTS_ONLY"
          ? "PARENTS_ONLY"
          : body.target === "STUDENTS_ONLY"
            ? "STUDENTS_ONLY"
            : "CLASS";
      if (!body.className && (!Array.isArray(body.classes) || body.classes.length === 0)) {
        return NextResponse.json({ error: "At least one class is required for teachers" }, { status: 400 });
      }
    }

    const selectedClasses: { className: string; section?: string }[] = [];
    if (Array.isArray(body.classes) && body.classes.length > 0) {
      body.classes.forEach((c: any) => {
        if (typeof c === "string") {
          const parts = c.split("-");
          selectedClasses.push({ className: parts[0], section: parts.slice(1).join("-") || undefined });
        } else if (c && c.className) {
          selectedClasses.push({ className: c.className, section: c.section || undefined });
        }
      });
    } else if (body.className) {
      selectedClasses.push({ className: body.className, section: body.section || undefined });
    }

    const displayClassName = selectedClasses.length > 0
      ? selectedClasses.map((c) => (c.section ? `${c.className}-${c.section}` : c.className)).join(", ")
      : body.className;

    const ann = await createAnnouncement({
      schoolId: auth.schoolId,
      title: body.title,
      content: body.content,
      target,
      className: displayClassName,
      section: selectedClasses.length === 1 ? selectedClasses[0].section : undefined,
      classes: selectedClasses.length > 0 ? selectedClasses : undefined,
      createdById: auth.userId,
      createdByName: auth.firstName || (auth.role === "ADMIN" ? "Admin" : auth.role === "PRINCIPAL" ? "Principal" : "Teacher"),
      createdByRole: auth.role,
    });

    // Notify relevant audience
    try {
      const title = body.title;
      const bodyText = (body.content || "").slice(0, 160);
      const students = getUsersBySchool(auth.schoolId, "STUDENT") || [];
      const parents = getUsersBySchool(auth.schoolId, "PARENT") || [];
      const teachers = getUsersBySchool(auth.schoolId, "TEACHER") || [];

      const recipients: any[] = [];
      if (target === "ALL") {
        if (selectedClasses.length > 0) {
          const matchedStudents = students.filter((s: any) =>
            selectedClasses.some(
              (c) => c.className === s.className && (!c.section || !s.section || c.section === s.section)
            )
          );
          recipients.push(...matchedStudents);
          for (const s of matchedStudents) {
            if (!s.parentEmail) continue;
            const p = parents.find((u: any) => u.email?.toLowerCase() === s.parentEmail?.toLowerCase());
            if (p) recipients.push(p);
          }
        } else {
          recipients.push(...students, ...parents, ...teachers);
        }
      } else if (target === "STUDENTS_ONLY") {
        let list = students;
        if (selectedClasses.length > 0) {
          list = list.filter((s: any) =>
            selectedClasses.some(
              (c) => c.className === s.className && (!c.section || !s.section || c.section === s.section)
            )
          );
        }
        recipients.push(...list);
      } else if (target === "PARENTS_ONLY") {
        if (selectedClasses.length > 0) {
          const matchedStudents = students.filter((s: any) =>
            selectedClasses.some(
              (c) => c.className === s.className && (!c.section || !s.section || c.section === s.section)
            )
          );
          for (const s of matchedStudents) {
            if (!s.parentEmail) continue;
            const p = parents.find((u: any) => u.email?.toLowerCase() === s.parentEmail?.toLowerCase());
            if (p) recipients.push(p);
          }
        } else {
          recipients.push(...parents);
        }
      } else if (target === "CLASS") {
        let list = students;
        if (selectedClasses.length > 0) {
          list = list.filter((s: any) =>
            selectedClasses.some(
              (c) => c.className === s.className && (!c.section || !s.section || c.section === s.section)
            )
          );
        }
        recipients.push(...list);
        for (const s of list) {
          if (!s.parentEmail) continue;
          const p = parents.find((u: any) => u.email?.toLowerCase() === s.parentEmail?.toLowerCase());
          if (p) recipients.push(p);
        }
      } else if (target === "TEACHERS_ONLY") {
        recipients.push(...teachers);
      }

      const seen = new Set<string>();
      seen.add(auth.userId); // Never notify the author
      const validRecipients = recipients.filter((u) => {
        if (!u?.id || seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });

      await notifyUsersBatch(validRecipients, {
        title,
        body: bodyText,
        type: "ANNOUNCEMENT",
        data: { type: "ANNOUNCEMENT", itemId: ann.id },
      });
    } catch (e) {
      console.error("[announcement notify]", e);
    }

    return NextResponse.json({ success: true, announcement: ann });
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
    await deleteAnnouncement(id, auth.schoolId, auth.userId, auth.role);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

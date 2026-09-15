import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createClass, getClasses, mapClassTeacher, updateClass, deleteClass } from "@/lib/store";

/** GET /api/classes - list classes for school with search & pagination */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim().toLowerCase();
    const allParam = searchParams.get("all") === "1" || searchParams.get("limit") === "all" || searchParams.get("limit") === "0";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = allParam ? 0 : Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

    let classes = getClasses(auth.schoolId);

    if (q) {
      classes = classes.filter((c: any) => {
        const name = (c.name || c.className || "").toLowerCase();
        const sec = (c.section || "").toLowerCase();
        const teacher = (c.teacherName || "").toLowerCase();
        const full = `${name}-${sec} ${name} ${sec}`.toLowerCase();
        return name.includes(q) || sec.includes(q) || teacher.includes(q) || full.includes(q);
      });
    }

    const total = classes.length;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const paginated = limit > 0 ? classes.slice((page - 1) * limit, page * limit) : classes;

    return NextResponse.json({
      success: true,
      classes: paginated,
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

/** POST /api/classes - create class + optional map teacher */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Only Admin/Principal can create classes" }, { status: 403 });
    }

    const body = await req.json();
    const { name, section, classTeacherId, order } = body;

    if (!name || !section) {
      return NextResponse.json({ error: "name and section required" }, { status: 400 });
    }

    const cls = createClass({
      schoolId: auth.schoolId,
      name: name.trim(),
      section: section.trim().toUpperCase(),
      classTeacherId,
      order,
    });

    return NextResponse.json({ success: true, class: cls });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/** PATCH /api/classes - update class or map class teacher */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const targetClassId = body.classId || body.id;

    if (!targetClassId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }

    // Full class edit (name and/or section)
    if (body.name && body.section) {
      const updated = updateClass(targetClassId, auth.schoolId, {
        name: body.name,
        section: body.section,
        classTeacherId: body.classTeacherId !== undefined ? body.classTeacherId : body.teacherId,
        transferData: body.transferData,
      });
      return NextResponse.json({ success: true, class: updated });
    }

    // Mapping class teacher only
    if (body.teacherId) {
      const cls = mapClassTeacher(targetClassId, body.teacherId, body.transferData !== false);
      return NextResponse.json({ success: true, class: cls });
    }

    return NextResponse.json({ error: "name and section or teacherId required" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/** DELETE /api/classes - delete a class */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Class id required" }, { status: 400 });
    }

    deleteClass(id, auth.schoolId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createSubject, getSubjects } from "@/lib/store";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, subjects: getSubjects(auth.schoolId) });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "PRINCIPAL"].includes(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const sub = createSubject(auth.schoolId, body.name);
  return NextResponse.json({ success: true, subject: sub });
}

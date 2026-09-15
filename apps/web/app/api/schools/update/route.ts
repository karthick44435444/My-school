import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateSchool, getSchool } from "@/lib/store";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const school = getSchool(auth.schoolId);
    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Admin can update school" }, { status: 403 });
    }

    const body = await req.json();
    const school = updateSchool(auth.schoolId, {
      name: body.name,
      displayName: body.displayName,
      location: body.location,
      email: body.email,
      phone: body.phone,
      themeColor: body.themeColor,
      logoUrl: body.logoUrl,
    });

    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

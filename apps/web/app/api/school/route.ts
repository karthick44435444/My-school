import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSchool } from "@/lib/store";

/** GET /api/school - current user's school details */
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const school = getSchool(auth.schoolId);
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      school: {
        id: school.id,
        schoolCode: school.schoolCode,
        name: school.name,
        displayName: school.displayName || null,
        location: school.location,
        email: school.email,
        phone: school.phone,
        logoUrl: school.logoUrl,
        themeColor: school.themeColor,
        plan: school.plan,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

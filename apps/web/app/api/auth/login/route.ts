import { NextRequest, NextResponse } from "next/server";
import { findUserByCredentials, getUsersBySchool } from "@/lib/store";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolCode, username, password } = body;

    if (!schoolCode || !username || !password) {
      return NextResponse.json({ error: "School Code, Username and Password required" }, { status: 400 });
    }

    const result = findUserByCredentials(schoolCode, username, password);
    if (!result) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { user, school } = result;

    let childrenIds: string[] = [];
    if (user.role === "PARENT") {
      const allStudents = getUsersBySchool(user.schoolId, "STUDENT");
      const pEmail = (user.email || "").trim().toLowerCase();
      const pUsername = (user.username || "").trim().toLowerCase();
      const parentStoredIds = Array.isArray(user.childrenIds) ? user.childrenIds : [];
      const linked = allStudents
        .filter(
          (s: any) =>
            s.isActive !== false &&
            ((s.parentEmail &&
              (s.parentEmail.trim().toLowerCase() === pEmail ||
                s.parentEmail.trim().toLowerCase() === pUsername)) ||
              parentStoredIds.includes(s.id))
        )
        .map((s: any) => s.id);
      childrenIds = Array.from(new Set(linked));
    }

    const token = signToken({
      userId: user.id,
      schoolId: user.schoolId,
      schoolCode: user.schoolCode,
      role: user.role,
      firstName: user.firstName,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      token, // for mobile / API clients (web still uses httpOnly cookie)
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        className: user.className,
        section: user.section,
        photoUrl: user.photoUrl || (user as any).avatar || (user as any).photo || (user as any).image || undefined,
        schoolCode: user.schoolCode,
        schoolName: (school?.displayName && school.displayName.trim()) ? school.displayName.trim() : (school?.name || ""),
        schoolFullName: school?.name || "",
        schoolDisplayName: school?.displayName || null,
        schoolLogo: school?.logoUrl || null,
        themeColor: school?.themeColor || "#6366F1",
        plan: school?.plan || "OFFER_MONTHLY",
        planStatus: school?.planStatus || "ACTIVE",
        planExpiresAt: school?.planExpiresAt || null,
        isSubscriptionExpired: school ? (school.planStatus === "EXPIRED" || (school.planExpiresAt ? new Date(school.planExpiresAt).getTime() <= Date.now() : false)) : false,
        childrenIds,
      },
    });

    response.cookies.set(setAuthCookie(token));
    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

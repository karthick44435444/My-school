import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById, getUsersBySchool } from "@/lib/store";

function unauthorizedResponse(msg = "Unauthorized") {
  const res = NextResponse.json({ error: msg }, { status: 401 });
  res.cookies.set({
    name: "myschool_token",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}

export async function GET() {
  try {
    const payload = await getAuthUser();
    if (!payload) {
      return unauthorizedResponse("Unauthorized");
    }

    const result = findUserById(payload.userId);
    if (!result || !result.user || result.user.isActive === false || result.user.schoolId !== payload.schoolId) {
      return unauthorizedResponse("User not found");
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

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        phone: user.phone,
        photoUrl: user.photoUrl || (user as any).avatar || (user as any).photo || (user as any).image || undefined,
        gender: user.gender,
        education: user.education,
        schoolCode: user.schoolCode,
        schoolName: (school?.displayName && school.displayName.trim()) ? school.displayName.trim() : (school?.name || ""),
        schoolFullName: school?.name || "",
        schoolDisplayName: school?.displayName || null,
        schoolLogo: school?.logoUrl || null,
        themeColor: school?.themeColor || "#6366F1",
        schoolPhone: school?.phone || null,
        schoolEmail: school?.email || null,
        schoolAddress: school?.location || null,
        plan: school?.plan || "OFFER_MONTHLY",
        planStatus: school?.planStatus || "ACTIVE",
        planExpiresAt: school?.planExpiresAt || null,
        isSubscriptionExpired: school ? (school.planStatus === "EXPIRED" || (school.planExpiresAt ? new Date(school.planExpiresAt).getTime() <= Date.now() : false)) : false,
        teacherType: user.teacherType,
        className: user.className,
        section: user.section,
        rollNumber: user.rollNumber || (user as any).rollNo || undefined,
        rollNo: user.rollNumber || (user as any).rollNo || undefined,
        parentName: user.parentName,
        parentEmail: user.parentEmail,
        dateOfBirth: user.dateOfBirth,
        childrenIds,
      },
    });
  } catch {
    return unauthorizedResponse("Unauthorized");
  }
}

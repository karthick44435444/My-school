import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { signToken, setAuthCookie } from "@/lib/auth";
import {
  findUserByEmail,
  getSchoolById,
  getAllSchools,
  getUsersBySchool,
} from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, schoolCode } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 400 });
    }

    // 1. Verify Firebase ID token with Admin SDK
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return NextResponse.json({ error: "Firebase token does not contain an email" }, { status: 400 });
    }

    // 2. Find existing user by email
    const existing = findUserByEmail(email);

    if (!existing) {
      // Find school or use first school
      const schools = getAllSchools();
      const schoolMatch = schoolCode
        ? schools.find((s: any) => s.schoolCode.toUpperCase() === String(schoolCode).toUpperCase())
        : schools[0];

      return NextResponse.json(
        {
          error: `No registered account found with email: ${email}. Please ensure your school administrator has created your account.`,
        },
        { status: 404 }
      );
    }

    const { user, school } = existing;

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
      token,
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
        photoUrl: user.photoUrl || decoded.picture || null,
        schoolCode: user.schoolCode,
        schoolName: school?.name,
        schoolLogo: school?.logoUrl || null,
        themeColor: school?.themeColor || "#6366F1",
        childrenIds,
      },
    });

    response.cookies.set(setAuthCookie(token));
    return response;
  } catch (err: any) {
    console.error("[auth:firebase] verification error", err);
    return NextResponse.json(
      { error: err?.message || "Firebase token verification failed" },
      { status: 401 }
    );
  }
}

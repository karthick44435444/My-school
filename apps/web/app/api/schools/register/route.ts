import { NextRequest, NextResponse } from "next/server";
import {
  createSchool,
  requestSchoolRegistrationOtp,
  verifySchoolRegistrationOtp,
} from "@/lib/store";
import {
  sendEmail,
  credentialsEmailHtml,
  schoolRegistrationOtpEmailHtml,
} from "@/lib/email";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      code,
      otpCode,
      schoolName,
      displayName,
      location,
      email,
      phone,
      themeColor,
      plan,
      billingCycle,
      logoUrl,
      password,
    } = body;

    // STEP A: SEND OTP
    if (action === "send_otp") {
      if (!schoolName || !email || !password) {
        return NextResponse.json(
          { error: "School name, email, and password are required." },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }

      const otpResult = requestSchoolRegistrationOtp({
        schoolName,
        email,
        phone,
        password,
      });

      // Send OTP verification email
      try {
        await sendEmail({
          to: otpResult.email,
          subject: `SchoolVajo — Verification Code for ${otpResult.schoolName}`,
          html: schoolRegistrationOtpEmailHtml(otpResult.code, otpResult.schoolName),
          text: `Your SchoolVajo verification code for ${otpResult.schoolName} is: ${otpResult.code}. It is valid for 15 minutes.`,
        });
      } catch (mailErr) {
        console.error("[send school registration OTP email error]", mailErr);
      }

      return NextResponse.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${otpResult.email}`,
      });
    }

    // STEP B: VERIFY OTP AND CREATE SCHOOL
    const verificationCode = String(otpCode || code || "").trim();
    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code is required." },
        { status: 400 }
      );
    }

    if (!schoolName || !location || !email || !plan || !password) {
      return NextResponse.json(
        { error: "Missing required registration fields." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // 1. Verify OTP
    verifySchoolRegistrationOtp(email, verificationCode);

    // 2. Create School & Admin
    const result = createSchool({
      name: schoolName,
      displayName: displayName ? String(displayName).trim() : undefined,
      location,
      email,
      phone,
      themeColor: themeColor || "#4F46E5",
      plan,
      billingCycle: billingCycle || "MONTHLY",
      logoUrl,
      password,
    });

    // 3. Issue persistent JWT token for automatic seamless login
    const token = signToken({
      userId: result.admin.id,
      schoolId: result.school.id,
      schoolCode: result.school.schoolCode,
      role: "ADMIN",
      firstName: result.admin.firstName || "Admin",
      email: result.admin.email,
    });

    // 4. Send email with credentials to admin email
    if (result.admin?.email) {
      try {
        await sendEmail({
          to: result.admin.email,
          subject: `SchoolVajo — Administrator Credentials for ${
            result.school.displayName || result.school.name
          }`,
          html: credentialsEmailHtml({
            role: "ADMIN",
            schoolCode: result.school.schoolCode,
            username: result.admin.username,
            password: result.admin.password,
            schoolName: result.school.displayName || result.school.name,
            recipientName: result.admin.firstName || result.admin.username,
          }),
          text: `School Code: ${result.school.schoolCode}\nUsername: ${result.admin.username}\nPassword: ${result.admin.password}`,
        });
      } catch (mailErr) {
        console.error("[register school credentials email error]", mailErr);
      }
    }

    // 5. Construct response and set auth cookie
    const response = NextResponse.json({
      success: true,
      school: {
        id: result.school.id,
        schoolCode: result.school.schoolCode,
        name: result.school.name,
        displayName: result.school.displayName,
        themeColor: result.school.themeColor,
      },
      admin: result.admin,
      token,
      message: "School created successfully. Credentials sent to email.",
    });

    const cookieOpts = setAuthCookie(token);
    response.cookies.set(cookieOpts.name, cookieOpts.value, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      maxAge: cookieOpts.maxAge,
      path: cookieOpts.path,
    });

    return response;
  } catch (error: any) {
    console.error("Register school error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create school" },
      { status: 400 }
    );
  }
}

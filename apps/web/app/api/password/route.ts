import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { changePassword, requestPasswordReset, resetPasswordWithOtp } from "@/lib/store";
import { sendEmail, otpEmailHtml, isEmailEnabled } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "change") {
      const auth = await getAuthUser();
      if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (auth.role === "STUDENT") {
        return NextResponse.json({ error: "Students cannot change password here" }, { status: 403 });
      }
      changePassword(auth.userId, body.oldPassword, body.newPassword);
      return NextResponse.json({ success: true, message: "Password changed" });
    }

    if (action === "forgot") {
      const result = requestPasswordReset(body.schoolCode, body.usernameOrEmail);
      // Send OTP email when configured
      if (result.email) {
        await sendEmail({
          to: result.email,
          subject: "SchoolVajo — Password reset OTP",
          html: otpEmailHtml(result.demoCode, "SchoolVajo"),
          text: `Your OTP is ${result.demoCode}. Valid 15 minutes.`,
        });
      }
      // Never leak OTP when email is enabled in production
      if (isEmailEnabled()) {
        const { demoCode, ...safe } = result as any;
        return NextResponse.json({
          ...safe,
          message: "If the account exists, an OTP was sent to the registered email",
        });
      }
      return NextResponse.json(result);
    }

    if (action === "reset") {
      resetPasswordWithOtp(body.schoolCode, body.usernameOrEmail, body.code, body.newPassword);
      return NextResponse.json({ success: true, message: "Password reset successful" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

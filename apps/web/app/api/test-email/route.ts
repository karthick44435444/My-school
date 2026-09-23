import { NextRequest, NextResponse } from "next/server";
import { sendEmail, otpEmailHtml, isEmailEnabled } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const to = req.nextUrl.searchParams.get("to") || "schoolvajo@gmail.com";
    const apiKey = (process.env.RESEND_API_KEY || "").trim();
    const from = (process.env.EMAIL_FROM || "SchoolVajo <noreply@schoolvajo.com>").trim();
    const provider = process.env.EMAIL_PROVIDER || "resend";
    const emailEnabled = isEmailEnabled();

    const maskedKey = apiKey
      ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
      : "NOT_SET";

    const testResult = await sendEmail({
      to,
      subject: "SchoolVajo Resend Test Email",
      html: otpEmailHtml("123456", "SchoolVajo Diagnostic"),
      text: "This is a test email from SchoolVajo to verify Resend delivery.",
    });

    return NextResponse.json({
      environmentConfig: {
        EMAIL_ENABLED: process.env.EMAIL_ENABLED || "(not set, defaulted)",
        isEmailEnabledEvaluated: emailEnabled,
        EMAIL_PROVIDER: provider,
        EMAIL_FROM: from,
        RESEND_API_KEY: maskedKey,
      },
      testEmailRecipient: to,
      dispatchResult: testResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute email test" },
      { status: 500 }
    );
  }
}

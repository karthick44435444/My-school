import { NextRequest, NextResponse } from "next/server";
import { createSchool } from "@/lib/store";
import { sendEmail, credentialsEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolName, displayName, location, email, phone, themeColor, plan, billingCycle, logoUrl } = body;

    if (!schoolName || !location || !email || !plan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = createSchool({
      name: schoolName,
      displayName: displayName ? String(displayName).trim() : undefined,
      location,
      email,
      phone,
      themeColor: themeColor || "#6366F1",
      plan,
      billingCycle: billingCycle || "YEARLY",
      logoUrl,
    });

    // Send email with credentials to admin email
    if (result.admin?.email) {
      try {
        await sendEmail({
          to: result.admin.email,
          subject: `SchoolVajo — Administrator Credentials for ${result.school.displayName || result.school.name}`,
          html: credentialsEmailHtml({
            role: "ADMIN",
            schoolCode: result.school.schoolCode,
            username: result.admin.username,
            password: result.admin.password,
            schoolName: result.school.displayName || result.school.name,
            recipientName: (result.admin as any).firstName || result.admin.username,
          }),
          text: `School Code: ${result.school.schoolCode}\nUsername: ${result.admin.username}\nPassword: ${result.admin.password}`,
        });
      } catch (mailErr) {
        console.error("[register school credentials email error]", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      school: {
        schoolCode: result.school.schoolCode,
        name: result.school.name,
        displayName: result.school.displayName,
        themeColor: result.school.themeColor,
      },
      admin: result.admin,
      message: "School created successfully. Credentials sent to email.",
    });
  } catch (error: any) {
    console.error("Register school error:", error);
    return NextResponse.json({ error: error.message || "Failed to create school" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createContactSubmission, getContactSubmissions } from "@/lib/store";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, schoolName, email, phone, role, message } = body || {};

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Extract client IP and user agent for audit logging
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Save to Database
    const submission = await createContactSubmission({
      name: name.trim(),
      schoolName: typeof schoolName === "string" ? schoolName.trim() : undefined,
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" ? phone.trim() : undefined,
      role: typeof role === "string" ? role.trim() : "ADMIN",
      message: message.trim(),
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thank you! Your message has been received.",
        id: submission.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Contact API Error]:", error);
    return NextResponse.json(
      { error: "Failed to submit contact inquiry. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || (authUser.role !== "ADMIN" && (authUser as any).role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = getContactSubmissions();
    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch contact submissions" }, { status: 500 });
  }
}

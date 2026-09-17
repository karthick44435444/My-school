import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSchoolSubscription, upgradeSchoolSubscription } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = getSchoolSubscription(auth.schoolId);
    if (!subscription) {
      return NextResponse.json({ error: "School subscription not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error("Subscription GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch subscription" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only School Admins can upgrade subscriptions" }, { status: 403 });
    }

    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const updatedSubscription = await upgradeSchoolSubscription(auth.schoolId, planId);

    return NextResponse.json({
      success: true,
      message: "Subscription successfully upgraded/recharged!",
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error("Subscription POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to upgrade subscription" }, { status: 500 });
  }
}

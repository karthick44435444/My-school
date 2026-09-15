import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById, getUnreadCounts } from "@/lib/store";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const full = findUserById(auth.userId);
    const counts = getUnreadCounts(
      auth.userId,
      auth.schoolId,
      auth.role,
      full?.user.className,
      full?.user.section
    );
    return NextResponse.json({ success: true, ...counts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

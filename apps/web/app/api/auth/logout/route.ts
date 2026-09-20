import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { removePushToken } from "@/lib/push";

export async function POST() {
  try {
    const auth = await getAuthUser();
    if (auth?.userId) {
      removePushToken(auth.userId);
    }
  } catch {
    /* ignore */
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "myschool_token",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}


import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APK_DOWNLOAD_URL =
  "https://expo.dev/artifacts/eas/8b530834-7f6b-42fc-be94-2a20a2e658bb.apk";

export async function GET(req: NextRequest) {
  // Direct redirect to the direct APK file download
  return NextResponse.redirect(APK_DOWNLOAD_URL, {
    status: 302,
    headers: {
      "Content-Disposition": 'attachment; filename="SchoolVajo.apk"',
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

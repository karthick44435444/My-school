import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APK_DOWNLOAD_URL =
  "https://expo.dev/artifacts/eas/8b530834-7f6b-42fc-be94-2a20a2e658bb.apk";

export async function GET(req: NextRequest) {
  // Ultra-fast, zero-memory 307 temporary redirect directly to Cloudflare/AWS CDN.
  // Consumes 0 MB server RAM, prevents 502 Bad Gateway / OOM crashes,
  // and starts the APK download immediately.
  return NextResponse.redirect(APK_DOWNLOAD_URL, {
    status: 307,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APK_DOWNLOAD_URL =
  "https://expo.dev/artifacts/eas/8b530834-7f6b-42fc-be94-2a20a2e658bb.apk";

export async function GET(req: NextRequest) {
  try {
    const upstreamRes = await fetch(APK_DOWNLOAD_URL, {
      headers: {
        "User-Agent": "SchoolVajo-Web-Downloader/1.0",
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      // Fallback redirect if upstream stream fails
      return NextResponse.redirect(APK_DOWNLOAD_URL, {
        status: 302,
        headers: {
          "Content-Disposition": 'attachment; filename="SchoolVajo.apk"',
        },
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.android.package-archive");
    headers.set("Content-Disposition", 'attachment; filename="SchoolVajo.apk"');

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");

    return new NextResponse(upstreamRes.body as any, {
      status: 200,
      headers,
    });
  } catch (err) {
    return NextResponse.redirect(APK_DOWNLOAD_URL, {
      status: 302,
      headers: {
        "Content-Disposition": 'attachment; filename="SchoolVajo.apk"',
      },
    });
  }
}

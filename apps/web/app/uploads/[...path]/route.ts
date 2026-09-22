import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

export async function GET(
  req: NextRequest,
  props: { params: any }
) {
  try {
    const resolvedParams: any =
      props?.params && typeof props.params.then === "function"
        ? await props.params
        : props?.params;

    let rawPath = Array.isArray(resolvedParams?.path)
      ? resolvedParams.path.join("/")
      : resolvedParams?.path || "";

    if (!rawPath) {
      const pathname = req.nextUrl?.pathname || "";
      rawPath = pathname.replace(/^\/?(api\/)?uploads\/?/, "");
    }

    rawPath = decodeURIComponent(rawPath).split("?")[0].replace(/^\/+/, "");
    const safeBaseFilename = path.basename(rawPath);
    const safeRelPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");

    // 1. Fetch directly from Database Store (includes automatic disk scan & DB persistence)
    const { getUploadedFile, saveUploadedFile } = await import("@/lib/store");
    let stored = getUploadedFile(safeBaseFilename);

    // 2. Extra relative disk fallback
    if (!stored) {
      const candidatePaths = [
        path.join(process.cwd(), "apps", "web", "public", "uploads", safeBaseFilename),
        path.join(process.cwd(), "public", "uploads", safeBaseFilename),
        path.join(process.cwd(), "apps", "web", "public", "uploads", safeRelPath),
        path.join(process.cwd(), "public", "uploads", safeRelPath),
        path.join(process.cwd(), "apps", "web", ".data", "uploads", safeBaseFilename),
        path.join(process.cwd(), ".data", "uploads", safeBaseFilename),
        path.join(process.cwd(), "apps", "web", "public", safeBaseFilename),
        path.join(process.cwd(), "public", safeBaseFilename),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            const buf = fs.readFileSync(p);
            const ext = path.extname(p).toLowerCase();
            const mime = MIME_MAP[ext] || "application/octet-stream";
            stored = { buffer: buf, mimeType: mime };
            saveUploadedFile(safeBaseFilename, buf, mime, buf.length);
            break;
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (!stored) {
      const ext = path.extname(safeBaseFilename).toLowerCase();
      const isImgRequest =
        [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico"].includes(ext) ||
        safeBaseFilename.startsWith("avatar") ||
        safeBaseFilename.includes("photo") ||
        safeBaseFilename.includes("student") ||
        safeBaseFilename.includes("image");

      if (isImgRequest) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none"><rect width="128" height="128" rx="24" fill="#6366F1"/><circle cx="64" cy="48" r="22" fill="#FFFFFF"/><path d="M28 108C28 88.1178 44.1178 72 64 72C83.8822 72 100 88.1178 100 108" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/></svg>`;
        return new NextResponse(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
          },
        });
      }
      return new NextResponse("File not found", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const ext = path.extname(safeBaseFilename).toLowerCase();
    const contentType = stored.mimeType && stored.mimeType !== "application/octet-stream"
      ? stored.mimeType
      : (MIME_MAP[ext] || "image/jpeg");

    return new NextResponse(new Uint8Array(stored.buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stored.buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function HEAD(req: NextRequest, props: { params: any }) {
  return GET(req, props);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

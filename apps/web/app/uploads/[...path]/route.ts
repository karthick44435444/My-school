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

    // 1. Fetch directly from Database Store (No local disk reliance)
    const { getUploadedFile, saveUploadedFile } = await import("@/lib/store");
    let stored = getUploadedFile(safeBaseFilename);

    // 2. Legacy disk fallback (import to DB if found, but do NOT write new files to disk)
    if (!stored) {
      const possiblePaths = [
        path.join(process.cwd(), "public", "uploads", safeBaseFilename),
        path.join(process.cwd(), ".data", "uploads", safeBaseFilename),
        path.join(process.cwd(), "public", safeBaseFilename),
        path.join(process.cwd(), "public", "uploads", safeRelPath),
        path.join(process.cwd(), ".data", "uploads", safeRelPath),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          try {
            const buf = fs.readFileSync(p);
            const ext = path.extname(p).toLowerCase();
            const mime = MIME_MAP[ext] || "application/octet-stream";
            // Persist into database so it is permanently in DB
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

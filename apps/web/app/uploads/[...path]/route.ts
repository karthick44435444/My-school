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
      rawPath = pathname.replace(/^\/?uploads\/?/, "");
    }

    rawPath = decodeURIComponent(rawPath).split("?")[0].replace(/^\/+/, "");
    const safeBaseFilename = path.basename(rawPath);
    const safeRelPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");

    const possiblePaths = [
      path.join(process.cwd(), "public", "uploads", safeBaseFilename),
      path.join(process.cwd(), ".data", "uploads", safeBaseFilename),
      path.join(process.cwd(), "public", safeBaseFilename),
      path.join(process.cwd(), "public", "uploads", safeRelPath),
      path.join(process.cwd(), ".data", "uploads", safeRelPath),
      path.join(process.cwd(), safeRelPath),
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      try {
        const { getUploadedFile } = await import("@/lib/store");
        const stored = getUploadedFile(safeBaseFilename);
        if (stored) {
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          const dataDir = path.join(process.cwd(), ".data", "uploads");
          try {
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(path.join(uploadDir, safeBaseFilename), stored.buffer);
            fs.writeFileSync(path.join(dataDir, safeBaseFilename), stored.buffer);
          } catch {
            /* ignore disk write */
          }
          return new NextResponse(new Uint8Array(stored.buffer), {
            status: 200,
            headers: {
              "Content-Type": stored.mimeType || "application/octet-stream",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            },
          });
        }
      } catch {
        /* fallback to 404 */
      }

      return new NextResponse("File not found", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
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

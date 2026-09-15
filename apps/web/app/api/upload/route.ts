import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

/**
 * POST /api/upload
 * multipart form: file
 * Returns { url: "/uploads/..." }
 * Stores under public/uploads (or .data/uploads served via API)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    // Allow school registration without auth for logo - optional
    // if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const allowedMimePrefixes = [
      "image/",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "text/plain",
      "application/octet-stream",
    ];

    const isAllowed =
      allowedMimePrefixes.some((m) => file.type?.toLowerCase().startsWith(m)) ||
      /\.(pdf|xls|xlsx|csv|doc|docx|png|jpg|jpeg|webp|gif|svg)$/i.test(file.name || "");

    if (!isAllowed) {
      return NextResponse.json({ error: "Only images, PDFs, and document files allowed" }, { status: 400 });
    }

    // max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const originalFullName = file.name || "attachment";
    const lastDot = originalFullName.lastIndexOf(".");
    const rawBaseName = lastDot > 0 ? originalFullName.substring(0, lastDot) : originalFullName;

    // Clean base name (preserve letters, digits, underscores, hyphens)
    let cleanBaseName = rawBaseName.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
    if (!cleanBaseName) cleanBaseName = "attachment";
    cleanBaseName = cleanBaseName.slice(0, 50);

    const rawExt = (file.name?.split(".").pop() || "").toLowerCase();
    let safeExt = rawExt;
    if (!safeExt || safeExt === "blob") {
      if (file.type === "application/pdf") safeExt = "pdf";
      else if (file.type?.startsWith("image/")) safeExt = "png";
      else safeExt = "pdf";
    }
    if (rawExt === "avif" || file.type === "image/avif") {
      safeExt = "png";
    }

    let filename = `${cleanBaseName}.${safeExt}`;
    if (fs.existsSync(path.join(uploadDir, filename))) {
      filename = `${cleanBaseName}_${Math.random().toString(36).slice(2, 6)}.${safeExt}`;
    }
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url, name: file.name || filename });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

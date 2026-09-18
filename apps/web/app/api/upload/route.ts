import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary if environment variables exist
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * POST /api/upload
 * multipart form: file
 * Returns { url: "https://..." or "/uploads/..." }
 * Uploads to Cloudinary when configured, or persists under public/uploads & .data/uploads
 */
export async function POST(req: NextRequest) {
  try {
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

    // 1. Cloudinary upload if configured (Best for Render / Vercel cloud deployments)
    const isCloudinaryConfigured = Boolean(
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
       process.env.CLOUDINARY_API_KEY &&
       process.env.CLOUDINARY_API_SECRET)
    );

    if (isCloudinaryConfigured) {
      try {
        const base64Data = buffer.toString("base64");
        const mimeType = file.type || "image/jpeg";
        const fileUri = `data:${mimeType};base64,${base64Data}`;

        const uploadResult = await cloudinary.uploader.upload(fileUri, {
          folder: "myschool_uploads",
          resource_type: "auto",
        });

        return NextResponse.json({
          success: true,
          url: uploadResult.secure_url,
          name: file.name || uploadResult.public_id,
        });
      } catch (cloudErr: any) {
        console.error("[Cloudinary Upload Error, falling back to disk]:", cloudErr?.message || cloudErr);
      }
    }

    // 2. Local disk upload fallback
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const dataDir = path.join(process.cwd(), ".data", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const originalFullName = file.name || "attachment";
    const lastDot = originalFullName.lastIndexOf(".");
    const rawBaseName = lastDot > 0 ? originalFullName.substring(0, lastDot) : originalFullName;

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
    if (fs.existsSync(path.join(uploadDir, filename)) || fs.existsSync(path.join(dataDir, filename))) {
      filename = `${cleanBaseName}_${Math.random().toString(36).slice(2, 6)}.${safeExt}`;
    }

    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    fs.writeFileSync(path.join(dataDir, filename), buffer);

    try {
      const { saveUploadedFile } = await import("@/lib/store");
      saveUploadedFile(filename, buffer, file.type || undefined, file.size || buffer.length);
    } catch {
      /* ignore */
    }

    const url = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url, name: file.name || filename });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

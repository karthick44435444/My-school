import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function getServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      let parsed: any;
      
      // 1. Try direct parse
      try {
        parsed = JSON.parse(raw);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
      } catch {}

      // 2. Try unescaping backslashes if user pasted escaped JSON (e.g. {\ "type\": \"service_account\"...})
      if (!parsed || typeof parsed !== "object") {
        try {
          const unescaped = raw
            .replace(/\\"/g, '"')
            .replace(/\\ /g, " ")
            .replace(/\\\\/g, "\\");
          parsed = JSON.parse(unescaped);
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
        } catch {}
      }

      // 3. Try base64 decoded
      if (!parsed || typeof parsed !== "object") {
        try {
          const b64 = Buffer.from(raw, "base64").toString("utf-8");
          if (b64.startsWith("{")) {
            parsed = JSON.parse(b64);
          }
        } catch {}
      }

      if (parsed && typeof parsed === "object" && parsed.private_key) {
        if (typeof parsed.private_key === "string") {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        return parsed;
      }
    } catch (e) {
      console.error("[firebaseAdmin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), "firebase-service-account.json"),
    path.join(process.cwd(), "apps", "web", "firebase-service-account.json"),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const sa = JSON.parse(fs.readFileSync(p, "utf8"));
        if (sa && typeof sa.private_key === "string") {
          sa.private_key = sa.private_key.replace(/\\n/g, "\n");
        }
        return sa;
      } catch (e) {
        console.error("[firebaseAdmin] Failed reading service account file at " + p, e);
      }
    }
  }

  return null;
}

export function getFirebaseAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const sa = getServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID || sa?.project_id || "my-school-1980d";

  if (sa) {
    return initializeApp({
      credential: cert(sa),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    });
  }

  // Fallback to default application credentials
  return initializeApp({
    projectId,
  });
}

export function getAdminAuth(): Auth {
  const app = getFirebaseAdminApp();
  return getAuth(app);
}

export function getAdminFirestore(): Firestore {
  const app = getFirebaseAdminApp();
  return getFirestore(app);
}

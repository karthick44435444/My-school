import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "myschool-dev-secret-change-in-production-32chars";

export interface JWTPayload {
  userId: string;
  schoolId: string;
  schoolCode: string;
  role: string;
  firstName: string;
  email: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Resolves auth from:
 * 1) Authorization: Bearer <jwt>  (mobile / API clients)
 * 2) httpOnly cookie myschool_token (web browser)
 * Existing web behaviour is fully preserved.
 */
export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const h = await headers();
    const authHeader = h.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const t = authHeader.slice(7).trim();
      if (t) {
        const payload = verifyToken(t);
        if (payload) return payload;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("myschool_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  // Used in API routes via NextResponse
  return {
    name: "myschool_token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  };
}

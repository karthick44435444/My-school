import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

/**
 * Safely decodes JWT payload in Next.js Edge runtime without Node native dependencies.
 */
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    // Expiration check (exp is in seconds)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0. Skip Next.js internal files, favicon, icons, and any static assets with extensions
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  // 1. CORS headers for mobile and API clients hitting /api/*
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") || "*";

    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res;
  }

  // 2. Authentication & Route Protection
  const token = req.cookies.get("myschool_token")?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const isLoggedIn = !!payload?.userId && !!payload?.role;
  const userRole = (payload?.role || "").toUpperCase();
  const userDashboard = ROLE_DASHBOARD[userRole] || "/login";

  const isPublicAuthPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/register-school");

  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/principal") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/welcome";

  // Case A: User is logged in
  if (isLoggedIn) {
    // If logged in, block access to public landing / login / register pages and redirect to dashboard
    if (isPublicAuthPath) {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }

    // Role protection: block access to other role dashboards
    if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }
    if (pathname.startsWith("/principal") && userRole !== "PRINCIPAL") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }
    if (pathname.startsWith("/teacher") && userRole !== "TEACHER") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }
    if (pathname.startsWith("/student") && userRole !== "STUDENT") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }
    if (pathname.startsWith("/parent") && userRole !== "PARENT") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }

    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return NextResponse.redirect(new URL(userDashboard, req.url));
    }

    return NextResponse.next();
  }

  // Case B: User is NOT logged in
  if (!isLoggedIn) {
    // If trying to access any protected dashboard path, redirect to /login
    if (isProtectedPath) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files & images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};


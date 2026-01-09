import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LANGS = new Set(["en", "ru", "me"]);

function hasLangPrefix(pathname: string) {
  const p = pathname.split("/").filter(Boolean);
  if (p.length === 0) return false;
  return LANGS.has(p[0]);
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Never touch Next internals / APIs / known static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname === "/version.txt" ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // If already has /en /ru /me prefix, do nothing
  if (hasLangPrefix(pathname)) {
    return NextResponse.next();
  }

  // Default: redirect everything else to /en
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Exclude _next/image/static AND common static file extensions (txt included)
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|webp|svg|ico|css|js|map|txt)$).*)"],
};

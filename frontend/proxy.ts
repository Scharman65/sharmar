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

  if (hasLangPrefix(pathname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["en", "ru", "me"]);

function marker(env: string) {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "unknown";
  const utc = new Date().toISOString();
  const lines = [
    "sharmar-frontend",
    `env=${env}`,
    `commit=${sha}`,
    `utc=${utc}`,
  ];
  return lines.join("\n") + "\n";
}

export function GET(_: Request, ctx: { params: { lang: string } }) {
  const lang = ctx?.params?.lang;
  if (!lang || !ALLOWED.has(lang)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return new NextResponse(marker(lang), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

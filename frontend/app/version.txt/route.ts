import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function marker(env?: string) {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "unknown";
  const utc = new Date().toISOString();
  const lines = [
    "sharmar-frontend",
    `env=${env ?? "root"}`,
    `commit=${sha}`,
    `utc=${utc}`,
  ];
  return lines.join("\n") + "\n";
}

export function GET() {
  return new NextResponse(marker(), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

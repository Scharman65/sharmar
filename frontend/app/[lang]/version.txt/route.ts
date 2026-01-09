import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const LANGS = new Set(["en", "ru", "me"]);

async function readVersionFile(lang: string): Promise<string> {
  const safeLang = LANGS.has(lang) ? lang : "en";
  const root = process.cwd();

  const candidate1 = path.join(root, "public", safeLang, "version.txt");
  const candidate2 = path.join(root, "public", "version.txt");

  try {
    return await readFile(candidate1, "utf8");
  } catch {
    return await readFile(candidate2, "utf8");
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  const { lang } = await context.params;
  const body = await readVersionFile(lang);

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

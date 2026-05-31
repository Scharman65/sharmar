import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

const MAX_FILES = 8;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NO_STORE_HEADERS = { "cache-control": "no-store" };

type UploadedFile = {
  id: number | string | null;
  url: string | null;
  name: string | null;
  mime: string | null;
  size: number | null;
};

function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

function jsonResponse(body: JsonObject, status: number) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeStrapiUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;

  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getStrapiBase();
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function getUploadSize(size: unknown): number | null {
  if (typeof size === "number" && Number.isFinite(size)) return size;
  if (typeof size === "string" && size.trim()) {
    const parsed = Number(size);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeUploadedFile(item: unknown): UploadedFile | null {
  if (!isRecord(item)) return null;

  return {
    id:
      typeof item.id === "number" || typeof item.id === "string"
        ? item.id
        : null,
    url: normalizeStrapiUrl(item.url),
    name: typeof item.name === "string" ? item.name : null,
    mime: typeof item.mime === "string" ? item.mime : null,
    size: getUploadSize(item.size),
  };
}

async function strapiJson(path: string, authToken: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${authToken}` },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { ok: res.ok, status: res.status, json };
}

function getFiles(formData: FormData): File[] {
  return formData.getAll("files").filter((value): value is File => value instanceof File);
}

function validateFiles(files: File[]): { ok: true } | { ok: false; error: string } {
  if (files.length === 0) {
    return { ok: false, error: "At least one image file is required" };
  }

  if (files.length > MAX_FILES) {
    return { ok: false, error: `Upload a maximum of ${MAX_FILES} images at a time` };
  }

  for (const file of files) {
    if (file.size <= 0) {
      return { ok: false, error: `File "${file.name || "unnamed"}" is empty` };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, error: `File "${file.name || "unnamed"}" exceeds the 8 MB limit` };
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return {
        ok: false,
        error: `File "${file.name || "unnamed"}" must be a JPEG, PNG, or WebP image`,
      };
    }
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  const userJwt = getBearerToken(req);
  if (!userJwt) {
    return jsonResponse({ ok: false, error: "Missing Authorization Bearer token" }, 401);
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return jsonResponse({ ok: false, error: "Server STRAPI_TOKEN is not configured" }, 500);
  }

  const me = await strapiJson("/api/users/me", userJwt);
  if (!me.ok || !isRecord(me.json) || typeof me.json.id !== "number") {
    return jsonResponse({ ok: false, error: "User authentication failed" }, 401);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    console.error("OWNER_UPLOADS_FORMDATA_ERROR", {
      message: error instanceof Error ? error.message : "Unknown form data parse error",
    });
    return jsonResponse({ ok: false, error: "Invalid multipart/form-data upload" }, 400);
  }

  const files = getFiles(formData);
  const validation = validateFiles(files);
  if (!validation.ok) {
    return jsonResponse({ ok: false, error: validation.error }, 400);
  }

  const uploadFormData = new FormData();
  for (const file of files) {
    uploadFormData.append("files", file, file.name);
  }

  let uploadRes: Response;
  try {
    uploadRes = await fetch(`${getStrapiBase()}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverToken}` },
      body: uploadFormData,
      cache: "no-store",
    });
  } catch (error) {
    console.error("OWNER_UPLOADS_STRAPI_REQUEST_ERROR", {
      message: error instanceof Error ? error.message : "Unknown Strapi upload request error",
    });
    return jsonResponse({ ok: false, error: "Could not upload files" }, 502);
  }

  const text = await uploadRes.text();
  let uploadJson: unknown = null;
  try {
    uploadJson = text ? JSON.parse(text) : null;
  } catch {
    uploadJson = text;
  }

  if (!uploadRes.ok) {
    console.error("OWNER_UPLOADS_STRAPI_ERROR", {
      status: uploadRes.status,
      details: uploadJson,
    });
    return jsonResponse(
      {
        ok: false,
        error: "Strapi upload failed",
        status: uploadRes.status,
      },
      502
    );
  }

  const uploadedItems = Array.isArray(uploadJson) ? uploadJson : [];
  const normalizedFiles = uploadedItems
    .map(normalizeUploadedFile)
    .filter((file): file is UploadedFile => file !== null);

  return jsonResponse({ ok: true, files: normalizedFiles }, 200);
}

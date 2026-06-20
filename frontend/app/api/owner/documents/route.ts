import { NextRequest, NextResponse } from "next/server";
import { OWNER_SESSION_COOKIE_NAME } from "../../auth/owner-session/cookies";

type JsonObject = Record<string, unknown>;
type DocumentType = "passport" | "identity" | "license";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DOCUMENT_TYPES = new Set<DocumentType>(["passport", "identity", "license"]);
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

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function jsonResponse(body: JsonObject, status: number) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    const headerToken = m?.[1]?.trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value?.trim();
  return cookieToken || null;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function strapiJson(path: string, authToken: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${authToken}` },
    cache: "no-store",
  });

  return { ok: res.ok, status: res.status, json: await readJson(res) };
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

function readDocumentType(formData: FormData): DocumentType | null {
  const raw = formData.get("document_type");
  if (typeof raw !== "string") return null;

  const documentType = raw.trim();
  return DOCUMENT_TYPES.has(documentType as DocumentType) ? (documentType as DocumentType) : null;
}

function readSingleFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File ? file : null;
}

function validateFile(file: File): string | null {
  if (file.size <= 0) return "File is empty";
  if (file.size > MAX_FILE_SIZE_BYTES) return "File exceeds the 8 MB limit";
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "File must be a PDF, JPEG, PNG, or WebP";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const userJwt = getBearerToken(req);
  if (!userJwt) {
    return jsonResponse({ ok: false, error: "Missing owner session" }, 401);
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return jsonResponse({ ok: false, error: "Server STRAPI_TOKEN is not configured" }, 500);
  }

  const me = await strapiJson("/api/users/me", userJwt);
  const authenticatedUserId =
    me.ok && isRecord(me.json) && typeof me.json.id === "number" ? me.json.id : null;

  if (!authenticatedUserId) {
    return jsonResponse({ ok: false, error: "User authentication failed" }, 401);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    console.error("OWNER_DOCUMENTS_FORMDATA_ERROR", {
      message: error instanceof Error ? error.message : "Unknown form data parse error",
    });
    return jsonResponse({ ok: false, error: "Invalid multipart/form-data upload" }, 400);
  }

  const documentType = readDocumentType(formData);
  if (!documentType) {
    return jsonResponse({ ok: false, error: "Invalid document_type" }, 400);
  }

  const file = readSingleFile(formData);
  if (!file) {
    return jsonResponse({ ok: false, error: "One file is required" }, 400);
  }

  const fileError = validateFile(file);
  if (fileError) {
    return jsonResponse({ ok: false, error: fileError }, 400);
  }

  const uploadFormData = new FormData();
  uploadFormData.append("files", file, file.name);

  let uploadRes: Response;
  try {
    uploadRes = await fetch(`${getStrapiBase()}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverToken}` },
      body: uploadFormData,
      cache: "no-store",
    });
  } catch (error) {
    console.error("OWNER_DOCUMENTS_UPLOAD_REQUEST_ERROR", {
      message: error instanceof Error ? error.message : "Unknown Strapi upload request error",
    });
    return jsonResponse({ ok: false, error: "Could not upload document" }, 502);
  }

  const uploadJson = await readJson(uploadRes);
  if (!uploadRes.ok) {
    console.error("OWNER_DOCUMENTS_UPLOAD_STRAPI_ERROR", {
      status: uploadRes.status,
      details: uploadJson,
    });
    return jsonResponse({ ok: false, error: "Strapi upload failed", status: uploadRes.status }, 502);
  }

  const uploadedItem = Array.isArray(uploadJson) ? uploadJson[0] : null;
  const uploadedFile = normalizeUploadedFile(uploadedItem);

  if (!uploadedFile?.id) {
    return jsonResponse({ ok: false, error: "Uploaded file id missing" }, 502);
  }

  let attachRes: Response;
  try {
    attachRes = await fetch(`${getStrapiBase()}/api/owner/profile-document-attach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-api-token": serverToken,
      },
      cache: "no-store",
      body: JSON.stringify({
        user_id: authenticatedUserId,
        document_type: documentType,
        file_id: uploadedFile.id,
      }),
    });
  } catch (error) {
    console.error("OWNER_DOCUMENTS_ATTACH_REQUEST_ERROR", {
      message: error instanceof Error ? error.message : "Unknown Strapi document attach request error",
    });
    return jsonResponse({ ok: false, error: "Could not attach document to owner profile" }, 502);
  }

  const attachJson = await readJson(attachRes);
  if (!attachRes.ok || !isRecord(attachJson) || attachJson.ok !== true) {
    console.error("OWNER_DOCUMENTS_ATTACH_STRAPI_ERROR", {
      status: attachRes.status,
      details: attachJson,
    });
    return jsonResponse(
      {
        ok: false,
        error: "Owner document attach failed",
        status: attachRes.status,
      },
      502
    );
  }

  return jsonResponse(
    {
      ok: true,
      document_type: documentType,
      file: uploadedFile,
      verification_status: "documents_uploaded",
    },
    200
  );
}

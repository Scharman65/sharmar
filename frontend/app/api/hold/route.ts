import { NextResponse } from "next/server";
import crypto from "node:crypto";

type HoldPayload = {
  boatId: number;
  slot_start_utc: string;
  slot_end_utc: string;
  deposit_rate?: number;
  hold_minutes?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isIsoUtcTimestamp(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(v);
}

function parsePayload(body: unknown): { ok: true; data: HoldPayload } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Invalid JSON body" };

  const boatId = Number(body.boatId);
  const slotStartUtc = typeof body.slot_start_utc === "string" ? body.slot_start_utc.trim() : "";
  const slotEndUtc = typeof body.slot_end_utc === "string" ? body.slot_end_utc.trim() : "";

  if (!Number.isFinite(boatId) || boatId <= 0) return { ok: false, error: "Invalid boatId" };
  if (!isIsoUtcTimestamp(slotStartUtc)) return { ok: false, error: "Invalid slot_start_utc" };
  if (!isIsoUtcTimestamp(slotEndUtc)) return { ok: false, error: "Invalid slot_end_utc" };

  const startMs = new Date(slotStartUtc).getTime();
  const endMs = new Date(slotEndUtc).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { ok: false, error: "Invalid slot range" };
  }

  const depositRate = Number(body.deposit_rate ?? 0.15);
  const holdMinutes = Number(body.hold_minutes ?? 15);

  return {
    ok: true,
    data: {
      boatId,
      slot_start_utc: slotStartUtc,
      slot_end_utc: slotEndUtc,
      deposit_rate: Number.isFinite(depositRate) && depositRate > 0 && depositRate <= 1 ? depositRate : 0.15,
      hold_minutes: Number.isFinite(holdMinutes) && holdMinutes >= 5 && holdMinutes <= 120 ? Math.round(holdMinutes) : 15,
    },
  };
}

async function strapiFetch(path: string, init?: RequestInit): Promise<{ status: number; json: unknown }> {
  const base = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "https://api.sharmar.me";
  const apiToken = process.env.STRAPI_TOKEN ?? "";

  const url = new URL(path, base);
  const headers: Record<string, string> = {
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    "content-type": "application/json",
  };

  if (apiToken) headers.authorization = `Bearer ${apiToken}`;

  const res = await fetch(url.toString(), { ...init, headers, cache: "no-store" });

  const txt = await res.text();
  let json: unknown = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { ok: false, error: txt };
  }

  return { status: res.status, json };
}

export async function POST(req: Request) {
  try {
    const parsed = parsePayload(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") ||
      req.headers.get("x-idempotency-key") ||
      crypto
        .createHash("sha256")
        .update(JSON.stringify(parsed.data))
        .digest("hex");

    const upstream = await strapiFetch("/api/hold", {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(parsed.data),
    });

    return NextResponse.json(upstream.json, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

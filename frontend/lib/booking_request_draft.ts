// lib/booking_request_draft.ts
export type BookingRequestDraft = {
  v: 1;
  createdAt: string;
  boatSlug: string;
  dateFrom: string;
  dateTo: string;
  publicToken: string;
  lastPayloadHash?: string;
};

export type BookingRequestReceipt = {
  v: 1;
  createdAt: string;
  boatSlug: string;
  publicToken: string;
  bookingId: number;
};

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function keyDraft(boatSlug: string, dateFrom: string, dateTo: string): string {
  return `sharmar:booking_request:draft:v1:${boatSlug}:${dateFrom}:${dateTo}`;
}

function keyReceipt(): string {
  return `sharmar:booking_request:receipt:v1`;
}

export function getOrCreateDraft(params: {
  boatSlug: string;
  dateFrom: string;
  dateTo: string;
  publicTokenFactory: () => string;
}): BookingRequestDraft {
  const { boatSlug, dateFrom, dateTo, publicTokenFactory } = params;

  const key = keyDraft(boatSlug, dateFrom, dateTo);
  const existing = safeParseJson<BookingRequestDraft>(localStorage.getItem(key));

  if (
    existing &&
    existing.v === 1 &&
    existing.boatSlug === boatSlug &&
    existing.dateFrom === dateFrom &&
    existing.dateTo === dateTo &&
    typeof existing.publicToken === "string" &&
    existing.publicToken.length > 0
  ) {
    return existing;
  }

  const draft: BookingRequestDraft = {
    v: 1,
    createdAt: nowIso(),
    boatSlug,
    dateFrom,
    dateTo,
    publicToken: publicTokenFactory(),
  };

  localStorage.setItem(key, JSON.stringify(draft));
  return draft;
}

export function updateDraftHash(params: {
  boatSlug: string;
  dateFrom: string;
  dateTo: string;
  lastPayloadHash: string;
}): void {
  const { boatSlug, dateFrom, dateTo, lastPayloadHash } = params;
  const key = keyDraft(boatSlug, dateFrom, dateTo);
  const existing = safeParseJson<BookingRequestDraft>(localStorage.getItem(key));
  if (!existing || existing.v !== 1) return;

  const next: BookingRequestDraft = { ...existing, lastPayloadHash };
  localStorage.setItem(key, JSON.stringify(next));
}

export function clearDraft(params: { boatSlug: string; dateFrom: string; dateTo: string }): void {
  const key = keyDraft(params.boatSlug, params.dateFrom, params.dateTo);
  localStorage.removeItem(key);
}

export function setReceipt(receipt: BookingRequestReceipt): void {
  localStorage.setItem(keyReceipt(), JSON.stringify(receipt));
}

export function getReceipt(): BookingRequestReceipt | null {
  const r = safeParseJson<BookingRequestReceipt>(localStorage.getItem(keyReceipt()));
  if (!r || r.v !== 1) return null;
  return r;
}

export function clearReceipt(): void {
  localStorage.removeItem(keyReceipt());
}


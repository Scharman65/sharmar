import { NextResponse } from "next/server";
import { resolveBookingPricing } from "@/lib/serverBookingPricing";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const experienceId = Number((url.searchParams.get("experienceId") || "").trim());

    const quote = await resolveBookingPricing({
      boatSlug: (url.searchParams.get("boatSlug") || url.searchParams.get("slug") || "").trim(),
      boatDocumentId: (url.searchParams.get("boatDocumentId") || url.searchParams.get("documentId") || "").trim(),
      experienceDocumentId: (url.searchParams.get("experienceDocumentId") || "").trim(),
      experienceId: Number.isSafeInteger(experienceId) && experienceId > 0 ? experienceId : null,
      slotStartUtc: (url.searchParams.get("slot_start_utc") || "").trim(),
      slotEndUtc: (url.searchParams.get("slot_end_utc") || "").trim(),
      locale: (url.searchParams.get("locale") || "").trim() || null,
      requireExperience: true,
    });

    if (!quote.ok) {
      return NextResponse.json(
        { ok: false, error: quote.error },
        { status: quote.status, headers: { "cache-control": "no-store" } }
      );
    }

    return NextResponse.json(quote, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

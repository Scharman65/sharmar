"use client";

import React, { useMemo, useState } from "react";
import type { BoatFormMode, BoatFormValues } from "./types";

function inputBase() {
  return "w-full rounded-md border border-black/15 px-3 py-2 outline-none";
}

function labelBase() {
  return "text-sm font-medium";
}

function sectionTitle() {
  return "text-lg font-semibold";
}

function helpText() {
  return "text-sm text-black/60";
}

function isNonEmpty(v: string) {
  return (v ?? "").trim().length > 0;
}

function toNumberOrNull(v: string) {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getApiError(v: unknown) {
  if (!isRecord(v)) return null;
  return typeof v.error === "string" ? v.error : null;
}

function defaultValues(): BoatFormValues {
  return {
    title: "",
    description: "",
    year: "",
    lengthM: "",
    capacityGuests: "",
    ownerPhone: "",
    rentPriceHour: "",
    rentPriceDay: "",
    rentPriceWeek: "",
    salePrice: "",
    motorHorsePower: "",
  };
}

function buildTitle(mode: BoatFormMode) {
  if (mode.kind === "rent" && mode.boatType === "motor") return "Add motor boat for rent";
  if (mode.kind === "rent" && mode.boatType === "sail") return "Add sail boat for rent";
  if (mode.kind === "sale" && mode.boatType === "motor") return "Add motor boat for sale";
  return "Add sail boat for sale";
}

function validate(values: BoatFormValues, mode: BoatFormMode) {
  const errors: Record<string, string> = {};

  const requiredCommon: Array<keyof BoatFormValues> = ["title", "capacityGuests", "ownerPhone"];

  for (const k of requiredCommon) {
    if (!isNonEmpty(String(values[k] ?? ""))) {
      errors[k] = "Required";
    }
  }

  const yearN = toNumberOrNull(values.year);
  if (yearN !== null && (yearN < 1900 || yearN > 2100)) {
    errors.year = "Enter a valid year";
  }

  const lengthN = toNumberOrNull(values.lengthM);
  if (lengthN !== null && (lengthN <= 0 || lengthN > 200)) {
    errors.lengthM = "Enter length in meters";
  }

  const guestsN = toNumberOrNull(values.capacityGuests);
  if (guestsN !== null && (guestsN <= 0 || guestsN > 200)) {
    errors.capacityGuests = "Enter guest capacity";
  }

  const hpN = toNumberOrNull(values.motorHorsePower);
  if (hpN !== null && (hpN < 0 || hpN > 100000)) {
    errors.motorHorsePower = "Enter valid horsepower";
  }

  if (mode.kind === "rent") {
    if (!isNonEmpty(values.rentPriceHour) && !isNonEmpty(values.rentPriceDay) && !isNonEmpty(values.rentPriceWeek)) {
      errors.rentPriceHour = "Add at least one rental price";
      errors.rentPriceDay = "Add at least one rental price";
      errors.rentPriceWeek = "Add at least one rental price";
    }
  }

  if (mode.kind === "sale" && !isNonEmpty(values.salePrice)) {
    errors.salePrice = "Required";
  }

  return errors;
}

export function BoatForm({ mode }: { mode: BoatFormMode }) {
  const [values, setValues] = useState<BoatFormValues>(() => defaultValues());
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listingSaved, setListingSaved] = useState(false);

  const title = useMemo(() => buildTitle(mode), [mode]);

  const errors = useMemo(() => validate(values, mode), [values, mode]);
  const hasErrors = Object.keys(errors).length > 0;

  function set<K extends keyof BoatFormValues>(key: K, v: BoatFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const apiPayload = useMemo(
    () => ({
      title: values.title.trim(),
      description: values.description.trim(),
      listingType: mode.kind,
      vesselType: mode.boatType === "motor" ? "motorboat" : "sailboat",
      capacity: toNumberOrNull(values.capacityGuests),
      lengthM: toNumberOrNull(values.lengthM),
      year: toNumberOrNull(values.year),
      engineHp: toNumberOrNull(values.motorHorsePower),
      rentPriceHour: mode.kind === "rent" ? toNumberOrNull(values.rentPriceHour) : null,
      rentPriceDay: mode.kind === "rent" ? toNumberOrNull(values.rentPriceDay) : null,
      rentPriceWeek: mode.kind === "rent" ? toNumberOrNull(values.rentPriceWeek) : null,
      salePrice: mode.kind === "sale" ? toNumberOrNull(values.salePrice) : null,
      currency: "EUR",
      ownerPhone: values.ownerPhone.trim(),
    }),
    [values, mode]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setSaveError(null);
    setListingSaved(false);
    if (hasErrors) return;

    const token = localStorage.getItem("owner_jwt")?.trim();
    if (!token) {
      setSaveError("Please sign in as an owner and try again.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/owner/boats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(apiPayload),
      });

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setSaveError(getApiError(json) ?? "Could not save this listing.");
        return;
      }

      setListingSaved(true);
    } catch {
      setSaveError("Could not save this listing.");
    } finally {
      setIsSaving(false);
    }
  }

  function fieldError(k: keyof BoatFormValues) {
    if (!submitted) return null;
    const msg = errors[k];
    if (!msg) return null;
    return <div className="text-sm text-red-600">{msg}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className={helpText()}>
        Add the details owners and guests need first. Visible after approval.
      </p>

      <form className="mt-6 space-y-8" onSubmit={onSubmit}>
        <section className="space-y-3">
          <div className={sectionTitle()}>Listing details</div>

          <div className="space-y-1">
            <div className={labelBase()}>Title</div>
            <input className={inputBase()} value={values.title} onChange={(e) => set("title", e.target.value)} />
            {fieldError("title")}
          </div>

          <div className="space-y-1">
            <div className={labelBase()}>Description</div>
            <textarea className={inputBase()} rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} />
            {fieldError("description")}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className={labelBase()}>Listing type</div>
              <input className={inputBase()} value={mode.kind === "rent" ? "Rent" : "Sale"} readOnly />
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Vessel type</div>
              <input className={inputBase()} value={mode.boatType === "motor" ? "Motor boat" : "Sail boat"} readOnly />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className={sectionTitle()}>Boat basics</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className={labelBase()}>Capacity</div>
              <input className={inputBase()} value={values.capacityGuests} onChange={(e) => set("capacityGuests", e.target.value)} />
              {fieldError("capacityGuests")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Year</div>
              <input className={inputBase()} value={values.year} onChange={(e) => set("year", e.target.value)} />
              {fieldError("year")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Length, m</div>
              <input className={inputBase()} value={values.lengthM} onChange={(e) => set("lengthM", e.target.value)} />
              {fieldError("lengthM")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Horsepower</div>
              <input className={inputBase()} value={values.motorHorsePower} onChange={(e) => set("motorHorsePower", e.target.value)} />
              {fieldError("motorHorsePower")}
            </div>
          </div>
        </section>

        {mode.kind === "rent" ? (
          <section className="space-y-3">
            <div className={sectionTitle()}>Rent pricing</div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <div className={labelBase()}>Price per hour, EUR</div>
                <input className={inputBase()} value={values.rentPriceHour} onChange={(e) => set("rentPriceHour", e.target.value)} />
                {fieldError("rentPriceHour")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Price per day, EUR</div>
                <input className={inputBase()} value={values.rentPriceDay} onChange={(e) => set("rentPriceDay", e.target.value)} />
                {fieldError("rentPriceDay")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Price per week, EUR</div>
                <input className={inputBase()} value={values.rentPriceWeek} onChange={(e) => set("rentPriceWeek", e.target.value)} />
                {fieldError("rentPriceWeek")}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className={sectionTitle()}>Sale pricing</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className={labelBase()}>Price, EUR</div>
                <input className={inputBase()} value={values.salePrice} onChange={(e) => set("salePrice", e.target.value)} />
                {fieldError("salePrice")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Currency</div>
                <input className={inputBase()} value="EUR" readOnly />
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className={sectionTitle()}>Owner contact</div>

          <div className="space-y-1">
            <div className={labelBase()}>Owner phone</div>
            <input className={inputBase()} value={values.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} />
            {fieldError("ownerPhone")}
          </div>

          <div className={helpText()}>Visible after approval.</div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isSaving} className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50">
            {isSaving ? "Saving..." : "Save for review"}
          </button>

          {submitted && hasErrors ? <div className="text-sm text-red-600">Please complete the highlighted fields.</div> : null}
          {saveError ? <div className="text-sm text-red-600">{saveError}</div> : null}
          {listingSaved ? <div className="text-sm text-green-700">Listing saved for review. Visible after approval.</div> : null}
        </div>
      </form>
    </div>
  );
}

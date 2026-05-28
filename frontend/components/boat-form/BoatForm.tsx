"use client";

import React, { useMemo, useState } from "react";
import type { BoatFormMode, BoatFormValues } from "./types";

function inputBase() {
  return "w-full rounded-lg border border-white/[0.12] bg-white/[0.07] px-3.5 py-3 text-[15px] text-white shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] outline-none transition placeholder:text-white/[0.32] focus:border-white/[0.35] focus:bg-white/[0.09] focus:ring-4 focus:ring-white/10 disabled:opacity-60";
}

function labelBase() {
  return "text-sm font-semibold text-white/[0.88]";
}

function sectionTitle() {
  return "text-lg font-semibold text-white";
}

function helpText() {
  return "text-sm leading-6 text-white/[0.58]";
}

function sectionCard() {
  return "rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] sm:p-6";
}

function fieldGroup() {
  return "space-y-2";
}

function readonlyInput() {
  return `${inputBase()} cursor-default text-white/70`;
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
    return <div className="text-sm font-medium text-red-300">{msg}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="overflow-hidden rounded-3xl border border-white/[0.12] bg-[#071012]/[0.88] shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
        <div className="border-b border-white/10 bg-white/[0.035] px-5 py-6 sm:px-7 sm:py-7">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/[0.42]">Owner listing</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/[0.62]">
            Add the core details for review. Keep the information clear and accurate.
          </p>
        </div>

        <form className="space-y-5 p-5 sm:p-7" onSubmit={onSubmit}>
          <section className={sectionCard()}>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className={sectionTitle()}>Listing details</div>
                <p className={helpText()}>Name the boat and describe what owners should know first.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/[0.12] bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/[0.68]">
                  {mode.kind === "rent" ? "Rent" : "Sale"}
                </span>
                <span className="rounded-full border border-white/[0.12] bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/[0.68]">
                  {mode.boatType === "motor" ? "Motor boat" : "Sail boat"}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div className={fieldGroup()}>
                <div className={labelBase()}>Title</div>
                <input
                  className={inputBase()}
                  placeholder="Boat name or short listing title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                />
                {fieldError("title")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>Description</div>
                <textarea
                  className={`${inputBase()} min-h-36 resize-y`}
                  rows={5}
                  placeholder="Short description, condition, and useful details"
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                />
                {fieldError("description")}
              </div>
            </div>
          </section>

          <section className={sectionCard()}>
            <div className="mb-5">
              <div className={sectionTitle()}>Boat basics</div>
              <p className={helpText()}>Use numbers only where possible.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={fieldGroup()}>
                <div className={labelBase()}>Capacity</div>
                <input
                  className={inputBase()}
                  placeholder="Guests"
                  value={values.capacityGuests}
                  onChange={(e) => set("capacityGuests", e.target.value)}
                />
                {fieldError("capacityGuests")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>Year</div>
                <input
                  className={inputBase()}
                  placeholder="Build year"
                  value={values.year}
                  onChange={(e) => set("year", e.target.value)}
                />
                {fieldError("year")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>Length, m</div>
                <input
                  className={inputBase()}
                  placeholder="Meters"
                  value={values.lengthM}
                  onChange={(e) => set("lengthM", e.target.value)}
                />
                {fieldError("lengthM")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>Horsepower</div>
                <input
                  className={inputBase()}
                  placeholder="Engine power"
                  value={values.motorHorsePower}
                  onChange={(e) => set("motorHorsePower", e.target.value)}
                />
                {fieldError("motorHorsePower")}
              </div>
            </div>
          </section>

          {mode.kind === "rent" ? (
            <section className={sectionCard()}>
              <div className="mb-5">
                <div className={sectionTitle()}>Rent pricing</div>
                <p className={helpText()}>Add at least one rental price in EUR.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldGroup()}>
                  <div className={labelBase()}>Price per hour, EUR</div>
                  <input
                    className={inputBase()}
                    placeholder="Hourly price"
                    value={values.rentPriceHour}
                    onChange={(e) => set("rentPriceHour", e.target.value)}
                  />
                  {fieldError("rentPriceHour")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>Price per day, EUR</div>
                  <input
                    className={inputBase()}
                    placeholder="Daily price"
                    value={values.rentPriceDay}
                    onChange={(e) => set("rentPriceDay", e.target.value)}
                  />
                  {fieldError("rentPriceDay")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>Price per week, EUR</div>
                  <input
                    className={inputBase()}
                    placeholder="Weekly price"
                    value={values.rentPriceWeek}
                    onChange={(e) => set("rentPriceWeek", e.target.value)}
                  />
                  {fieldError("rentPriceWeek")}
                </div>
              </div>
            </section>
          ) : (
            <section className={sectionCard()}>
              <div className="mb-5">
                <div className={sectionTitle()}>Sale pricing</div>
                <p className={helpText()}>Add the asking price in EUR.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldGroup()}>
                  <div className={labelBase()}>Price, EUR</div>
                  <input
                    className={inputBase()}
                    placeholder="Sale price"
                    value={values.salePrice}
                    onChange={(e) => set("salePrice", e.target.value)}
                  />
                  {fieldError("salePrice")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>Currency</div>
                  <input className={readonlyInput()} value="EUR" readOnly />
                </div>
              </div>
            </section>
          )}

          <section className={sectionCard()}>
            <div className="mb-5">
              <div className={sectionTitle()}>Owner contact</div>
              <p className={helpText()}>Add the phone number for owner follow-up.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={fieldGroup()}>
                <div className={labelBase()}>Owner phone</div>
                <input
                  className={inputBase()}
                  placeholder="Phone number"
                  value={values.ownerPhone}
                  onChange={(e) => set("ownerPhone", e.target.value)}
                />
                {fieldError("ownerPhone")}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-white/60">
                Listing saved for review. Visible after approval.
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-white/10 bg-black/[0.22] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="min-h-6 text-sm font-medium">
              {submitted && hasErrors ? <div className="text-red-300">Please complete the highlighted fields.</div> : null}
              {saveError ? <div className="text-red-300">{saveError}</div> : null}
              {listingSaved ? <div className="text-emerald-300">Listing saved for review. Visible after approval.</div> : null}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-4 w-full rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#071012] shadow-[0_12px_32px_rgba(0,0,0,0.24)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto"
            >
              {isSaving ? "Saving..." : "Save for review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

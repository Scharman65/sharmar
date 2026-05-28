"use client";

import React, { useMemo, useState } from "react";
import type { BoatFormMode, BoatFormValues } from "./types";

function inputBase() {
  return "boat-form-input";
}

function labelBase() {
  return "boat-form-label";
}

function sectionTitle() {
  return "boat-form-section-title";
}

function helpText() {
  return "boat-form-help";
}

function sectionCard() {
  return "boat-form-section";
}

function fieldGroup() {
  return "boat-form-field";
}

function readonlyInput() {
  return "boat-form-input boat-form-readonly";
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
    return <div className="boat-form-error">{msg}</div>;
  }

  return (
    <div className="boat-form-shell">
      <div className="boat-form-card">
        <div className="boat-form-hero">
          <div className="boat-form-kicker">Owner listing</div>
          <h1>{title}</h1>
          <p>
            Add the core details for review. Keep the information clear and accurate.
          </p>
        </div>

        <form className="boat-form-body" onSubmit={onSubmit}>
          <section className={sectionCard()}>
            <div className="boat-form-section-header boat-form-section-header-split">
              <div>
                <div className={sectionTitle()}>Listing details</div>
                <p className={helpText()}>Name the boat and describe what owners should know first.</p>
              </div>
              <div className="boat-form-badges">
                <span>
                  {mode.kind === "rent" ? "Rent" : "Sale"}
                </span>
                <span>
                  {mode.boatType === "motor" ? "Motor boat" : "Sail boat"}
                </span>
              </div>
            </div>

            <div className="boat-form-stack">
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
                  className="boat-form-textarea"
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
            <div className="boat-form-section-header">
              <div className={sectionTitle()}>Boat basics</div>
              <p className={helpText()}>Use numbers only where possible.</p>
            </div>

            <div className="boat-form-grid">
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
              <div className="boat-form-section-header">
                <div className={sectionTitle()}>Rent pricing</div>
                <p className={helpText()}>Add at least one rental price in EUR.</p>
              </div>

              <div className="boat-form-grid">
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
              <div className="boat-form-section-header">
                <div className={sectionTitle()}>Sale pricing</div>
                <p className={helpText()}>Add the asking price in EUR.</p>
              </div>

              <div className="boat-form-grid">
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
            <div className="boat-form-section-header">
              <div className={sectionTitle()}>Owner contact</div>
              <p className={helpText()}>Add the phone number for owner follow-up.</p>
            </div>

            <div className="boat-form-grid">
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

              <div className="boat-form-note">
                Listing saved for review. Visible after approval.
              </div>
            </div>
          </section>

          <div className="boat-form-actions">
            <div className="boat-form-status">
              {submitted && hasErrors ? <div className="boat-form-error">Please complete the highlighted fields.</div> : null}
              {saveError ? <div className="boat-form-error">{saveError}</div> : null}
              {listingSaved ? <div className="boat-form-success">Listing saved for review. Visible after approval.</div> : null}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="boat-form-submit"
            >
              {isSaving ? "Saving..." : "Save for review"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .boat-form-shell {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          padding: 32px 16px;
          color: #ffffff;
        }

        .boat-form-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(56, 189, 248, 0.13), transparent 34%),
            linear-gradient(145deg, rgba(7, 16, 18, 0.96), rgba(10, 20, 24, 0.94));
          box-shadow: 0 28px 100px rgba(0, 0, 0, 0.45);
        }

        .boat-form-hero {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.035);
          padding: 28px;
        }

        .boat-form-kicker {
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .boat-form-hero h1 {
          margin: 12px 0 0;
          color: #ffffff;
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: 0;
        }

        .boat-form-hero p {
          max-width: 640px;
          margin: 14px 0 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 15px;
          line-height: 1.65;
        }

        .boat-form-body {
          display: grid;
          gap: 20px;
          padding: 28px;
        }

        .boat-form-section {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.052);
          padding: 24px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055);
        }

        .boat-form-section-header {
          margin-bottom: 20px;
        }

        .boat-form-section-header-split {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .boat-form-section-title {
          color: #ffffff;
          font-size: 19px;
          line-height: 1.25;
          font-weight: 750;
        }

        .boat-form-help {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          line-height: 1.6;
        }

        .boat-form-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .boat-form-badges span {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          color: rgba(255, 255, 255, 0.72);
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }

        .boat-form-stack {
          display: grid;
          gap: 20px;
        }

        .boat-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .boat-form-field {
          min-width: 0;
        }

        .boat-form-field + .boat-form-field {
          margin-top: 0;
        }

        .boat-form-label {
          display: block;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.3;
        }

        .boat-form-input,
        .boat-form-textarea {
          display: block;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.074);
          color: #ffffff;
          padding: 13px 14px;
          font: inherit;
          font-size: 15px;
          line-height: 1.35;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055);
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }

        .boat-form-textarea {
          min-height: 144px;
          resize: vertical;
        }

        .boat-form-input::placeholder,
        .boat-form-textarea::placeholder {
          color: rgba(255, 255, 255, 0.34);
        }

        .boat-form-input:focus,
        .boat-form-textarea:focus {
          border-color: rgba(255, 255, 255, 0.38);
          background: rgba(255, 255, 255, 0.095);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .boat-form-input:disabled,
        .boat-form-textarea:disabled {
          opacity: 0.6;
        }

        .boat-form-readonly {
          cursor: default;
          color: rgba(255, 255, 255, 0.72);
        }

        .boat-form-note {
          align-self: end;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.052);
          color: rgba(255, 255, 255, 0.64);
          padding: 15px;
          font-size: 14px;
          line-height: 1.6;
        }

        .boat-form-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.24);
          padding: 16px;
        }

        .boat-form-status {
          min-height: 22px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.45;
        }

        .boat-form-error {
          color: #fca5a5;
          font-size: 14px;
          font-weight: 650;
          line-height: 1.45;
        }

        .boat-form-field .boat-form-error {
          margin-top: 8px;
        }

        .boat-form-success {
          color: #86efac;
        }

        .boat-form-submit {
          flex: 0 0 auto;
          min-width: 156px;
          border: 0;
          border-radius: 12px;
          background: #ffffff;
          color: #071012;
          cursor: pointer;
          padding: 13px 22px;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.2;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
          transition: opacity 160ms ease, transform 160ms ease, background 160ms ease;
        }

        .boat-form-submit:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }

        .boat-form-submit:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          transform: none;
        }

        @media (max-width: 720px) {
          .boat-form-shell {
            padding: 20px 12px;
          }

          .boat-form-card {
            border-radius: 22px;
          }

          .boat-form-hero,
          .boat-form-body {
            padding: 20px;
          }

          .boat-form-section {
            padding: 18px;
          }

          .boat-form-section-header-split,
          .boat-form-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .boat-form-grid {
            grid-template-columns: 1fr;
          }

          .boat-form-submit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

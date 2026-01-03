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

function defaultValues(): BoatFormValues {
  return {
    title: "",
    description: "",

    locationCity: "",
    locationMarina: "",

    manufacturer: "",
    model: "",
    year: "",

    lengthM: "",
    beamM: "",

    capacityGuests: "",
    cabins: "",
    berths: "",

    mainImageUrl: "",
    galleryImageUrls: "",

    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",

    rentPriceDay: "",
    rentPriceWeek: "",
    rentDeposit: "",
    rentIncludes: "",
    rentCancellation: "",

    salePrice: "",
    saleCurrency: "EUR",
    saleCondition: "used",
    saleNegotiable: false,
    saleDocuments: "",
    saleServiceHistory: "",

    motorEngineType: "",
    motorEngineCount: "1",
    motorHorsePower: "",
    motorEngineHours: "",
    motorCruiseSpeed: "",

    sailDraftM: "",
    sailKeelType: "",
    sailRigType: "",
    sailSailArea: "",
    sailSailsUpdatedYear: "",
  };
}

function buildTitle(mode: BoatFormMode) {
  if (mode.kind === "rent" && mode.boatType === "motor") return "Добавить: аренда моторной лодки";
  if (mode.kind === "rent" && mode.boatType === "sail") return "Добавить: аренда парусной лодки";
  if (mode.kind === "sale" && mode.boatType === "motor") return "Добавить: продажа моторной лодки";
  return "Добавить: продажа парусной лодки";
}

function validate(values: BoatFormValues, mode: BoatFormMode) {
  const errors: Record<string, string> = {};

  const requiredCommon: Array<keyof BoatFormValues> = [
    "title",
    "description",
    "locationCity",
    "manufacturer",
    "model",
    "year",
    "lengthM",
    "capacityGuests",
    "ownerName",
    "ownerPhone",
  ];

  for (const k of requiredCommon) {
    if (!isNonEmpty(String(values[k] ?? ""))) {
      errors[k] = "Обязательное поле";
    }
  }

  const yearN = toNumberOrNull(values.year);
  if (yearN !== null && (yearN < 1900 || yearN > 2100)) {
    errors.year = "Год выглядит странно";
  }

  const lengthN = toNumberOrNull(values.lengthM);
  if (lengthN !== null && (lengthN <= 0 || lengthN > 200)) {
    errors.lengthM = "Длина должна быть в метрах";
  }

  const guestsN = toNumberOrNull(values.capacityGuests);
  if (guestsN !== null && (guestsN <= 0 || guestsN > 200)) {
    errors.capacityGuests = "Вместимость должна быть числом";
  }

  if (mode.kind === "rent") {
    if (!isNonEmpty(values.rentPriceDay) && !isNonEmpty(values.rentPriceWeek)) {
      errors.rentPriceDay = "Укажи цену за день или за неделю";
      errors.rentPriceWeek = "Укажи цену за день или за неделю";
    }
  }

  if (mode.kind === "sale") {
    if (!isNonEmpty(values.salePrice)) errors.salePrice = "Обязательное поле";
    if (!isNonEmpty(values.saleCurrency)) errors.saleCurrency = "Обязательное поле";
  }

  if (mode.boatType === "motor") {
    if (!isNonEmpty(values.motorEngineType)) errors.motorEngineType = "Обязательное поле";
    if (!isNonEmpty(values.motorHorsePower)) errors.motorHorsePower = "Обязательное поле";
    if (mode.kind === "sale" && !isNonEmpty(values.motorEngineHours)) {
      errors.motorEngineHours = "Для продажи желательно указать моточасы";
    }
  }

  if (mode.boatType === "sail") {
    if (!isNonEmpty(values.sailDraftM)) errors.sailDraftM = "Обязательное поле";
    if (!isNonEmpty(values.sailKeelType)) errors.sailKeelType = "Обязательное поле";
    if (!isNonEmpty(values.sailRigType)) errors.sailRigType = "Обязательное поле";
  }

  return errors;
}

export function BoatForm({ mode }: { mode: BoatFormMode }) {
  const [values, setValues] = useState<BoatFormValues>(() => defaultValues());
  const [submitted, setSubmitted] = useState(false);

  const title = useMemo(() => buildTitle(mode), [mode]);

  const errors = useMemo(() => validate(values, mode), [values, mode]);
  const hasErrors = Object.keys(errors).length > 0;

  function set<K extends keyof BoatFormValues>(key: K, v: BoatFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const payloadPreview = useMemo(() => {
    const gallery = values.galleryImageUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      listingKind: mode.kind,
      boatType: mode.boatType,

      title: values.title.trim(),
      description: values.description.trim(),

      location: {
        city: values.locationCity.trim(),
        marina: values.locationMarina.trim(),
      },

      specs: {
        manufacturer: values.manufacturer.trim(),
        model: values.model.trim(),
        year: toNumberOrNull(values.year),
        lengthM: toNumberOrNull(values.lengthM),
        beamM: toNumberOrNull(values.beamM),
        capacityGuests: toNumberOrNull(values.capacityGuests),
        cabins: toNumberOrNull(values.cabins),
        berths: toNumberOrNull(values.berths),
      },

      images: {
        mainImageUrl: values.mainImageUrl.trim(),
        galleryImageUrls: gallery,
      },

      owner: {
        name: values.ownerName.trim(),
        phone: values.ownerPhone.trim(),
        email: values.ownerEmail.trim(),
      },

      rent:
        mode.kind === "rent"
          ? {
              priceDay: toNumberOrNull(values.rentPriceDay),
              priceWeek: toNumberOrNull(values.rentPriceWeek),
              deposit: toNumberOrNull(values.rentDeposit),
              includes: values.rentIncludes.trim(),
              cancellation: values.rentCancellation.trim(),
            }
          : null,

      sale:
        mode.kind === "sale"
          ? {
              price: toNumberOrNull(values.salePrice),
              currency: values.saleCurrency.trim(),
              condition: values.saleCondition.trim(),
              negotiable: Boolean(values.saleNegotiable),
              documents: values.saleDocuments.trim(),
              serviceHistory: values.saleServiceHistory.trim(),
            }
          : null,

      motor:
        mode.boatType === "motor"
          ? {
              engineType: values.motorEngineType.trim(),
              engineCount: toNumberOrNull(values.motorEngineCount),
              horsePower: toNumberOrNull(values.motorHorsePower),
              engineHours: toNumberOrNull(values.motorEngineHours),
              cruiseSpeed: toNumberOrNull(values.motorCruiseSpeed),
            }
          : null,

      sail:
        mode.boatType === "sail"
          ? {
              draftM: toNumberOrNull(values.sailDraftM),
              keelType: values.sailKeelType.trim(),
              rigType: values.sailRigType.trim(),
              sailArea: toNumberOrNull(values.sailSailArea),
              sailsUpdatedYear: toNumberOrNull(values.sailSailsUpdatedYear),
            }
          : null,
    };
  }, [values, mode]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    alert("ОК. На следующем шаге подключим сохранение в Strapi.");
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
        Сейчас это безопасный режим: форма собирает данные и показывает JSON. На следующем шаге подключим загрузку фото и сохранение в Strapi.
      </p>

      <form className="mt-6 space-y-8" onSubmit={onSubmit}>
        <section className="space-y-3">
          <div className={sectionTitle()}>Основное</div>

          <div className="space-y-1">
            <div className={labelBase()}>Заголовок</div>
            <input className={inputBase()} value={values.title} onChange={(e) => set("title", e.target.value)} />
            {fieldError("title")}
          </div>

          <div className="space-y-1">
            <div className={labelBase()}>Описание</div>
            <textarea className={inputBase()} rows={5} value={values.description} onChange={(e) => set("description", e.target.value)} />
            {fieldError("description")}
          </div>
        </section>

        <section className="space-y-3">
          <div className={sectionTitle()}>Локация</div>

          <div className="space-y-1">
            <div className={labelBase()}>Город</div>
            <input className={inputBase()} value={values.locationCity} onChange={(e) => set("locationCity", e.target.value)} />
            {fieldError("locationCity")}
          </div>

          <div className="space-y-1">
            <div className={labelBase()}>Марина (если есть)</div>
            <input className={inputBase()} value={values.locationMarina} onChange={(e) => set("locationMarina", e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <div className={sectionTitle()}>Характеристики</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className={labelBase()}>Производитель</div>
              <input className={inputBase()} value={values.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
              {fieldError("manufacturer")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Модель</div>
              <input className={inputBase()} value={values.model} onChange={(e) => set("model", e.target.value)} />
              {fieldError("model")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Год</div>
              <input className={inputBase()} value={values.year} onChange={(e) => set("year", e.target.value)} />
              {fieldError("year")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Длина, м</div>
              <input className={inputBase()} value={values.lengthM} onChange={(e) => set("lengthM", e.target.value)} />
              {fieldError("lengthM")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Ширина, м</div>
              <input className={inputBase()} value={values.beamM} onChange={(e) => set("beamM", e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Вместимость, человек</div>
              <input className={inputBase()} value={values.capacityGuests} onChange={(e) => set("capacityGuests", e.target.value)} />
              {fieldError("capacityGuests")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Каюты</div>
              <input className={inputBase()} value={values.cabins} onChange={(e) => set("cabins", e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Спальные места</div>
              <input className={inputBase()} value={values.berths} onChange={(e) => set("berths", e.target.value)} />
            </div>
          </div>
        </section>

        {mode.boatType === "motor" ? (
          <section className="space-y-3">
            <div className={sectionTitle()}>Двигатель (моторное)</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className={labelBase()}>Тип двигателя</div>
                <input className={inputBase()} value={values.motorEngineType} onChange={(e) => set("motorEngineType", e.target.value)} />
                {fieldError("motorEngineType")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Количество двигателей</div>
                <input className={inputBase()} value={values.motorEngineCount} onChange={(e) => set("motorEngineCount", e.target.value)} />
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Мощность (hp)</div>
                <input className={inputBase()} value={values.motorHorsePower} onChange={(e) => set("motorHorsePower", e.target.value)} />
                {fieldError("motorHorsePower")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Моточасы</div>
                <input className={inputBase()} value={values.motorEngineHours} onChange={(e) => set("motorEngineHours", e.target.value)} />
                {fieldError("motorEngineHours")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Крейсерская скорость (узлы)</div>
                <input className={inputBase()} value={values.motorCruiseSpeed} onChange={(e) => set("motorCruiseSpeed", e.target.value)} />
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className={sectionTitle()}>Парусное</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className={labelBase()}>Осадка, м</div>
                <input className={inputBase()} value={values.sailDraftM} onChange={(e) => set("sailDraftM", e.target.value)} />
                {fieldError("sailDraftM")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Тип киля</div>
                <input className={inputBase()} value={values.sailKeelType} onChange={(e) => set("sailKeelType", e.target.value)} />
                {fieldError("sailKeelType")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Тип вооружения (rig)</div>
                <input className={inputBase()} value={values.sailRigType} onChange={(e) => set("sailRigType", e.target.value)} />
                {fieldError("sailRigType")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Площадь парусов (если есть)</div>
                <input className={inputBase()} value={values.sailSailArea} onChange={(e) => set("sailSailArea", e.target.value)} />
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Год обновления парусов (если есть)</div>
                <input className={inputBase()} value={values.sailSailsUpdatedYear} onChange={(e) => set("sailSailsUpdatedYear", e.target.value)} />
              </div>
            </div>
          </section>
        )}

        {mode.kind === "rent" ? (
          <section className="space-y-3">
            <div className={sectionTitle()}>Аренда</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className={labelBase()}>Цена за день</div>
                <input className={inputBase()} value={values.rentPriceDay} onChange={(e) => set("rentPriceDay", e.target.value)} />
                {fieldError("rentPriceDay")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Цена за неделю</div>
                <input className={inputBase()} value={values.rentPriceWeek} onChange={(e) => set("rentPriceWeek", e.target.value)} />
                {fieldError("rentPriceWeek")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Депозит</div>
                <input className={inputBase()} value={values.rentDeposit} onChange={(e) => set("rentDeposit", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Что включено</div>
              <textarea className={inputBase()} rows={3} value={values.rentIncludes} onChange={(e) => set("rentIncludes", e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Правила отмены</div>
              <textarea className={inputBase()} rows={3} value={values.rentCancellation} onChange={(e) => set("rentCancellation", e.target.value)} />
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className={sectionTitle()}>Продажа</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className={labelBase()}>Цена</div>
                <input className={inputBase()} value={values.salePrice} onChange={(e) => set("salePrice", e.target.value)} />
                {fieldError("salePrice")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Валюта</div>
                <select className={inputBase()} value={values.saleCurrency} onChange={(e) => set("saleCurrency", e.target.value)}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
                {fieldError("saleCurrency")}
              </div>

              <div className="space-y-1">
                <div className={labelBase()}>Состояние</div>
                <select className={inputBase()} value={values.saleCondition} onChange={(e) => set("saleCondition", e.target.value)}>
                  <option value="used">Б/у</option>
                  <option value="new">Новая</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-7">
                <input type="checkbox" checked={values.saleNegotiable} onChange={(e) => set("saleNegotiable", e.target.checked)} />
                <span className="text-sm">Торг возможен</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Документы / регистрация</div>
              <textarea className={inputBase()} rows={3} value={values.saleDocuments} onChange={(e) => set("saleDocuments", e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Сервисная история</div>
              <textarea className={inputBase()} rows={3} value={values.saleServiceHistory} onChange={(e) => set("saleServiceHistory", e.target.value)} />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className={sectionTitle()}>Фото (пока URL)</div>

          <div className="space-y-1">
            <div className={labelBase()}>Главное фото (URL)</div>
            <input className={inputBase()} value={values.mainImageUrl} onChange={(e) => set("mainImageUrl", e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className={labelBase()}>Галерея (каждый URL с новой строки)</div>
            <textarea className={inputBase()} rows={5} value={values.galleryImageUrls} onChange={(e) => set("galleryImageUrls", e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <div className={sectionTitle()}>Контакты владельца</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className={labelBase()}>Имя</div>
              <input className={inputBase()} value={values.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
              {fieldError("ownerName")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Телефон</div>
              <input className={inputBase()} value={values.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} />
              {fieldError("ownerPhone")}
            </div>

            <div className="space-y-1">
              <div className={labelBase()}>Email (если есть)</div>
              <input className={inputBase()} value={values.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
            </div>
          </div>

          <div className={helpText()}>
            Контакты будут показываться покупателям/арендаторам только после подтверждения админом.
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50">
            Сохранить (пока без Strapi)
          </button>

          {submitted && hasErrors ? <div className="text-sm text-red-600">Исправь обязательные поля.</div> : null}
        </div>

        <section className="space-y-2">
          <div className={sectionTitle()}>JSON предпросмотр</div>
          <pre className="overflow-auto rounded-md border border-black/10 bg-black/5 p-3 text-xs">
            {JSON.stringify(payloadPreview, null, 2)}
          </pre>
        </section>
      </form>
    </div>
  );
}

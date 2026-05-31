"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { BoatFormMode, BoatFormValues } from "./types";



const translations = {
  en: {
    createListingDesc: "Add yacht details and photos.",
    manualReviewDesc: "Sharmar verifies listings before publication.",
    receiveRequestsDesc: "Owners approve bookings before confirmation.",
    listingDetails: "Listing details",
    listingDetailsDesc: "Name the boat and describe what owners should know first.",
    languageDetected: "{ui.languageDetected}",
    title: "Title",
    description: "Description",
    boatBasics: "Boat basics",
    boatBasicsDesc: "Use numbers only where possible.",
    capacity: "Capacity",
    year: "Year",
    length: "Length, m",
    horsepower: "Horsepower",
    rentPricing: "Rent pricing",
    ownerContact: "Owner contact",
    ownerContactDesc: "Add the phone number for owner follow-up.",
    ownerPhone: "Owner phone",
    reviewPending: "{ui.reviewPending}",
    boatPhotos: "Boat photos",
    uploadPhotos: "Upload boat photos",
    ownerListing: "Owner listing",
    heroDescription: "Add the core details for review. Keep the information clear and accurate.",
    createListing: "Create listing",
    manualReview: "Manual review",
    receiveRequests: "Receive requests",
    rent: "Rent",
    sale: "Sale",
    motorBoat: "Motor boat",
    sailBoat: "Sail boat",
    placeholderBoatTitle: "Boat name or short listing title",
    placeholderDescription: "Short description, condition, and useful details",
    placeholderGuests: "Guests",
    placeholderBuildYear: "Build year",
    placeholderMeters: "Meters",
    placeholderEnginePower: "Engine power",
    addRentalPrice: "Add at least one rental price in EUR.",
    pricePerHour: "Price per hour, EUR",
    pricePerDay: "Price per day, EUR",
    pricePerWeek: "Price per week, EUR",
    placeholderHourlyPrice: "Hourly price",
    placeholderDailyPrice: "Daily price",
    placeholderWeeklyPrice: "Weekly price",
    salePricing: "Sale pricing",
    addSalePrice: "Add the asking price in EUR.",
    priceEur: "Price, EUR",
    currency: "Currency",
    placeholderSalePrice: "Sale price",
    placeholderPhone: "Phone number",
    uploadHelp: "{ui.uploadHelp}",
    uploadingPhotos: "Uploading photos...",
    dragDrop: "{ui.dragDrop}",
    selectImages: "{ui.selectImages}",
    uploadMeta: "{ui.uploadMeta}",
    cover: "Cover",
    photo: "Photo",
    remove: "{ui.remove}",
    completeFields: "{ui.completeFields}",
    submittedReview: "Submitted for review",
    saving: "Saving...",
    saveForReview: "Save for review"
  },
  ru: {
    createListingDesc: "Добавьте описание и фотографии яхты.",
    manualReviewDesc: "Sharmar проверяет объявления перед публикацией.",
    receiveRequestsDesc: "Владелец подтверждает бронирование вручную.",
    listingDetails: "Информация о яхте",
    listingDetailsDesc: "Укажите основные данные о яхте.",
    languageDetected: "Язык объявления определяется автоматически по языку сайта.",
    title: "Название",
    description: "Описание",
    boatBasics: "Основные параметры",
    boatBasicsDesc: "Используйте цифры там, где возможно.",
    capacity: "Вместимость",
    year: "Год",
    length: "Длина, м",
    horsepower: "Мощность",
    rentPricing: "Стоимость аренды",
    ownerContact: "Контакты владельца",
    ownerContactDesc: "Укажите номер телефона владельца.",
    ownerPhone: "Телефон владельца",
    reviewPending: "Объявление отправлено на проверку. После одобрения станет видимым.",
    boatPhotos: "Фотографии яхты",
    uploadPhotos: "Загрузить фотографии",
    ownerListing: "Объявление владельца",
    heroDescription: "Добавьте основную информацию для проверки. Указывайте данные точно и понятно.",
    createListing: "Создание объявления",
    manualReview: "Ручная проверка",
    receiveRequests: "Получение заявок",
    rent: "Аренда",
    sale: "Продажа",
    motorBoat: "Моторная лодка",
    sailBoat: "Парусная лодка",
    placeholderBoatTitle: "Название лодки или краткий заголовок",
    placeholderDescription: "Краткое описание, состояние и важные детали",
    placeholderGuests: "Количество гостей",
    placeholderBuildYear: "Год постройки",
    placeholderMeters: "Метры",
    placeholderEnginePower: "Мощность двигателя",
    addRentalPrice: "Добавьте хотя бы одну цену аренды в EUR.",
    pricePerHour: "Цена за час, EUR",
    pricePerDay: "Цена за день, EUR",
    pricePerWeek: "Цена за неделю, EUR",
    placeholderHourlyPrice: "Цена за час",
    placeholderDailyPrice: "Цена за день",
    placeholderWeeklyPrice: "Цена за неделю",
    salePricing: "Стоимость продажи",
    addSalePrice: "Укажите цену продажи в EUR.",
    priceEur: "Цена, EUR",
    currency: "Валюта",
    placeholderSalePrice: "Цена продажи",
    placeholderPhone: "Номер телефона",
    uploadHelp: "Загрузите до 8 изображений JPG, PNG или WEBP. Первое изображение станет обложкой.",
    uploadingPhotos: "Загрузка фотографий...",
    dragDrop: "Перетащите изображения сюда или нажмите ниже",
    selectImages: "Выбрать изображения",
    uploadMeta: "JPG · PNG · WEBP · максимум 8MB · до 8 фото",
    cover: "Обложка",
    photo: "Фото",
    remove: "Удалить",
    completeFields: "Пожалуйста, заполните выделенные поля.",
    submittedReview: "Отправлено на проверку",
    saving: "Сохранение...",
    saveForReview: "Сохранить на проверку"
  },
  me: {
    createListingDesc: "Dodajte podatke i fotografije jahte.",
    manualReviewDesc: "Sharmar provjerava oglase prije objave.",
    receiveRequestsDesc: "Vlasnik potvrđuje rezervacije prije potvrde.",
    listingDetails: "Detalji jahte",
    listingDetailsDesc: "Dodajte osnovne informacije o jahti.",
    languageDetected: "Jezik oglasa se automatski određuje prema jeziku sajta.",
    title: "Naziv",
    description: "Opis",
    boatBasics: "Osnovni podaci",
    boatBasicsDesc: "Koristite brojeve gdje god je moguće.",
    capacity: "Kapacitet",
    year: "Godina",
    length: "Dužina, m",
    horsepower: "Snaga motora",
    rentPricing: "Cijena najma",
    ownerContact: "Kontakt vlasnika",
    ownerContactDesc: "Dodajte broj telefona vlasnika.",
    ownerPhone: "Telefon vlasnika",
    reviewPending: "Oglas je poslat na provjeru. Nakon odobrenja biće vidljiv.",
    boatPhotos: "Fotografije jahte",
    uploadPhotos: "Otpremi fotografije",
    ownerListing: "Oglas vlasnika",
    heroDescription: "Dodajte osnovne informacije za provjeru. Unosite tačne podatke.",
    createListing: "Kreiranje oglasa",
    manualReview: "Ručna provjera",
    receiveRequests: "Primanje zahtjeva",
    rent: "Najam",
    sale: "Prodaja",
    motorBoat: "Motorni brod",
    sailBoat: "Jedrilica",
    placeholderBoatTitle: "Naziv broda ili kratki naslov",
    placeholderDescription: "Kratak opis, stanje i važne informacije",
    placeholderGuests: "Broj gostiju",
    placeholderBuildYear: "Godina proizvodnje",
    placeholderMeters: "Metri",
    placeholderEnginePower: "Snaga motora",
    addRentalPrice: "Dodajte barem jednu cijenu najma u EUR.",
    pricePerHour: "Cijena po satu, EUR",
    pricePerDay: "Cijena po danu, EUR",
    pricePerWeek: "Cijena po sedmici, EUR",
    placeholderHourlyPrice: "Cijena po satu",
    placeholderDailyPrice: "Cijena po danu",
    placeholderWeeklyPrice: "Cijena po sedmici",
    salePricing: "Prodajna cijena",
    addSalePrice: "Dodajte prodajnu cijenu u EUR.",
    priceEur: "Cijena, EUR",
    currency: "Valuta",
    placeholderSalePrice: "Prodajna cijena",
    placeholderPhone: "Broj telefona",
    uploadHelp: "Otpremite do 8 JPG, PNG ili WEBP slika. Prva slika će biti naslovna.",
    uploadingPhotos: "Otpremanje fotografija...",
    dragDrop: "Prevucite slike ovdje ili kliknite ispod",
    selectImages: "Izaberite slike",
    uploadMeta: "JPG · PNG · WEBP · max 8MB · do 8 fotografija",
    cover: "Naslovna",
    photo: "Fotografija",
    remove: "Ukloni",
    completeFields: "Molimo popunite označena polja.",
    submittedReview: "Poslato na provjeru",
    saving: "Čuvanje...",
    saveForReview: "Sačuvaj za provjeru"
  }
};


type UploadedImage = {
  id: number;
  url: string;
  name?: string;
  mime?: string;
  size?: number;
};

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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pathname = usePathname();
  const lang = pathname.split("/")[1] || "en";
  const ui = translations[lang as keyof typeof translations] || translations.en;
  const listingLanguage = lang;

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
      locale: listingLanguage,
      imageIds: uploadedImages.map((image) => image.id),
    }),
    [values, mode]
  );


  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadError(null);

    const selectedFiles = Array.from(files);

    if (uploadedImages.length + selectedFiles.length > 8) {
      setUploadError("Maximum 8 images per listing");
      return;
    }

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setUploadError("Only JPG, PNG and WEBP images are allowed");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setUploadError("Maximum file size is 8MB");
        return;
      }
    }

    const token = localStorage.getItem("owner_jwt")?.trim();

    if (!token) {
      setUploadError("Owner session expired. Please sign in again.");
      return;
    }

    try {
      setUploadingImages(true);

      const formData = new FormData();

      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const response = await fetch("/api/owner/uploads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        cache: "no-store",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        files?: UploadedImage[];
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setUploadError(data.error || "Image upload failed");
        return;
      }

      setUploadedImages((currentImages) => [
        ...currentImages,
        ...(data.files || []),
      ]);
    } catch (error) {
      console.error(error);
      setUploadError("Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  }

  function removeUploadedImage(id: number) {
    setUploadedImages((currentImages) =>
      currentImages.filter((image) => image.id !== id),
    );
  }

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
        const apiError = getApiError(json);
        const details =
          json && typeof json === "object" && "details" in json
            ? JSON.stringify((json as { details?: unknown }).details)
            : null;

        setSaveError(apiError || details || "Could not save this listing.");
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
          <div className="boat-form-kicker">{ui.ownerListing}</div>
          <h1>{title}</h1>
          <p>{ui.heroDescription}</p>

          <div className="boat-form-owner-flow">
            <div className="boat-form-owner-flow-item">
              <strong>1. {ui.createListing}</strong>
              <span>{ui.createListingDesc}</span>
            </div>

            <div className="boat-form-owner-flow-item">
              <strong>2. {ui.manualReview}</strong>
              <span>{ui.manualReviewDesc}</span>
            </div>

            <div className="boat-form-owner-flow-item">
              <strong>3. {ui.receiveRequests}</strong>
              <span>{ui.receiveRequestsDesc}</span>
            </div>
          </div>
        </div>

        <form className="boat-form-body" onSubmit={onSubmit}>
          <section className={sectionCard()}>
            <div className="boat-form-section-header boat-form-section-header-split">
              <div>
                <div className={sectionTitle()}>{ui.listingDetails}</div>
                <p className={helpText()}>{ui.listingDetailsDesc}</p>

                <div className="boat-form-language-note">
                  Listing language is automatically detected from the current site language.
                </div>
              </div>
              <div className="boat-form-badges">
                <span>
                  {mode.kind === "rent" ? ui.rent : ui.sale}
                </span>
                <span>
                  {mode.boatType === "motor" ? ui.motorBoat : ui.sailBoat}
                </span>
              </div>
            </div>

            <div className="boat-form-stack">
              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.title}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderBoatTitle}
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                />
                {fieldError("title")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.description}</div>
                <textarea
                  className="boat-form-textarea"
                  rows={5}
                  placeholder={ui.placeholderDescription}
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                />
                {fieldError("description")}
              </div>
            </div>
          </section>

          <section className={sectionCard()}>
            <div className="boat-form-section-header">
              <div className={sectionTitle()}>{ui.boatBasics}</div>
              <p className={helpText()}>{ui.boatBasicsDesc}</p>
            </div>

            <div className="boat-form-grid">
              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.capacity}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderGuests}
                  value={values.capacityGuests}
                  onChange={(e) => set("capacityGuests", e.target.value)}
                />
                {fieldError("capacityGuests")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.year}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderBuildYear}
                  value={values.year}
                  onChange={(e) => set("year", e.target.value)}
                />
                {fieldError("year")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.length}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderMeters}
                  value={values.lengthM}
                  onChange={(e) => set("lengthM", e.target.value)}
                />
                {fieldError("lengthM")}
              </div>

              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.horsepower}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderEnginePower}
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
                <div className={sectionTitle()}>{ui.rentPricing}</div>
                <p className={helpText()}>{ui.addRentalPrice}</p>
              </div>

              <div className="boat-form-grid">
                <div className={fieldGroup()}>
                  <div className={labelBase()}>{ui.pricePerHour}</div>
                  <input
                    className={inputBase()}
                    placeholder={ui.placeholderHourlyPrice}
                    value={values.rentPriceHour}
                    onChange={(e) => set("rentPriceHour", e.target.value)}
                  />
                  {fieldError("rentPriceHour")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>{ui.pricePerDay}</div>
                  <input
                    className={inputBase()}
                    placeholder={ui.placeholderDailyPrice}
                    value={values.rentPriceDay}
                    onChange={(e) => set("rentPriceDay", e.target.value)}
                  />
                  {fieldError("rentPriceDay")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>{ui.pricePerWeek}</div>
                  <input
                    className={inputBase()}
                    placeholder={ui.placeholderWeeklyPrice}
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
                <div className={sectionTitle()}>{ui.salePricing}</div>
                <p className={helpText()}>{ui.addSalePrice}</p>
              </div>

              <div className="boat-form-grid">
                <div className={fieldGroup()}>
                  <div className={labelBase()}>{ui.priceEur}</div>
                  <input
                    className={inputBase()}
                    placeholder={ui.placeholderSalePrice}
                    value={values.salePrice}
                    onChange={(e) => set("salePrice", e.target.value)}
                  />
                  {fieldError("salePrice")}
                </div>

                <div className={fieldGroup()}>
                  <div className={labelBase()}>{ui.currency}</div>
                  <input className={readonlyInput()} value="EUR" readOnly />
                </div>
              </div>
            </section>
          )}

          <section className={sectionCard()}>
            <div className="boat-form-section-header">
              <div className={sectionTitle()}>{ui.ownerContact}</div>
              <p className={helpText()}>{ui.ownerContactDesc}</p>
            </div>

            <div className="boat-form-grid">
              <div className={fieldGroup()}>
                <div className={labelBase()}>{ui.ownerPhone}</div>
                <input
                  className={inputBase()}
                  placeholder={ui.placeholderPhone}
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

            <section className={sectionCard()}>
              <div>
                <h2 className={sectionTitle()}>{ui.boatPhotos}</h2>
                <p className={helpText()}>
                  Upload up to 8 JPG, PNG or WEBP images. The first image will become the cover later.
                </p>
              </div>

              <label
                className="boat-form-upload"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleImageUpload(event.dataTransfer.files);
                }}
              >
                <span className="boat-form-upload-icon">+</span>

                <span className="boat-form-upload-title">
                  {uploadingImages ? ui.uploadingPhotos : ui.uploadPhotos}
                </span>

                <span className="boat-form-upload-subtitle">
                  Drag & drop images here or click below
                </span>

                <span className="boat-form-upload-button">
                  Select images
                </span>

                <span className="boat-form-upload-meta">
                  JPG · PNG · WEBP · max 8MB · up to 8 photos
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadingImages}
                  className="boat-form-upload-input"
                  onChange={(event) => {
                    handleImageUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>

              {uploadError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {uploadError}
                </div>
              ) : null}

              {uploadedImages.length > 0 ? (
                <div className="boat-form-preview-grid">
                  {uploadedImages.map((image, index) => (
                    <div key={image.id} className="boat-form-preview-card">
                      <div className="boat-form-preview-image-wrap">
                        <img
                          src={image.url}
                          alt={`Boat photo ${index + 1}`}
                          className="boat-form-preview-image"
                        />
                      </div>

                      <div className="boat-form-preview-footer">
                        <span className="boat-form-preview-label">
                          {index === 0 ? ui.cover : `${ui.photo} ${index + 1}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeUploadedImage(image.id)}
                          className="boat-form-preview-remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>


          <div className="boat-form-actions">
            <div className="boat-form-status">
              {submitted && hasErrors ? <div className="boat-form-error">Please complete the highlighted fields.</div> : null}
              {saveError ? <div className="boat-form-error">{saveError}</div> : null}
              {listingSaved ? <div className="boat-form-success">{ui.reviewPending}</div> : null}
            </div>


            <button
              type="submit"
              disabled={isSaving || listingSaved}
              className="boat-form-submit"
            >
              {listingSaved ? ui.submittedReview : isSaving ? ui.saving : ui.saveForReview}
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

        
.boat-form-owner-flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.boat-form-owner-flow-item {
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.boat-form-owner-flow-item strong {
  font-size: 14px;
  font-weight: 800;
}

.boat-form-owner-flow-item span {
  color: rgba(255,255,255,0.72);
  font-size: 13px;
  line-height: 1.45;
}

.boat-form-language-note {
  margin-top: 10px;
  border-left: 3px solid rgba(255,255,255,0.22);
  padding-left: 12px;
  color: rgba(255,255,255,0.72);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .boat-form-owner-flow {
    grid-template-columns: 1fr;
  }
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


        .boat-form-upload {
          min-height: 260px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 24px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          border-radius: 28px;
          background:
            radial-gradient(circle at top, rgba(34, 211, 238, 0.12), transparent 34%),
            linear-gradient(135deg, rgba(0, 0, 0, 0.32), rgba(8, 47, 73, 0.2));
          text-align: center;
          cursor: pointer;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease,
            background 180ms ease;
        }

        .boat-form-upload:hover {
          border-color: rgba(34, 211, 238, 0.48);
          box-shadow: 0 0 42px rgba(34, 211, 238, 0.12);
          transform: translateY(-1px);
        }

        .boat-form-upload-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(34, 211, 238, 0.35);
          background: rgba(34, 211, 238, 0.1);
          color: rgba(207, 250, 254, 1);
          font-size: 30px;
          line-height: 1;
          font-weight: 500;
        }

        .boat-form-upload-title {
          color: rgba(255, 255, 255, 0.96);
          font-size: 17px;
          font-weight: 800;
          line-height: 1.2;
        }

        .boat-form-upload-subtitle {
          color: rgba(255, 255, 255, 0.64);
          font-size: 14px;
          line-height: 1.35;
        }

        .boat-form-upload-button {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 20px;
          border-radius: 14px;
          border: 1px solid rgba(34, 211, 238, 0.34);
          background: rgba(34, 211, 238, 0.12);
          color: rgba(207, 250, 254, 1);
          font-size: 14px;
          font-weight: 800;
          transition: background 160ms ease;
        }

        .boat-form-upload:hover .boat-form-upload-button {
          background: rgba(34, 211, 238, 0.2);
        }

        .boat-form-upload-meta {
          color: rgba(255, 255, 255, 0.46);
          font-size: 12px;
          line-height: 1.35;
        }

        .boat-form-upload-input {
          display: none;
        }


        .boat-form-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .boat-form-preview-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.24);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
        }

        .boat-form-preview-image-wrap {
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.36);
        }

        .boat-form-preview-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .boat-form-preview-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
        }

        .boat-form-preview-label {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.64);
          font-size: 12px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .boat-form-preview-remove {
          flex: 0 0 auto;
          border: 1px solid rgba(248, 113, 113, 0.28);
          border-radius: 10px;
          background: rgba(248, 113, 113, 0.1);
          color: #fecaca;
          cursor: pointer;
          padding: 6px 9px;
          font-size: 12px;
          font-weight: 800;
          transition: background 160ms ease, border-color 160ms ease;
        }

        .boat-form-preview-remove:hover {
          border-color: rgba(248, 113, 113, 0.48);
          background: rgba(248, 113, 113, 0.18);
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

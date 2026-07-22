"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { MARKETPLACE_FEE_RATE, applyMarketplaceFee } from "@/lib/pricing";
import { OwnerAvailabilityCalendar } from "@/components/owner/OwnerAvailabilityCalendar";
import {
  defaultPropulsionForVesselType,
  normalizePropulsion,
  normalizeVesselType,
  propulsionLabel,
  vesselTypeLabel,
  type Propulsion,
  type PublicLang,
  type VesselType,
} from "@/lib/boatClassification";

type DashboardCopy = {
  ownerDashboard: string;
  signedInAs: string;
  manageBoatListings: string;
  logout: string;
  addMotorBoatRent: string;
  addSailBoatRent: string;
  addCatamaranRent: string;
  addMotorBoatSale: string;
  addSailBoatSale: string;
  addCatamaranSale: string;
  loading: string;
  activeBookings: string;
  activeHolds: string;
  recentActivity: string;
  published: string;
  listingSavedForReview: string;
  ready: string;
  notReady: string;
  dateNotSet: string;

  myBoats: string;
  bookingEnabled: string;
  bookingDisabled: string;
  noBoatsYet: string;

  recentBookingActivity: string;
  noRecentBookingActivity: string;

  confirm: string;
  confirming: string;
  decline: string;
  declining: string;

  bookingCalendar: string;
  noBookingCalendarEntries: string;

  occupancyOverview: string;
  noActiveOccupancy: string;

  myDocuments: string;
  passport: string;
  identityDocument: string;
  license: string;
  uploaded: string;
  notUploaded: string;
  optional: string;
  upload: string;
  uploading: string;
  documentUploadSuccess: string;
  documentUploadFailed: string;
  chooseFile: string;
  profile: string;
  saveProfile: string;
  profileSaved: string;
  security: string;
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
  changePassword: string;
  passwordChanged: string;
  passwordRequirements: string;
  moderationStatus: string;
  adminComment: string;
  submitForReview: string;
  resubmitForReview: string;
  submittedForReview: string;
  listingSetup: string;
  listingSetupIntro: string;
  basicInformation: string;
  photos: string;
  documents: string;
  routes: string;
  availabilityCalendar: string;
  submitReviewStep: string;
  openStep: string;
  selectedBoat: string;
  selectBoat: string;
  boatAvailability: string;
  noBoatForRoutes: string;
  boatNotAssigned: string;
  routeDraft: string;
  routePublished: string;
  routeHiddenUntilReview: string;
  ownerRoutes: string;
  noRoutesYet: string;
  routeLimitReached: string;
  routePhotoUploading: string;
  routePhotoHelp: string;
  saveRoute: string;
  closedDates: string;
  refresh: string;
  reason: string;
  optionalInternalReason: string;
  addClosedDate: string;
  noClosedDates: string;
  delete: string;
  loadingRoutes: string;
  loadingCalendar: string;
  selectStartEndDate: string;
  upcomingBookings: string;
  upcomingHolds: string;
  expiredEntries: string;
  hold: string;
  confirmed: string;
  declined: string;
  expired: string;
  unknown: string;
  booked: string;
  start: string;
  end: string;
  booking: string;
  ownerDecision: string;
  paymentIntent: string;
  yes: string;
  no: string;
  documentsNotUploaded: string;
  documentsAwaitingReview: string;
  documentsVerified: string;
  documentsRejected: string;
  documentRequirementHelp: string;
  verification: string;
  newProfile: string;
};

function pageCopy(lang: string): DashboardCopy {
  if (lang === "ru") {
    return {
      ownerDashboard: "Кабинет владельца",
      signedInAs: "Вход выполнен как",
      manageBoatListings: "Управляйте своими объявлениями лодок",
      logout: "Выйти",
      addMotorBoatRent: "Добавить моторную лодку в аренду",
      addSailBoatRent: "Добавить парусную лодку в аренду",
      addCatamaranRent: "Добавить катамаран в аренду",
      addMotorBoatSale: "Добавить моторную лодку на продажу",
      addSailBoatSale: "Добавить парусную лодку на продажу",
      addCatamaranSale: "Добавить катамаран на продажу",
      loading: "Загрузка...",
      activeBookings: "Активные бронирования",
      activeHolds: "Активные удержания",
      recentActivity: "Недавняя активность",
      published: "Опубликовано",
      listingSavedForReview: "Сохранено для проверки",
      ready: "Готово",
      notReady: "Не готово",
      dateNotSet: "Дата не указана",

      myBoats: "Мои лодки",
      bookingEnabled: "Бронирование включено",
      bookingDisabled: "Бронирование выключено",
      noBoatsYet: "У вас пока нет лодок.",

      recentBookingActivity: "Недавняя активность бронирований",
      noRecentBookingActivity: "Пока нет активности бронирований.",

      confirm: "Подтвердить",
      confirming: "Подтверждение...",
      decline: "Отклонить",
      declining: "Отклонение...",

      bookingCalendar: "Календарь бронирований",
      noBookingCalendarEntries: "Пока нет записей календаря.",

      occupancyOverview: "Обзор загрузки",
      noActiveOccupancy: "Пока нет активной загрузки.",

      myDocuments: "Мои документы",
      passport: "Паспорт",
      identityDocument: "Документ, удостоверяющий личность",
      license: "Лицензия",
      uploaded: "Загружено",
      notUploaded: "Не загружено",
      optional: "необязательно",
      upload: "Загрузить",
      uploading: "Загрузка...",
      documentUploadSuccess: "Документ загружен.",
      documentUploadFailed: "Не удалось загрузить документ.",
      chooseFile: "Выберите файл",
      profile: "Профиль",
      saveProfile: "Сохранить профиль",
      profileSaved: "Профиль сохранён.",
      security: "Безопасность",
      currentPassword: "Текущий пароль",
      newPassword: "Новый пароль",
      repeatPassword: "Повторите пароль",
      changePassword: "Сменить пароль",
      passwordChanged: "Пароль изменён. Войдите заново.",
      passwordRequirements: "Минимум 10 символов, строчные и заглавные буквы, цифра.",
      moderationStatus: "Статус проверки",
      adminComment: "Комментарий администратора",
      submitForReview: "Отправить на проверку",
      resubmitForReview: "Отправить повторно",
      submittedForReview: "Отправлено на проверку.",
      listingSetup: "Настройка объявления",
      listingSetupIntro: "Продолжите настройку выбранной лодки в уже существующих разделах кабинета владельца.",
      basicInformation: "Основные данные",
      photos: "Фотографии",
      documents: "Документы",
      routes: "Маршруты",
      availabilityCalendar: "Календарь доступности",
      submitReviewStep: "Отправка на проверку",
      openStep: "Открыть",
      selectedBoat: "Выбранная лодка",
      selectBoat: "Выбрать лодку",
      boatAvailability: "Доступность лодки",
      noBoatForRoutes: "Сначала добавьте лодку. После сохранения вы сможете создать маршруты.",
      boatNotAssigned: "Лодка не указана",
      routeDraft: "Черновик",
      routePublished: "Опубликовано",
      routeHiddenUntilReview: "Маршрут останется скрытым до проверки и публикации администратором.",
      ownerRoutes: "Маршруты владельца",
      noRoutesYet: "Маршруты ещё не добавлены",
      routeLimitReached: "Достигнут лимит 3 маршрута",
      routePhotoUploading: "Фото загружается...",
      routePhotoHelp: "Можно добавить одно фото маршрута",
      saveRoute: "Сохранить маршрут",
      closedDates: "Закрытые даты",
      refresh: "Обновить",
      reason: "Причина",
      optionalInternalReason: "Необязательная внутренняя причина",
      addClosedDate: "Добавить закрытую дату",
      noClosedDates: "Нет закрытых дат",
      delete: "Удалить",
      loadingRoutes: "Загрузка маршрутов...",
      loadingCalendar: "Загрузка...",
      selectStartEndDate: "Выберите дату начала и окончания.",
      upcomingBookings: "Предстоящие бронирования",
      upcomingHolds: "Предстоящие удержания требуют внимания",
      expiredEntries: "Истёкшие записи",
      hold: "Удержание",
      confirmed: "Подтверждено",
      declined: "Отклонено",
      expired: "Истекло",
      unknown: "Неизвестно",
      booked: "Забронировано",
      start: "Начало",
      end: "Окончание",
      booking: "Бронирование",
      ownerDecision: "Решение владельца",
      paymentIntent: "Платёж",
      yes: "да",
      no: "нет",
      documentsNotUploaded: "Документы не загружены",
      documentsAwaitingReview: "Документы ожидают проверки",
      documentsVerified: "Документы подтверждены",
      documentsRejected: "Документы отклонены",
      documentRequirementHelp: "Загрузите паспорт или документ, удостоверяющий личность. Лицензию можно добавить отдельно, если она применима.",
      verification: "Проверка",
      newProfile: "Новый профиль",
    };
  }

  if (lang === "me") {
    return {
      ownerDashboard: "Kontrolna tabla vlasnika",
      signedInAs: "Prijavljen kao",
      manageBoatListings: "Upravljajte svojim oglasima plovila",
      logout: "Odjava",
      addMotorBoatRent: "Dodaj motorno plovilo za najam",
      addSailBoatRent: "Dodaj jedrilicu za najam",
      addCatamaranRent: "Dodaj katamaran za najam",
      addMotorBoatSale: "Dodaj motorno plovilo za prodaju",
      addSailBoatSale: "Dodaj jedrilicu za prodaju",
      addCatamaranSale: "Dodaj katamaran za prodaju",
      loading: "Učitavanje...",
      activeBookings: "Aktivne rezervacije",
      activeHolds: "Aktivna zadržavanja",
      recentActivity: "Nedavne aktivnosti",
      published: "Objavljeno",
      listingSavedForReview: "Sačuvano za pregled",
      ready: "Spremno",
      notReady: "Nije spremno",
      dateNotSet: "Datum nije postavljen",

      myBoats: "Moja plovila",
      bookingEnabled: "Rezervacije omogućene",
      bookingDisabled: "Rezervacije onemogućene",
      noBoatsYet: "Još nemate plovila.",

      recentBookingActivity: "Nedavne aktivnosti rezervacija",
      noRecentBookingActivity: "Još nema aktivnosti rezervacija.",

      confirm: "Potvrdi",
      confirming: "Potvrđivanje...",
      decline: "Odbij",
      declining: "Odbijanje...",

      bookingCalendar: "Kalendar rezervacija",
      noBookingCalendarEntries: "Još nema unosa u kalendaru.",

      occupancyOverview: "Pregled zauzetosti",
      noActiveOccupancy: "Još nema aktivne zauzetosti.",

      myDocuments: "Moji dokumenti",
      passport: "Pasoš",
      identityDocument: "Identifikacioni dokument",
      license: "Licenca",
      uploaded: "Učitano",
      notUploaded: "Nije učitano",
      optional: "opciono",
      upload: "Učitaj",
      uploading: "Učitavanje...",
      documentUploadSuccess: "Dokument je učitan.",
      documentUploadFailed: "Dokument nije učitan.",
      chooseFile: "Izaberite fajl",
      profile: "Profil",
      saveProfile: "Sačuvaj profil",
      profileSaved: "Profil je sačuvan.",
      security: "Sigurnost",
      currentPassword: "Trenutna lozinka",
      newPassword: "Nova lozinka",
      repeatPassword: "Ponovite lozinku",
      changePassword: "Promijeni lozinku",
      passwordChanged: "Lozinka je promijenjena. Prijavite se ponovo.",
      passwordRequirements: "Najmanje 10 znakova, mala i velika slova i broj.",
      moderationStatus: "Status provjere",
      adminComment: "Komentar administratora",
      submitForReview: "Pošalji na provjeru",
      resubmitForReview: "Pošalji ponovo",
      submittedForReview: "Poslato na provjeru.",
      listingSetup: "Podešavanje oglasa",
      listingSetupIntro: "Nastavite podešavanje izabranog plovila u postojećim sekcijama kabineta vlasnika.",
      basicInformation: "Osnovni podaci",
      photos: "Fotografije",
      documents: "Dokumenti",
      routes: "Rute",
      availabilityCalendar: "Kalendar dostupnosti",
      submitReviewStep: "Pošalji na provjeru",
      openStep: "Otvori",
      selectedBoat: "Izabrano plovilo",
      selectBoat: "Izaberite plovilo",
      boatAvailability: "Dostupnost plovila",
      noBoatForRoutes: "Prvo dodajte plovilo. Nakon čuvanja možete kreirati rute.",
      boatNotAssigned: "Plovilo nije povezano",
      routeDraft: "Nacrt",
      routePublished: "Objavljeno",
      routeHiddenUntilReview: "Ruta ostaje sakrivena dok je administrator ne pregleda i objavi.",
      ownerRoutes: "Rute vlasnika",
      noRoutesYet: "Rute još nisu dodate",
      routeLimitReached: "Dostignut je limit od 3 rute",
      routePhotoUploading: "Fotografija se učitava...",
      routePhotoHelp: "Možete dodati jednu fotografiju rute",
      saveRoute: "Sačuvaj rutu",
      closedDates: "Zatvoreni datumi",
      refresh: "Osvježi",
      reason: "Razlog",
      optionalInternalReason: "Opcioni interni razlog",
      addClosedDate: "Dodaj zatvoreni datum",
      noClosedDates: "Nema zatvorenih datuma",
      delete: "Obriši",
      loadingRoutes: "Učitavanje ruta...",
      loadingCalendar: "Učitavanje...",
      selectStartEndDate: "Izaberite početni i završni datum.",
      upcomingBookings: "Predstojeće rezervacije",
      upcomingHolds: "Predstojeća zadržavanja zahtijevaju pažnju",
      expiredEntries: "Istekli unosi",
      hold: "Zadržavanje",
      confirmed: "Potvrđeno",
      declined: "Odbijeno",
      expired: "Isteklo",
      unknown: "Nepoznato",
      booked: "Rezervisano",
      start: "Početak",
      end: "Kraj",
      booking: "Rezervacija",
      ownerDecision: "Odluka vlasnika",
      paymentIntent: "Plaćanje",
      yes: "da",
      no: "ne",
      documentsNotUploaded: "Dokumenti nisu otpremljeni",
      documentsAwaitingReview: "Dokumenti čekaju provjeru",
      documentsVerified: "Dokumenti su potvrđeni",
      documentsRejected: "Dokumenti su odbijeni",
      documentRequirementHelp: "Otpremite pasoš ili identifikacioni dokument. Licencu možete dodati posebno ako je primjenjivo.",
      verification: "Provjera",
      newProfile: "Novi profil",
    };
  }

  return {
    ownerDashboard: "Owner dashboard",
    signedInAs: "Signed in as",
    manageBoatListings: "Manage your boat listings",
    logout: "Log out",
    addMotorBoatRent: "Add motor boat for rent",
    addSailBoatRent: "Add sail boat for rent",
    addCatamaranRent: "Add catamaran for rent",
    addMotorBoatSale: "Add motor boat for sale",
    addSailBoatSale: "Add sail boat for sale",
    addCatamaranSale: "Add catamaran for sale",
    loading: "Loading...",
    activeBookings: "Active bookings",
    activeHolds: "Active holds",
    recentActivity: "Recent activity",
    published: "Published",
    listingSavedForReview: "Listing saved for review",
    ready: "Ready",
    notReady: "Not ready",
    dateNotSet: "Date not set",

    myBoats: "My boats",
    bookingEnabled: "Booking enabled",
    bookingDisabled: "Booking disabled",
    noBoatsYet: "You have no boats yet.",

    recentBookingActivity: "Recent booking activity",
    noRecentBookingActivity: "No recent booking activity yet.",

    confirm: "Confirm",
    confirming: "Confirming...",
    decline: "Decline",
    declining: "Declining...",

    bookingCalendar: "Booking Calendar",
    noBookingCalendarEntries: "No booking calendar entries yet.",

    occupancyOverview: "Occupancy overview",
    noActiveOccupancy: "No active occupancy yet.",

    myDocuments: "My documents",
    passport: "Passport",
    identityDocument: "Identity document",
    license: "License",
    uploaded: "uploaded",
    notUploaded: "not uploaded",
    optional: "optional",
    upload: "Upload",
    uploading: "Uploading...",
    documentUploadSuccess: "Document uploaded.",
    documentUploadFailed: "Document upload failed.",
    chooseFile: "Choose file",
    profile: "Profile",
    saveProfile: "Save profile",
    profileSaved: "Profile saved.",
    security: "Security",
    currentPassword: "Current password",
    newPassword: "New password",
    repeatPassword: "Repeat password",
    changePassword: "Change password",
    passwordChanged: "Password changed. Sign in again.",
    passwordRequirements: "At least 10 characters, lowercase and uppercase letters, and a number.",
    moderationStatus: "Review status",
    adminComment: "Admin comment",
    submitForReview: "Submit for review",
    resubmitForReview: "Resubmit",
    submittedForReview: "Submitted for review.",
    listingSetup: "Listing setup",
    listingSetupIntro: "Continue setting up the selected boat in the existing owner dashboard sections.",
    basicInformation: "Basic information",
    photos: "Photos",
    documents: "Documents",
    routes: "Routes",
    availabilityCalendar: "Availability calendar",
    submitReviewStep: "Submit for review",
    openStep: "Open",
    selectedBoat: "Selected boat",
    selectBoat: "Select boat",
    boatAvailability: "Boat availability",
    noBoatForRoutes: "Add a boat first. You can create routes after saving it.",
    boatNotAssigned: "Boat not assigned",
    routeDraft: "Draft",
    routePublished: "Published",
    routeHiddenUntilReview: "The route stays hidden until an administrator reviews and publishes it.",
    ownerRoutes: "Owner routes",
    noRoutesYet: "No routes added yet",
    routeLimitReached: "Maximum 3 routes reached",
    routePhotoUploading: "Uploading photo...",
    routePhotoHelp: "You can add one route photo",
    saveRoute: "Save route",
    closedDates: "Closed dates",
    refresh: "Refresh",
    reason: "Reason",
    optionalInternalReason: "Optional internal reason",
    addClosedDate: "Add closed date",
    noClosedDates: "No closed dates",
    delete: "Delete",
    loadingRoutes: "Loading routes...",
    loadingCalendar: "Loading...",
    selectStartEndDate: "Select start and end date.",
    upcomingBookings: "Upcoming bookings",
    upcomingHolds: "Upcoming holds requiring attention",
    expiredEntries: "Expired entries",
    hold: "Hold",
    confirmed: "Confirmed",
    declined: "Declined",
    expired: "Expired",
    unknown: "Unknown",
    booked: "Booked",
    start: "Start",
    end: "End",
    booking: "Booking",
    ownerDecision: "Owner decision",
    paymentIntent: "Payment intent",
    yes: "yes",
    no: "no",
    documentsNotUploaded: "Documents not uploaded",
    documentsAwaitingReview: "Documents awaiting review",
    documentsVerified: "Documents verified",
    documentsRejected: "Documents rejected",
    documentRequirementHelp: "Upload a passport or identity document. Add a license separately when it applies.",
    verification: "Verification",
    newProfile: "New profile",
  };
}


type OwnerBoat = {
  id?: number;
  documentId?: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  booking_enabled?: boolean | null;
  contacts_visible?: boolean | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  listing_type?: string | null;
  boat_type?: string | null;
  vessel_type?: string | null;
  propulsion?: string | null;
  capacity?: number | null;
  length_m?: number | null;
  year?: number | null;
  engine_hp?: number | null;
  min_rental_hours?: number | null;
  home_marina_id?: number | null;
  home_marina_name?: string | null;
  cover_url?: string | null;
  owner_phone?: string | null;
  currency?: string | null;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  price_per_week?: number | null;
  sale_price?: number | null;
  instant_booking?: boolean | null;
  moderation_status?: string | null;
  moderation_comment?: string | null;
  submitted_for_review_at?: string | null;
  reviewed_at?: string | null;
};

type BookingActivity = {
  id?: number | string | null;
  public_id?: string | null;
  public_token?: string | null;
  status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  slot_start_utc?: string | null;
  slot_end_utc?: string | null;
};

type OccupancyItem = {
  id?: number | string | null;
  public_id?: string | null;
  status?: string | null;
  slot_start_utc?: string | null;
  slot_end_utc?: string | null;
};


type OwnerExperience = {
  id: number;
  documentId?: string | null;
  title?: string | null;
  slug?: string | null;
  duration_hours?: number | string | null;
  price?: number | string | null;
  currency?: string | null;
  short_description?: string | null;
  cover?: {
    id?: number | string | null;
    url?: string | null;
    alternativeText?: string | null;
  } | null;
  publishedAt?: string | null;
  is_active?: boolean | null;
  boat?: {
    id?: number | null;
    documentId?: string | null;
    title?: string | null;
    slug?: string | null;
  } | null;
};

type UploadedOwnerImage = {
  id: number;
  url: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
};

const STRAPI_MEDIA_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL || "https://api.sharmar.me").replace(/\/+$/, "");

type ExperienceFormState = {
  title: string;
  durationHours: string;
  price: string;
  shortDescription: string;
  coverId: number | null;
  coverUrl: string | null;
};

type BoatEditFormState = {
  vesselType: VesselType;
  propulsion: Propulsion;
  title: string;
  description: string;
  capacity: string;
  lengthM: string;
  year: string;
  engineHp: string;
  homeMarinaId: string;
  ownerPhone: string;
  rentPriceHour: string;
  rentPriceDay: string;
  rentPriceWeek: string;
  minRentalHours: string;
  instantBooking: boolean;
};

type FieldErrors = Record<string, string>;

type OwnerBlackout = {
  id: number;
  boat_id: number;
  start_utc: string;
  end_utc: string;
  reason?: string;
  created_at?: string;
};

type BlackoutFormState = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  whatsappNumber: string;
  country: string;
  preferredLanguage: string;
};

type SecurityFormState = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

type OwnerCalendarDisplayType = "hold" | "confirmed" | "declined" | "expired" | "unknown";

type OwnerCalendarEvent = {
  id?: string | null;
  bookingId?: number | string | null;
  boatId?: number | null;
  boatTitle?: string | null;
  status?: string | null;
  startUtc?: string | null;
  endUtc?: string | null;
  publicToken?: string | null;
  hasPaymentIntent?: boolean;
  ownerDecision?: string | null;
  displayType?: OwnerCalendarDisplayType;
};

type CalendarEventGroup = {
  dateKey: string;
  label: string;
  events: OwnerCalendarEvent[];
};

type PaymentSummary = {
  totalConfirmedBookings?: number;
  totalPendingHolds?: number;
  totalDeclinedRequests?: number;
  totalSuccessfulPayments?: number;
  totalFailedPayments?: number;
  totalRefundRelatedRequests?: number;
  latestPaymentStatus?: string | null;
  latestBookingStatus?: string | null;
};

type PaymentHealth = {
  paymentLifecycleReady?: boolean;
  overlapProtectionActive?: boolean;
  ownerActionsActive?: boolean;
  notificationLifecycleActive?: boolean;
  whatsappDryRunReady?: boolean;
  retryFoundationReady?: boolean;
  idempotencyReady?: boolean;
};

type PaymentOperationalFlags = {
  requiresManualMonitoring?: boolean;
  retryQueueNotPersistentYet?: boolean;
  whatsappLiveDisabled?: boolean;
};

type EnterpriseOperationalReadiness = {
  queueFoundationReady?: boolean;
  reconciliationFoundationReady?: boolean;
  monitoringFoundationPrepared?: boolean;
  enterpriseScalingFoundationReady?: boolean;
};

type OwnerDocumentType = "passport" | "identity" | "license";

type OwnerDocumentStatus = {
  passport_uploaded?: boolean;
  identity_uploaded?: boolean;
  license_uploaded?: boolean;
};

type OwnerProfile = {
  id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  whatsapp_number?: string | null;
  phone?: string | null;
  company_name?: string | null;
  country?: string | null;
  preferred_language?: string | null;
  email_verified?: boolean | null;
  whatsapp_verified?: boolean | null;
  verification_status?: string | null;
  passport_document?: unknown;
  identity_document?: unknown;
  license_document?: unknown;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  owner?: {
    id?: number | null;
    username?: string | null;
    email?: string | null;
  };
  ownerProfile?: OwnerProfile | null;
  ownerDocumentStatus?: OwnerDocumentStatus;
  boats?: OwnerBoat[];
  activeBookings?: OccupancyItem[];
  activeHolds?: OccupancyItem[];
  recentActivity?: BookingActivity[];
  ownerCalendarEvents?: OwnerCalendarEvent[];
  paymentSummary?: PaymentSummary;
  paymentHealth?: PaymentHealth;
  paymentOperationalFlags?: PaymentOperationalFlags;
  enterpriseOperationalReadiness?: EnterpriseOperationalReadiness;
};

function moderationLabel(status: string | null | undefined, lang: string): string {
  const labels = {
    en: {
      draft: "Draft",
      submitted: "Submitted",
      under_review: "Under review",
      needs_changes: "Needs changes",
      approved: "Approved",
      published: "Published",
      rejected: "Rejected",
      archived: "Archived",
    },
    ru: {
      draft: "Черновик",
      submitted: "Отправлено",
      under_review: "На проверке",
      needs_changes: "Нужны правки",
      approved: "Одобрено",
      published: "Опубликовано",
      rejected: "Отклонено",
      archived: "Архив",
    },
    me: {
      draft: "Nacrt",
      submitted: "Poslato",
      under_review: "U provjeri",
      needs_changes: "Potrebne izmjene",
      approved: "Odobreno",
      published: "Objavljeno",
      rejected: "Odbijeno",
      archived: "Arhiva",
    },
  } as const;
  const safeLang = lang === "ru" || lang === "me" ? lang : "en";
  const key = (status || "draft") as keyof typeof labels.en;
  return labels[safeLang][key] || labels[safeLang].draft;
}

function statusLabel(boat: OwnerBoat, lang: string) {
  return moderationLabel(boat.moderation_status, lang);
}

function statusColor(boat: OwnerBoat) {
  if (boat.moderation_status === "published" || boat.booking_enabled === true) return "rgba(22,163,74,0.18)";
  if (boat.moderation_status === "needs_changes" || boat.moderation_status === "rejected") return "rgba(220,38,38,0.16)";
  if (boat.moderation_status === "submitted" || boat.moderation_status === "under_review") return "rgba(59,130,246,0.16)";
  return "rgba(234,179,8,0.18)";
}

function bookingActionKey(booking: BookingActivity, index: number) {
  return booking.public_token || booking.public_id || String(booking.id ?? index);
}

function verificationLabel(status?: string | null, lang: string = "en") {
  const labels = {
    ru: {
      new: "Новый профиль",
      email_verified: "Email подтверждён",
      whatsapp_verified: "WhatsApp подтверждён",
      documents_uploaded: "Документы загружены",
      under_review: "Проверяется",
      approved: "Проверен",
      rejected: "Отклонён",
      blocked: "Заблокирован",
    },
    me: {
      new: "Novi profil",
      email_verified: "Email potvrđen",
      whatsapp_verified: "WhatsApp potvrđen",
      documents_uploaded: "Dokumenti učitani",
      under_review: "U obradi",
      approved: "Provjeren",
      rejected: "Odbijen",
      blocked: "Blokiran",
    },
    en: {
      new: "New profile",
      email_verified: "Email verified",
      whatsapp_verified: "WhatsApp verified",
      documents_uploaded: "Documents uploaded",
      under_review: "Under review",
      approved: "Verified",
      rejected: "Rejected",
      blocked: "Blocked",
    },
  } as const;

  const safeLang = lang === "ru" || lang === "me" || lang === "en" ? lang : "en";
  return labels[safeLang]?.[status as keyof typeof labels.en] || labels[safeLang].new;
}

function documentReviewLabel(data: ApiPayload | null, lang: string): string {
  const copy = pageCopy(lang);
  const status = data?.ownerProfile?.verification_status || "new";
  const hasRequiredDocument = isDocumentUploaded(data, "passport") || isDocumentUploaded(data, "identity");

  if (!hasRequiredDocument) return copy.documentsNotUploaded;
  if (status === "approved") return copy.documentsVerified;
  if (status === "rejected" || status === "blocked") return copy.documentsRejected;
  return copy.documentsAwaitingReview;
}

function getCalendarTimeMs(event: OwnerCalendarEvent): number {
  const raw = event.startUtc || event.endUtc || "";
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function getCalendarDateKey(event: OwnerCalendarEvent): string {
  const raw = event.startUtc || event.endUtc || "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "unscheduled";
  return new Date(ms).toISOString().slice(0, 10);
}

function formatCalendarDateLabel(dateKey: string, lang: string): string {
  if (dateKey === "unscheduled") return pageCopy(lang).dateNotSet;

  const ms = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return dateKey;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

function normalizeMediaUrl(url?: string | null): string | null {
  const clean = typeof url === "string" ? url.trim() : "";
  if (!clean) return null;

  try {
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return new URL(clean).toString();
    }

    if (clean.startsWith("/")) {
      return new URL(clean, STRAPI_MEDIA_BASE).toString();
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeOwnerExperience(experience: OwnerExperience): OwnerExperience {
  const coverUrl = normalizeMediaUrl(experience.cover?.url);

  return {
    ...experience,
    cover: coverUrl
      ? {
          ...experience.cover,
          url: coverUrl,
        }
      : null,
  };
}

function groupCalendarEvents(events: OwnerCalendarEvent[], lang: string): CalendarEventGroup[] {
  const sorted = [...events].sort((a, b) => getCalendarTimeMs(a) - getCalendarTimeMs(b));
  const groups = new Map<string, OwnerCalendarEvent[]>();

  sorted.forEach((event) => {
    const key = getCalendarDateKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return Array.from(groups.entries()).map(([dateKey, groupEvents]) => ({
    dateKey,
    label: formatCalendarDateLabel(dateKey, lang),
    events: groupEvents,
  }));
}

function calendarBadgeLabel(displayType: OwnerCalendarDisplayType | undefined, lang: string): string {
  const copy = pageCopy(lang);
  if (displayType === "hold") return copy.hold;
  if (displayType === "confirmed") return copy.confirmed;
  if (displayType === "declined") return copy.declined;
  if (displayType === "expired") return copy.expired;
  return copy.unknown;
}

function calendarBadgeBackground(displayType?: OwnerCalendarDisplayType): string {
  if (displayType === "hold") return "rgba(234,179,8,0.18)";
  if (displayType === "confirmed") return "rgba(22,163,74,0.18)";
  if (displayType === "declined") return "rgba(220,38,38,0.18)";
  if (displayType === "expired") return "rgba(148,163,184,0.18)";
  return "rgba(255,255,255,0.08)";
}


function formatOwnerBlackoutDate(value: string | null | undefined, lang: string): string {
  if (!value) return "—";

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

function formatOwnerBlackoutTime(value: string | null | undefined, lang: string): string {
  if (!value) return "—";

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ms));
}

function formatOwnerBlackoutRange(blackout: OwnerBlackout, lang: string): string {
  const startDate = formatOwnerBlackoutDate(blackout.start_utc, lang);
  const startTime = formatOwnerBlackoutTime(blackout.start_utc, lang);
  const endTime = formatOwnerBlackoutTime(blackout.end_utc, lang);

  return `${startDate}, ${startTime}–${endTime}`;
}

function buildBlackoutIso(date: string, time: string): string {
  const cleanDate = String(date || "").trim();
  const cleanTime = String(time || "").trim();

  if (!cleanDate || !cleanTime) return "";

  const value = new Date(`${cleanDate}T${cleanTime}:00.000Z`).toISOString();
  return value;
}

function isUpcomingCalendarEvent(event: OwnerCalendarEvent): boolean {
  const raw = event.startUtc || event.endUtc || "";
  const timeMs = Date.parse(raw);
  return Number.isFinite(timeMs) && timeMs >= Date.now();
}

function documentStatusKey(documentType: OwnerDocumentType): keyof OwnerDocumentStatus {
  if (documentType === "passport") return "passport_uploaded";
  if (documentType === "identity") return "identity_uploaded";
  return "license_uploaded";
}

function documentProfileKey(documentType: OwnerDocumentType): keyof OwnerProfile {
  if (documentType === "passport") return "passport_document";
  if (documentType === "identity") return "identity_document";
  return "license_document";
}

function hasProfileDocument(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.id !== undefined) return Boolean(record.id);
    if (Array.isArray(record.data)) return record.data.length > 0;
    if (record.data && typeof record.data === "object") return Object.keys(record.data).length > 0;
  }

  return false;
}

function isDocumentUploaded(data: ApiPayload | null, documentType: OwnerDocumentType): boolean {
  const normalized = data?.ownerDocumentStatus?.[documentStatusKey(documentType)];
  if (typeof normalized === "boolean") return normalized;

  return hasProfileDocument(data?.ownerProfile?.[documentProfileKey(documentType)]);
}

function boatSetupAnchor(boat: OwnerBoat, suffix: string): string {
  const raw = boat.documentId || String(boat.id || boat.slug || "boat");
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `owner-boat-${safe}-${suffix}`;
}

function boatHasBasicInformation(boat: OwnerBoat): boolean {
  return Boolean(
    boat.title?.trim() &&
    boat.capacity &&
    boat.owner_phone?.trim() &&
    (boat.price_per_hour || boat.price_per_day || boat.price_per_week || boat.sale_price)
  );
}

function boatHasPhotos(boat: OwnerBoat): boolean {
  return Boolean(boat.cover_url?.trim());
}

function ownerHasRequiredDocuments(data: ApiPayload | null): boolean {
  return isDocumentUploaded(data, "passport") || isDocumentUploaded(data, "identity");
}

function boatSubmittedForReview(boat: OwnerBoat): boolean {
  return ["submitted", "under_review", "approved", "published"].includes(boat.moderation_status || "");
}

export default function OwnerDashboardClient() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  const displayLang: PublicLang = lang === "ru" || lang === "me" ? lang : "en";
  const sourceLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const copy = pageCopy(lang);

  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [documentFiles, setDocumentFiles] = useState<Partial<Record<OwnerDocumentType, File | null>>>({});
  const [documentUploading, setDocumentUploading] = useState<Partial<Record<OwnerDocumentType, boolean>>>({});
  const [documentSuccess, setDocumentSuccess] = useState<Partial<Record<OwnerDocumentType, string>>>({});
  const [documentError, setDocumentError] = useState<Partial<Record<OwnerDocumentType, string>>>({});

  const [boatBlackouts, setBoatBlackouts] = useState<Record<number, OwnerBlackout[]>>({});
  const [blackoutLoading, setBlackoutLoading] = useState<Record<number, boolean>>({});
  const [blackoutError, setBlackoutError] = useState<Record<number, string>>({});
  const [blackoutBusy, setBlackoutBusy] = useState<Record<number, boolean>>({});
  const [blackoutForm, setBlackoutForm] = useState<Record<number, BlackoutFormState>>({});

  const [boatExperiences, setBoatExperiences] = useState<Record<string, OwnerExperience[]>>({});
  const [experienceLoading, setExperienceLoading] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [experienceBusy, setExperienceBusy] = useState<Record<number, boolean>>({});
  const [experienceUploadBusy, setExperienceUploadBusy] = useState<Record<number, boolean>>({});
  const [experienceForm, setExperienceForm] = useState<Record<number, ExperienceFormState>>({});
  const [experienceEditForm, setExperienceEditForm] = useState<Record<string, ExperienceFormState>>({});
  const [experienceDeletePending, setExperienceDeletePending] = useState<Record<string, boolean>>({});
  const [experienceFieldErrors, setExperienceFieldErrors] = useState<Record<number, FieldErrors>>({});
  const [editingBoatDocumentId, setEditingBoatDocumentId] = useState<string | null>(null);
  const [boatEditForm, setBoatEditForm] = useState<Record<string, BoatEditFormState>>({});
  const [boatEditSaving, setBoatEditSaving] = useState<Record<string, boolean>>({});
  const [boatEditError, setBoatEditError] = useState<Record<string, string>>({});
  const [boatEditFieldErrors, setBoatEditFieldErrors] = useState<Record<string, FieldErrors>>({});
  const [boatEditSuccess, setBoatEditSuccess] = useState<Record<string, string>>({});
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [securityForm, setSecurityForm] = useState<SecurityFormState>({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState<Record<string, boolean>>({});
  const [reviewMessage, setReviewMessage] = useState<Record<string, string>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});
  const [createdBoatParam, setCreatedBoatParam] = useState<string | null>(null);
  const [selectedBoatRef, setSelectedBoatRef] = useState<string | null>(null);



  
  async function loadBlackoutsForBoat(boatId: number) {
    try {
      setBlackoutLoading((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch(`/api/owner/blackouts?boat_id=${boatId}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "blackout_load_failed");
      }

      setBoatBlackouts((prev) => ({
        ...prev,
        [boatId]: Array.isArray(json?.blackouts) ? json.blackouts : [],
      }));

      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: "",
      }));
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_load_failed",
      }));
    } finally {
      setBlackoutLoading((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }

  async function createBlackoutForBoat(boatId: number) {
    const form = blackoutForm[boatId] || {
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      reason: "",
    };

    const cleanStartDate = String(form.startDate || "").trim();
    const cleanStartTime = String(form.startTime || "09:00").trim();
    const cleanEndDate = String(form.endDate || form.startDate || "").trim();
    const cleanEndTime = String(form.endTime || "17:00").trim();

    if (!cleanStartDate || !cleanEndDate) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: copy.selectStartEndDate,
      }));
      return;
    }

    const startUtc = buildBlackoutIso(cleanStartDate, cleanStartTime);
    const endUtc = buildBlackoutIso(cleanEndDate, cleanEndTime);

    try {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch("/api/owner/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          boat_id: boatId,
          start_utc: startUtc,
          end_utc: endUtc,
          reason: form.reason || "owner_blocked",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "blackout_create_failed");
      }

      setBlackoutForm((prev) => ({
        ...prev,
        [boatId]: {
          startDate: cleanStartDate,
          startTime: cleanStartTime,
          endDate: cleanEndDate,
          endTime: cleanEndTime,
          reason: "",
        },
      }));

      await loadBlackoutsForBoat(boatId);
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_create_failed",
      }));
    } finally {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }

  async function deleteBlackoutForBoat(boatId: number, blackoutId: number) {
    try {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch(`/api/owner/blackouts/${blackoutId}?boat_id=${boatId}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "blackout_delete_failed");
      }

      await loadBlackoutsForBoat(boatId);
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_delete_failed",
      }));
    } finally {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }


  function defaultExperienceForm(): ExperienceFormState {
    return {
      title: "",
      durationHours: "",
      price: "",
      shortDescription: "",
      coverId: null,
      coverUrl: null,
    };
  }

  function experienceToForm(experience: OwnerExperience): ExperienceFormState {
    return {
      title: experience.title ?? "",
      durationHours: experience.duration_hours == null ? "" : String(experience.duration_hours),
      price: experience.price == null ? "" : String(experience.price),
      shortDescription: experience.short_description ?? "",
      coverId: experience.cover?.id == null ? null : Number(experience.cover.id),
      coverUrl: normalizeMediaUrl(experience.cover?.url),
    };
  }

  function defaultBoatEditForm(): BoatEditFormState {
    return {
      vesselType: "motorboat",
      propulsion: "motor",
      title: "",
      description: "",
      capacity: "",
      lengthM: "",
      year: "",
      engineHp: "",
      homeMarinaId: "",
      ownerPhone: "",
      rentPriceHour: "",
      rentPriceDay: "",
      rentPriceWeek: "",
      minRentalHours: "",
      instantBooking: false,
    };
  }

  function profileToForm(profile: OwnerProfile | null | undefined): ProfileFormState {
    return {
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      companyName: profile?.company_name ?? "",
      phone: profile?.phone ?? "",
      whatsappNumber: profile?.whatsapp_number ?? "",
      country: profile?.country ?? "",
      preferredLanguage: profile?.preferred_language ?? (lang === "ru" || lang === "me" ? lang : "en"),
    };
  }

  function boatToEditForm(boat: OwnerBoat): BoatEditFormState {
    const vesselType = normalizeVesselType(boat.vessel_type ?? boat.boat_type);
    return {
      vesselType,
      propulsion: normalizePropulsion(boat.propulsion, vesselType),
      title: boat.title ?? "",
      description: boat.description ?? "",
      capacity: boat.capacity == null ? "" : String(boat.capacity),
      lengthM: boat.length_m == null ? "" : String(boat.length_m),
      year: boat.year == null ? "" : String(boat.year),
      engineHp: boat.engine_hp == null ? "" : String(boat.engine_hp),
      homeMarinaId: boat.home_marina_id == null ? "" : String(boat.home_marina_id),
      ownerPhone: boat.owner_phone ?? "",
      rentPriceHour: boat.price_per_hour == null ? "" : String(boat.price_per_hour),
      rentPriceDay: boat.price_per_day == null ? "" : String(boat.price_per_day),
      rentPriceWeek: boat.price_per_week == null ? "" : String(boat.price_per_week),
      minRentalHours: boat.min_rental_hours == null ? "" : String(boat.min_rental_hours),
      instantBooking: boat.instant_booking === true,
    };
  }

  function getExperienceBoatKey(experience: OwnerExperience): string | null {
    const documentId = experience.boat?.documentId;
    if (typeof documentId === "string" && documentId.trim()) return documentId.trim();

    const id = experience.boat?.id;
    return typeof id === "number" && Number.isFinite(id) ? String(id) : null;
  }

  function getBoatExperienceKey(boat: OwnerBoat): string {
    return boat.documentId || String(boat.id || "");
  }

  function getExperienceStableKey(experience: OwnerExperience): string {
    return experience.documentId?.trim() ? `document:${experience.documentId.trim()}` : `id:${experience.id}`;
  }

  function dedupeOwnerExperiences(rows: OwnerExperience[]): OwnerExperience[] {
    const seen = new Set<string>();

    return rows.filter((experience) => {
      const key = getExperienceStableKey(experience);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function boatFieldFromError(message: string): keyof BoatEditFormState | null {
    const text = message.toLowerCase();
    if (text.includes("title")) return "title";
    if (text.includes("vesseltype")) return "vesselType";
    if (text.includes("propulsion")) return "propulsion";
    if (text.includes("capacity")) return "capacity";
    if (text.includes("lengthm") || text.includes("length")) return "lengthM";
    if (text.includes("year")) return "year";
    if (text.includes("enginehp") || text.includes("engine")) return "engineHp";
    if (text.includes("rentpricehour")) return "rentPriceHour";
    if (text.includes("rentpriceday")) return "rentPriceDay";
    if (text.includes("rentpriceweek")) return "rentPriceWeek";
    if (text.includes("minrentalhours")) return "minRentalHours";
    if (text.includes("saleprice")) return "rentPriceHour";
    if (text.includes("ownerphone")) return "ownerPhone";
    if (text.includes("homemarina")) return "homeMarinaId";
    return null;
  }

  function experienceFieldFromError(message: string): keyof ExperienceFormState | null {
    const text = message.toLowerCase();
    if (text.includes("title")) return "title";
    if (text.includes("duration")) return "durationHours";
    if (text.includes("price")) return "price";
    return null;
  }

  function inputErrorStyle(message?: string): CSSProperties | undefined {
    return message
      ? {
          borderColor: "#dc2626",
          boxShadow: "0 0 0 1px rgba(220, 38, 38, 0.45)",
        }
      : undefined;
  }

  function fieldErrorMessage(message?: string) {
    return message ? (
      <p className="kicker" style={{ margin: 0, color: "#dc2626" }}>
        {message}
      </p>
    ) : null;
  }

  function formatOwnerExperiencePrice(value: unknown): string {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) ? `${Math.round((n + Number.EPSILON) * 100) / 100} EUR` : "—";
  }

  async function saveProfile() {
    const form = profileForm || profileToForm(data?.ownerProfile);
    setProfileBusy(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const res = await fetch("/api/owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          company_name: form.companyName,
          phone: form.phone,
          whatsapp_number: form.whatsappNumber,
          country: form.country,
          preferred_language: form.preferredLanguage,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.code || "profile_update_failed");
      setProfileMessage(pageCopy(lang).profileSaved);
      await refreshDashboard();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "profile_update_failed");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword() {
    setSecurityBusy(true);
    setSecurityMessage(null);
    setSecurityError(null);
    try {
      const res = await fetch("/api/auth/owner-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          current_password: securityForm.currentPassword,
          password: securityForm.password,
          confirm_password: securityForm.confirmPassword,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.code || "password_change_failed");
      setSecurityMessage(pageCopy(lang).passwordChanged);
      setSecurityForm({ currentPassword: "", password: "", confirmPassword: "" });
      setTimeout(() => router.replace(`/${lang}/owner-login`), 900);
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "password_change_failed");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function submitBoatForReview(boat: OwnerBoat) {
    const documentId = boat.documentId;
    if (!documentId) return;
    setReviewBusy((prev) => ({ ...prev, [documentId]: true }));
    setReviewMessage((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
    setReviewError((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
    try {
      const res = await fetch("/api/owner/boats/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ documentId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.code || "submit_for_review_failed");
      setReviewMessage((prev) => ({ ...prev, [documentId]: pageCopy(lang).submittedForReview }));
      await refreshDashboard();
    } catch (err) {
      setReviewError((prev) => ({
        ...prev,
        [documentId]: err instanceof Error ? err.message : "submit_for_review_failed",
      }));
    } finally {
      setReviewBusy((prev) => ({ ...prev, [documentId]: false }));
    }
  }

  async function saveBoatEdit(boat: OwnerBoat) {
    const documentId = boat.documentId;
    if (!documentId) return;

    const form = boatEditForm[documentId] || defaultBoatEditForm();
    const numberOrNull = (value: string, fieldName: keyof BoatEditFormState): number | null => {
      const clean = String(value ?? "").trim();
      if (!clean) return null;

      const n = Number(clean);
      if (!Number.isFinite(n)) {
        throw new Error(`${fieldName} is invalid`);
      }

      return Number.isFinite(n) ? n : null;
    };

    try {
      setBoatEditSaving((prev) => ({ ...prev, [documentId]: true }));
      setBoatEditError((prev) => {
        const next = { ...prev };
        delete next[documentId];
        return next;
      });
      setBoatEditFieldErrors((prev) => {
        const next = { ...prev };
        delete next[documentId];
        return next;
      });
      setBoatEditSuccess((prev) => {
        const next = { ...prev };
        delete next[documentId];
        return next;
      });

      const res = await fetch("/api/owner/boats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          documentId,
          title: form.title,
          description: form.description,
          listingType: boat.listing_type || "rent",
          vesselType: form.vesselType,
          propulsion: form.propulsion,
          capacity: numberOrNull(form.capacity, "capacity"),
          lengthM: numberOrNull(form.lengthM, "lengthM"),
          year: numberOrNull(form.year, "year"),
          engineHp: numberOrNull(form.engineHp, "engineHp"),
          rentPriceHour: numberOrNull(form.rentPriceHour, "rentPriceHour"),
          rentPriceDay: numberOrNull(form.rentPriceDay, "rentPriceDay"),
          rentPriceWeek: numberOrNull(form.rentPriceWeek, "rentPriceWeek"),
          minRentalHours: numberOrNull(form.minRentalHours, "minRentalHours"),
          salePrice: boat.sale_price ?? null,
          ownerPhone: form.ownerPhone,
          homeMarinaId: numberOrNull(form.homeMarinaId, "homeMarinaId"),
          currency: boat.currency || "EUR",
          instantBooking: form.instantBooking,
          locale: lang,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "boat_update_failed");
      }

      setBoatEditSuccess((prev) => ({
        ...prev,
        [documentId]: lang === "ru"
          ? "Изменения сохранены. Отправьте лодку на проверку, когда будете готовы."
          : lang === "me"
            ? "Izmjene su sačuvane. Pošaljite plovilo na provjeru kada bude spremno."
            : "Changes saved. Submit the boat for review when ready.",
      }));

      await refreshDashboard();
      setEditingBoatDocumentId(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "boat_update_failed";
      const field = boatFieldFromError(message);

      setBoatEditError((prev) => ({
        ...prev,
        [documentId]: message,
      }));
      setBoatEditFieldErrors((prev) => ({
        ...prev,
        [documentId]: field ? { [field]: message } : {},
      }));
    } finally {
      setBoatEditSaving((prev) => ({
        ...prev,
        [documentId]: false,
      }));
    }
  }

  async function uploadExperienceCover(boatId: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setExperienceError("Only JPG, PNG and WEBP images are allowed");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setExperienceError("Maximum file size is 8MB");
      return;
    }

    try {
      setExperienceUploadBusy((prev) => ({ ...prev, [boatId]: true }));
      setExperienceError(null);

      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch("/api/owner/uploads", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const json = (await res.json()) as {
        ok?: boolean;
        files?: UploadedOwnerImage[];
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "experience_cover_upload_failed");
      }

      const uploaded = json.files?.[0];

      if (!uploaded?.id || !uploaded.url) {
        throw new Error("experience_cover_upload_failed");
      }

      setExperienceForm((prev) => ({
        ...prev,
        [boatId]: {
          ...(prev[boatId] || defaultExperienceForm()),
          coverId: Number(uploaded.id),
          coverUrl: uploaded.url,
        },
      }));
    } catch (err) {
      setExperienceError(err instanceof Error ? err.message : "experience_cover_upload_failed");
    } finally {
      setExperienceUploadBusy((prev) => ({ ...prev, [boatId]: false }));
    }
  }


  async function loadOwnerExperiences() {
    try {
      setExperienceLoading(true);
      setExperienceError(null);

      const res = await fetch("/api/owner/experiences", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "experience_load_failed");
      }

      const rows: OwnerExperience[] = Array.isArray(json?.experiences)
        ? json.experiences.map(normalizeOwnerExperience)
        : [];
      const grouped: Record<string, OwnerExperience[]> = {};

      dedupeOwnerExperiences(rows).forEach((experience) => {
        const boatKey = getExperienceBoatKey(experience);
        if (!boatKey) return;
        grouped[boatKey] = dedupeOwnerExperiences([...(grouped[boatKey] || []), experience]);
      });

      setBoatExperiences(grouped);
    } catch (err) {
      setExperienceError(err instanceof Error ? err.message : "experience_load_failed");
    } finally {
      setExperienceLoading(false);
    }
  }

  async function createExperienceForBoat(boatId: number) {
    const form = experienceForm[boatId] || defaultExperienceForm();

    try {
      setExperienceBusy((prev) => ({
        ...prev,
        [boatId]: true,
      }));
      setExperienceError(null);
      setExperienceFieldErrors((prev) => {
        const next = { ...prev };
        delete next[boatId];
        return next;
      });

      const res = await fetch("/api/owner/experiences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boatId,
          title: form.title,
          durationHours: Number(form.durationHours),
          price: Number(form.price),
          shortDescription: form.shortDescription,
          coverId: form.coverId,
          locale: sourceLocale,
          sourceLocale,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "experience_create_failed");
      }

      setExperienceForm((prev) => ({
        ...prev,
        [boatId]: defaultExperienceForm(),
      }));

      await loadOwnerExperiences();
    } catch (err) {
      const message = err instanceof Error ? err.message : "experience_create_failed";
      const field = experienceFieldFromError(message);

      setExperienceError(message);
      setExperienceFieldErrors((prev) => ({
        ...prev,
        [boatId]: field ? { [field]: message } : {},
      }));
    } finally {
      setExperienceBusy((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }

  async function updateExperienceForOwner(experience: OwnerExperience): Promise<void> {
    const documentId = String(experience.documentId || "").trim();
    if (!documentId) throw new Error("experience_document_id_missing");
    const key = getExperienceStableKey(experience);
    const form = experienceEditForm[key] || experienceToForm(experience);
    const res = await fetch("/api/owner/experiences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        documentId,
        title: form.title,
        durationHours: Number(form.durationHours),
        price: Number(form.price),
        shortDescription: form.shortDescription,
        coverId: form.coverId,
        locale: sourceLocale,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || "experience_update_failed");
  }

  async function deleteExperienceForOwner(experience: OwnerExperience): Promise<void> {
    const documentId = String(experience.documentId || "").trim();
    if (!documentId) throw new Error("experience_document_id_missing");
    const key = getExperienceStableKey(experience);
    const confirmed = window.confirm(
      lang === "ru" ? `Удалить маршрут «${experience.title || copy.routes}»?` :
      lang === "me" ? `Obrisati rutu „${experience.title || copy.routes}“?` :
      `Delete route “${experience.title || copy.routes}”?`
    );
    if (!confirmed) return;
    setExperienceDeletePending((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/owner/experiences?documentId=${encodeURIComponent(documentId)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "experience_delete_failed");
      await loadOwnerExperiences();
    } finally {
      setExperienceDeletePending((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function saveAllBoatChanges(boat: OwnerBoat) {
    const documentId = boat.documentId;
    if (!documentId) return;
    try {
      setBoatEditSaving((prev) => ({ ...prev, [documentId]: true }));
      setExperienceError(null);
      const experiences = boatExperiences[getBoatExperienceKey(boat)] || [];
      for (const experience of experiences) await updateExperienceForOwner(experience);
      await saveBoatEdit(boat);
      await loadOwnerExperiences();
    } catch (err) {
      setExperienceError(err instanceof Error ? err.message : "save_all_failed");
      setBoatEditSaving((prev) => ({ ...prev, [documentId]: false }));
    }
  }

const boats = useMemo(() => data?.boats ?? [], [data]);
  const selectedBoat = useMemo(() => {
    const target = (selectedBoatRef || createdBoatParam || "").trim();
    if (!target) return boats[0] ?? null;

    const matched = boats.find((boat) => (
      boat.documentId === target ||
      String(boat.id ?? "") === target ||
      boat.slug === target
    ));

    return matched ?? boats[0] ?? null;
  }, [boats, createdBoatParam, selectedBoatRef]);
  const recentActivity = useMemo(() => data?.recentActivity ?? [], [data]);
  const ownerCalendarEvents = useMemo(() => data?.ownerCalendarEvents ?? [], [data]);
  const occupancyItems = useMemo(
    () => [...(data?.activeBookings ?? []), ...(data?.activeHolds ?? [])],
    [data]
  );
  const calendarGroups = useMemo(() => groupCalendarEvents(ownerCalendarEvents, lang), [ownerCalendarEvents, lang]);
  const activeBookingsCount = Array.isArray(data?.activeBookings) ? data.activeBookings.length : 0;
  const activeHoldsCount = Array.isArray(data?.activeHolds) ? data.activeHolds.length : 0;
  const recentActivityCount = Array.isArray(data?.recentActivity) ? data.recentActivity.length : 0;
  const upcomingBookingsCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "confirmed" && isUpcomingCalendarEvent(event)
  ).length;
  const upcomingHoldsCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "hold" && isUpcomingCalendarEvent(event)
  ).length;
  const expiredCalendarCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "expired"
  ).length;

  useEffect(() => {
    const createdBoat = new URLSearchParams(window.location.search).get("createdBoat");
    setCreatedBoatParam(createdBoat);

    if (createdBoat) {
      setSelectedBoatRef(createdBoat);
      return;
    }

    try {
      setSelectedBoatRef(window.localStorage.getItem("sharmar-owner-selected-boat"));
    } catch {
      setSelectedBoatRef(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedBoat) return;

    const stableRef = selectedBoat.documentId || String(selectedBoat.id || selectedBoat.slug || "");
    if (stableRef) {
      try {
        window.localStorage.setItem("sharmar-owner-selected-boat", stableRef);
      } catch {
        // Selection persistence is a convenience; dashboard ownership checks stay server-side.
      }
    }

    const documentId = selectedBoat.documentId || null;
    if (documentId) {
      setBoatEditForm((prev) => ({
        ...prev,
        [documentId]: prev[documentId] || boatToEditForm(selectedBoat),
      }));
    }

    window.setTimeout(() => {
      document.getElementById(boatSetupAnchor(selectedBoat, "card"))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, [selectedBoat]);

  
  useEffect(() => {
    boats.forEach((boat) => {
      if (boat.id) {
        loadBlackoutsForBoat(Number(boat.id));
      }
    });

    loadOwnerExperiences();
  }, [boats]);

useEffect(() => {
    let alive = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/owner/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as ApiPayload | null;

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setError(json?.error || pageCopy(lang).manageBoatListings);
          return;
        }

        setData(json);
      } catch {
        if (alive) setError(pageCopy(lang).manageBoatListings);
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [lang, router]);

  async function logout() {
    await fetch("/api/auth/owner-session", { method: "DELETE" });
    router.replace(`/${lang}/owner-login`);
  }

  async function refreshDashboard() {
    const res = await fetch("/api/owner/dashboard", {
      method: "GET",
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as ApiPayload | null;

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || pageCopy(lang).manageBoatListings);
    }

    setData(json);
  }

  async function runOwnerAction(booking: BookingActivity, index: number, action: "confirm" | "decline") {
    const publicToken = booking.public_token?.trim();
    const key = bookingActionKey(booking, index);

    if (!publicToken) return;

    setProcessingAction((prev) => ({ ...prev, [key]: action }));
    setActionSuccess((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActionError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch(`/api/owner-actions/${encodeURIComponent(publicToken)}/${action}`, {
        method: "POST",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Could not ${action} booking.`);
      }

      setActionSuccess((prev) => ({
        ...prev,
        [key]: action === "confirm" ? pageCopy(lang).activeBookings : pageCopy(lang).activeHolds,
      }));
      await refreshDashboard();
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setProcessingAction((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function uploadOwnerDocument(documentType: OwnerDocumentType) {
    const file = documentFiles[documentType];
    if (!file) {
      setDocumentError((prev) => ({
        ...prev,
        [documentType]: pageCopy(lang).chooseFile,
      }));
      return;
    }

    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file, file.name);

    setDocumentUploading((prev) => ({ ...prev, [documentType]: true }));
    setDocumentSuccess((prev) => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
    setDocumentError((prev) => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });

    try {
      const res = await fetch("/api/owner/documents", {
        method: "POST",
        cache: "no-store",
        body: formData,
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || pageCopy(lang).documentUploadFailed);
      }

      setDocumentSuccess((prev) => ({
        ...prev,
        [documentType]: pageCopy(lang).documentUploadSuccess,
      }));
      setDocumentFiles((prev) => ({
        ...prev,
        [documentType]: null,
      }));
      await refreshDashboard();
    } catch (err) {
      setDocumentError((prev) => ({
        ...prev,
        [documentType]: err instanceof Error ? err.message : pageCopy(lang).documentUploadFailed,
      }));
    } finally {
      setDocumentUploading((prev) => ({
        ...prev,
        [documentType]: false,
      }));
    }
  }

  return (
    <main className="main">
      <div className="container">
        <div className="detail-top">
          <div>
            <h1 className="h1">{pageCopy(lang).ownerDashboard}</h1>
            <p className="kicker" style={{ marginTop: 8 }}>
              {data?.owner?.email ? `${pageCopy(lang).signedInAs} ${data.owner.email}` : pageCopy(lang).manageBoatListings}
            </p>
          </div>

          <button className="button secondary" type="button" onClick={logout}>
            {pageCopy(lang).logout}
          </button>
        </div>

        {!isLoading && !error && data?.ownerProfile ? (
          <div className="card" style={{ marginTop: 18, padding: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>
              {lang === "ru" ? "Статус владельца" : lang === "me" ? "Status vlasnika" : "Owner status"}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                Email: {data.ownerProfile.email_verified ? "✅" : "⏳"}
              </div>
              <div>
                WhatsApp: {data.ownerProfile.whatsapp_verified ? "✅" : "⏳"} {data.ownerProfile.whatsapp_number || ""}
              </div>
              <div>
                {copy.verification}: {verificationLabel(data.ownerProfile.verification_status, lang)}
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && data?.ownerProfile ? (
          <section id="owner-profile" className="card" style={{ marginTop: 18, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{pageCopy(lang).profile}</h2>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 }}>
              {[
                ["firstName", lang === "ru" ? "Имя" : lang === "me" ? "Ime" : "First name"],
                ["lastName", lang === "ru" ? "Фамилия" : lang === "me" ? "Prezime" : "Last name"],
                ["companyName", lang === "ru" ? "Компания" : lang === "me" ? "Kompanija" : "Company"],
                ["phone", lang === "ru" ? "Телефон" : lang === "me" ? "Telefon" : "Phone"],
                ["whatsappNumber", "WhatsApp"],
                ["country", lang === "ru" ? "Страна" : lang === "me" ? "Država" : "Country"],
              ].map(([key, label]) => (
                <label key={key} style={{ display: "grid", gap: 4 }}>
                  <span className="kicker" style={{ margin: 0 }}>{label}</span>
                  <input
                    value={(profileForm || profileToForm(data.ownerProfile))[key as keyof ProfileFormState]}
                    onChange={(event) => setProfileForm((prev) => ({
                      ...(prev || profileToForm(data.ownerProfile)),
                      [key]: event.target.value,
                    }))}
                  />
                </label>
              ))}
              <label style={{ display: "grid", gap: 4 }}>
                <span className="kicker" style={{ margin: 0 }}>{lang === "ru" ? "Язык" : lang === "me" ? "Jezik" : "Language"}</span>
                <select
                  value={(profileForm || profileToForm(data.ownerProfile)).preferredLanguage}
                  onChange={(event) => setProfileForm((prev) => ({
                    ...(prev || profileToForm(data.ownerProfile)),
                    preferredLanguage: event.target.value,
                  }))}
                >
                  <option value="en">EN</option>
                  <option value="ru">RU</option>
                  <option value="me">ME</option>
                </select>
              </label>
            </div>
            {profileMessage ? <p className="kicker" style={{ margin: "10px 0 0", color: "#15803d" }}>{profileMessage}</p> : null}
            {profileError ? <p className="kicker" style={{ margin: "10px 0 0", color: "#b91c1c" }}>{profileError}</p> : null}
            <button className="button secondary" type="button" disabled={profileBusy} onClick={saveProfile} style={{ marginTop: 14 }}>
              {profileBusy ? pageCopy(lang).uploading : pageCopy(lang).saveProfile}
            </button>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section id="owner-security" className="card" style={{ marginTop: 18, padding: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{pageCopy(lang).security}</h2>
            <p className="kicker" style={{ margin: "6px 0 0" }}>{pageCopy(lang).passwordRequirements}</p>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 }}>
              <input
                type="password"
                placeholder={pageCopy(lang).currentPassword}
                value={securityForm.currentPassword}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                autoComplete="current-password"
              />
              <input
                type="password"
                placeholder={pageCopy(lang).newPassword}
                value={securityForm.password}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, password: event.target.value }))}
                autoComplete="new-password"
              />
              <input
                type="password"
                placeholder={pageCopy(lang).repeatPassword}
                value={securityForm.confirmPassword}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                autoComplete="new-password"
              />
            </div>
            {securityMessage ? <p className="kicker" style={{ margin: "10px 0 0", color: "#15803d" }}>{securityMessage}</p> : null}
            {securityError ? <p className="kicker" style={{ margin: "10px 0 0", color: "#b91c1c" }}>{securityError}</p> : null}
            <button className="button secondary" type="button" disabled={securityBusy} onClick={changePassword} style={{ marginTop: 14 }}>
              {securityBusy ? pageCopy(lang).uploading : pageCopy(lang).changePassword}
            </button>
          </section>
        ) : null}

        {!isLoading && !error ? (
          <section id="owner-documents" className="card" style={{ marginTop: 18, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{pageCopy(lang).myDocuments}</h2>
                <p className="kicker" style={{ marginTop: 6 }}>
                  {copy.verification}: {verificationLabel(data?.ownerProfile?.verification_status, lang)}
                </p>
                <p className="kicker" style={{ marginTop: 6 }}>
                  {documentReviewLabel(data, lang)}
                </p>
                <p className="kicker" style={{ marginTop: 6 }}>
                  {copy.documentRequirementHelp}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
              {([
                ["passport", pageCopy(lang).passport],
                ["identity", pageCopy(lang).identityDocument],
                ["license", `${pageCopy(lang).license} (${pageCopy(lang).optional})`],
              ] as [OwnerDocumentType, string][]).map(([documentType, label]) => {
                const uploaded = isDocumentUploaded(data, documentType);
                const busy = Boolean(documentUploading[documentType]);

                return (
                  <div
                    key={documentType}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong>{label}</strong>
                      <span
                        className="pill"
                        style={{
                          background: uploaded ? "rgba(22,163,74,0.18)" : "rgba(234,179,8,0.18)",
                        }}
                      >
                        {uploaded ? pageCopy(lang).uploaded : pageCopy(lang).notUploaded}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        alignItems: "center",
                      }}
                    >
                      <input
                        aria-label={label}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setDocumentFiles((prev) => ({ ...prev, [documentType]: file }));
                        }}
                      />
                      <button
                        className="button secondary"
                        type="button"
                        disabled={busy || !documentFiles[documentType]}
                        onClick={() => uploadOwnerDocument(documentType)}
                      >
                        {busy ? pageCopy(lang).uploading : pageCopy(lang).upload}
                      </button>
                    </div>

                    {documentSuccess[documentType] ? (
                      <p className="kicker" style={{ margin: 0 }}>
                        {documentSuccess[documentType]}
                      </p>
                    ) : null}

                    {documentError[documentType] ? (
                      <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                        {documentError[documentType]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="actions" style={{ marginTop: 18 }}>
          <Link className="button" href={`/${lang}/add/rent/motor`}>
            {pageCopy(lang).addMotorBoatRent}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/rent/sail`}>
            {pageCopy(lang).addSailBoatRent}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/rent/catamaran`}>
            {pageCopy(lang).addCatamaranRent}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/motor`}>
            {pageCopy(lang).addMotorBoatSale}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/sail`}>
            {pageCopy(lang).addSailBoatSale}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/catamaran`}>
            {pageCopy(lang).addCatamaranSale}
          </Link>
        </div>

        {isLoading ? (
          <p className="kicker" style={{ marginTop: 24 }}>{pageCopy(lang).loading}</p>
        ) : null}

        {error ? (
          <div className="card" style={{ marginTop: 24, padding: 18 }}>
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div style={{ marginTop: 26 }}>
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginBottom: 24,
              }}
            >
              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).activeBookings}</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeBookingsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).activeHolds}</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeHoldsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).recentActivity}</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {recentActivityCount}
                </div>
              </div>
            </div>

            <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).myBoats}</h2>

            {selectedBoat ? (
              <section
                className="card"
                style={{
                  marginBottom: 18,
                  padding: 18,
                  border: "1px solid rgba(34,211,238,0.34)",
                  background: "rgba(34,211,238,0.06)",
                }}
                aria-label={copy.listingSetup}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div>
                    <p className="kicker" style={{ margin: 0 }}>{copy.selectedBoat}</p>
                    <h3 style={{ margin: "6px 0 0", fontSize: 20 }}>{copy.listingSetup}</h3>
                    <p className="kicker" style={{ margin: "6px 0 0" }}>
                      {copy.listingSetupIntro}
                    </p>
                  </div>
                  <span className="pill">{selectedBoat.title || `${copy.selectedBoat} #${selectedBoat.id}`}</span>
                </div>

                {boats.length > 1 ? (
                  <label style={{ display: "grid", gap: 6, marginTop: 14 }}>
                    <span className="kicker" style={{ margin: 0 }}>{copy.selectBoat}</span>
                    <select
                      value={selectedBoat.documentId || String(selectedBoat.id || selectedBoat.slug || "")}
                      onChange={(event) => setSelectedBoatRef(event.target.value)}
                    >
                      {boats.map((boat) => {
                        const value = boat.documentId || String(boat.id || boat.slug || "");
                        return (
                          <option key={value} value={value}>
                            {boat.title || `${copy.selectedBoat} #${boat.id}`}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ) : null}

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  {[
                    {
                      label: copy.basicInformation,
                      done: boatHasBasicInformation(selectedBoat),
                      href: `#${boatSetupAnchor(selectedBoat, "edit")}`,
                    },
                    {
                      label: copy.photos,
                      done: boatHasPhotos(selectedBoat),
                      href: `#${boatSetupAnchor(selectedBoat, "edit")}`,
                    },
                    {
                      label: copy.documents,
                      done: ownerHasRequiredDocuments(data),
                      href: "#owner-documents",
                    },
                    {
                      label: copy.routes,
                      done: (boatExperiences[getBoatExperienceKey(selectedBoat)] || []).length > 0,
                      href: `#${boatSetupAnchor(selectedBoat, "routes")}`,
                    },
                    {
                      label: copy.availabilityCalendar,
                      done: (boatBlackouts[Number(selectedBoat.id)] || []).length > 0,
                      href: `#${boatSetupAnchor(selectedBoat, "calendar")}`,
                    },
                    {
                      label: copy.submitReviewStep,
                      done: boatSubmittedForReview(selectedBoat),
                      href: `#${boatSetupAnchor(selectedBoat, "submit-review")}`,
                    },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        textDecoration: "none",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: item.done ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.04)",
                        color: "inherit",
                      }}
                    >
                      <span>{item.done ? "✓" : "○"} {item.label}</span>
                      <span className="kicker" style={{ margin: 0 }}>{copy.openStep}</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {boats.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {boats.map((boat) => (
                  (() => {
                    const boatCoverUrl = normalizeMediaUrl(boat.cover_url);

                    return (
                  <div
                    id={boatSetupAnchor(boat, "card")}
                    key={boat.documentId || boat.id || boat.slug}
                    className="card"
                    style={{
                      padding: 18,
                      display: "grid",
                      gap: 10,
                      border: selectedBoat && (selectedBoat.documentId === boat.documentId || selectedBoat.id === boat.id)
                        ? "1px solid rgba(34,211,238,0.45)"
                        : undefined,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 20 }}>
                          {boat.title || `${copy.selectedBoat} #${boat.id}`}
                        </h3>
                        <p className="kicker" style={{ marginTop: 6 }}>
                          {vesselTypeLabel(boat.vessel_type ?? boat.boat_type, displayLang)} · {propulsionLabel(boat.propulsion, boat.vessel_type ?? boat.boat_type, displayLang)} · {boat.listing_type || "listing"}
                        </p>
                      </div>

                      <span
                        className="pill"
                        style={{
                          alignSelf: "start",
                          background: statusColor(boat),
                        }}
                      >
                        {statusLabel(boat, lang)}
                      </span>
                    </div>

                    <div className="meta-row">
                      <span>ID: {boat.id ?? "—"}</span>
                      <span>·</span>
                      <span>{lang === "ru" ? "Локация" : lang === "me" ? "Lokacija" : "Location"}: {boat.home_marina_name || "—"}</span>
                      <span>·</span>
                      <span>{lang === "ru" ? "Минимум" : lang === "me" ? "Minimum" : "Minimum"}: {boat.min_rental_hours ?? 1} h</span>
                      <span>·</span>
                      <span>{copy.booking}: {boat.booking_enabled ? pageCopy(lang).bookingEnabled : pageCopy(lang).bookingDisabled}</span>
                    </div>

                    <div className="meta-row">
                      <span>{pageCopy(lang).moderationStatus}: {moderationLabel(boat.moderation_status, lang)}</span>
                      {boat.submitted_for_review_at ? (
                        <>
                          <span>·</span>
                          <span>{lang === "ru" ? "Отправлено" : lang === "me" ? "Poslato" : "Submitted"}: {boat.submitted_for_review_at}</span>
                        </>
                      ) : null}
                    </div>

                    {(boat.moderation_status === "needs_changes" || boat.moderation_status === "rejected") && boat.moderation_comment ? (
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          background: "rgba(220,38,38,0.08)",
                          border: "1px solid rgba(220,38,38,0.25)",
                        }}
                      >
                        <strong>{pageCopy(lang).adminComment}</strong>
                        <p className="kicker" style={{ margin: "6px 0 0" }}>{boat.moderation_comment}</p>
                      </div>
                    ) : null}

                    {boat.documentId && !["submitted", "under_review", "approved", "published", "archived"].includes(boat.moderation_status || "draft") ? (
                      <div id={boatSetupAnchor(boat, "submit-review")} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={reviewBusy[boat.documentId] === true}
                          onClick={() => submitBoatForReview(boat)}
                        >
                          {reviewBusy[boat.documentId] === true
                            ? pageCopy(lang).uploading
                            : boat.moderation_status === "needs_changes" || boat.moderation_status === "rejected"
                              ? pageCopy(lang).resubmitForReview
                              : pageCopy(lang).submitForReview}
                        </button>
                        {reviewMessage[boat.documentId] ? <p className="kicker" style={{ margin: 0, color: "#15803d" }}>{reviewMessage[boat.documentId]}</p> : null}
                        {reviewError[boat.documentId] ? <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>{reviewError[boat.documentId]}</p> : null}
                      </div>
                    ) : null}

                    <div className="meta-row">
                      <span>{lang === "ru" ? "Цена/час" : lang === "me" ? "Cijena/sat" : "Price/hour"}: {boat.price_per_hour ?? "—"} {boat.currency || "EUR"}</span>
                      <span>·</span>
                      <span>{lang === "ru" ? "Цена/день" : lang === "me" ? "Cijena/dan" : "Price/day"}: {boat.price_per_day ?? "—"} {boat.currency || "EUR"}</span>
                      <span>·</span>
                      <span>{lang === "ru" ? "Цена/неделя" : lang === "me" ? "Cijena/nedjelja" : "Price/week"}: {boat.price_per_week ?? "—"} {boat.currency || "EUR"}</span>
                    </div>

                    <div className="meta-row">
                      <span>{lang === "ru" ? "Телефон" : lang === "me" ? "Telefon" : "Phone"}: {boat.owner_phone || "—"}</span>
                      <span>·</span>
                      <span>
                        {lang === "ru" ? "Обложка" : lang === "me" ? "Naslovna fotografija" : "Cover"}:{" "}
                        {boatCoverUrl ? (
                          <a href={boatCoverUrl} target="_blank" rel="noreferrer">
                            {boatCoverUrl}
                          </a>
                        ) : "—"}
                      </span>
                    </div>

                    {boat.slug ? (
                      <div style={{ display: "grid", gap: 14 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {boat.booking_enabled ? (
                            <Link className="button secondary" href={`/${lang}/boats/${boat.slug}`}>
                              {lang === "ru" ? "Открыть страницу" : lang === "me" ? "Otvori stranicu" : "View public page"}
                            </Link>
                          ) : null}

                          {boat.documentId ? (
                            <button
                              id={boatSetupAnchor(boat, "edit")}
                              type="button"
                              className={editingBoatDocumentId === boat.documentId ? "button primary" : "button secondary"}
                              onClick={() => {
                                const documentId = boat.documentId || null;
                                if (!documentId) return;

                                setEditingBoatDocumentId((current) => {
                                  if (current === documentId) {
                                    return null;
                                  }

                                  setBoatEditForm((prev) => ({
                                    ...prev,
                                    [documentId]: boatToEditForm(boat),
                                  }));
                                  setExperienceEditForm((prev) => {
                                    const next = { ...prev };
                                    (boatExperiences[getBoatExperienceKey(boat)] || []).forEach((experience) => {
                                      next[getExperienceStableKey(experience)] = experienceToForm(experience);
                                    });
                                    return next;
                                  });
                                  setBoatEditError((prev) => {
                                    const next = { ...prev };
                                    delete next[documentId];
                                    return next;
                                  });
                                  setBoatEditFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[documentId];
                                    return next;
                                  });
                                  setBoatEditSuccess((prev) => {
                                    const next = { ...prev };
                                    delete next[documentId];
                                    return next;
                                  });

                                  return documentId;
                                });
                              }}
                            >
                              {editingBoatDocumentId === boat.documentId
                                ? (lang === "ru" ? "Закрыть редактирование" : lang === "me" ? "Zatvori uređivanje" : "Close edit")
                                : (lang === "ru" ? "Редактировать" : lang === "me" ? "Uredi" : "Edit")}
                            </button>
                          ) : null}
                        </div>

                        {boat.documentId && editingBoatDocumentId === boat.documentId ? (
                          <div
                            className="card"
                            style={{
                              padding: 14,
                              background: "rgba(245, 158, 11, 0.08)",
                              border: "1px solid rgba(245, 158, 11, 0.45)",
                            }}
                          >
                            <strong>{lang === "ru" ? "✏️ Режим редактирования лодки" : lang === "me" ? "✏️ Režim uređivanja plovila" : "✏️ Boat edit mode"}</strong>
                            <p className="kicker" style={{ margin: "6px 0 12px" }}>
                              {lang === "ru"
                                ? "После сохранения лодка снова уйдёт на проверку."
                                : lang === "me"
                                  ? "Nakon čuvanja plovilo ponovo ide na provjeru."
                                  : "After saving, the boat will be sent for review again."}
                            </p>

                            <div style={{ display: "grid", gap: 10 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                                <label style={{ display: "grid", gap: 4 }}>
                                  <span className="kicker" style={{ margin: 0 }}>
                                    {lang === "ru" ? "Тип лодки" : lang === "me" ? "Tip plovila" : "Boat type"}
                                  </span>
                                  <select
                                    value={(boatEditForm[boat.documentId] || defaultBoatEditForm()).vesselType}
                                    onChange={(e) => {
                                      const nextVesselType = normalizeVesselType(e.target.value);
                                      setBoatEditForm((prev) => ({
                                        ...prev,
                                        [boat.documentId!]: {
                                          ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                          vesselType: nextVesselType,
                                          propulsion: nextVesselType === "catamaran"
                                            ? (prev[boat.documentId!]?.propulsion || "sail")
                                            : defaultPropulsionForVesselType(nextVesselType),
                                        },
                                      }));
                                    }}
                                  >
                                    <option value="motorboat">{vesselTypeLabel("motorboat", displayLang)}</option>
                                    <option value="sailboat">{vesselTypeLabel("sailboat", displayLang)}</option>
                                    <option value="catamaran">{vesselTypeLabel("catamaran", displayLang)}</option>
                                  </select>
                                </label>

                                {(boatEditForm[boat.documentId] || defaultBoatEditForm()).vesselType === "catamaran" ? (
                                  <label style={{ display: "grid", gap: 4 }}>
                                    <span className="kicker" style={{ margin: 0 }}>
                                      {lang === "ru" ? "Тип хода" : lang === "me" ? "Pogon" : "Propulsion"}
                                    </span>
                                    <select
                                      value={(boatEditForm[boat.documentId] || defaultBoatEditForm()).propulsion}
                                      onChange={(e) => {
                                        const nextPropulsion = e.target.value === "motor" ? "motor" : "sail";
                                        setBoatEditForm((prev) => ({
                                          ...prev,
                                          [boat.documentId!]: {
                                            ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                            propulsion: nextPropulsion,
                                          },
                                        }));
                                      }}
                                    >
                                      <option value="sail">{propulsionLabel("sail", "catamaran", displayLang)}</option>
                                      <option value="motor">{propulsionLabel("motor", "catamaran", displayLang)}</option>
                                    </select>
                                  </label>
                                ) : null}
                              </div>

                              <input
                                value={(boatEditForm[boat.documentId] || defaultBoatEditForm()).title}
                                onChange={(e) => {
                                  setBoatEditForm((prev) => ({
                                    ...prev,
                                    [boat.documentId!]: {
                                      ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                      title: e.target.value,
                                    },
                                  }));
                                  setBoatEditFieldErrors((prev) => ({
                                    ...prev,
                                    [boat.documentId!]: {
                                      ...(prev[boat.documentId!] || {}),
                                      title: "",
                                    },
                                  }));
                                }}
                                placeholder={lang === "ru" ? "Название" : lang === "me" ? "Naziv" : "Title"}
                                style={inputErrorStyle(boatEditFieldErrors[boat.documentId]?.title)}
                              />
                              {fieldErrorMessage(boatEditFieldErrors[boat.documentId]?.title)}

                              <textarea
                                value={(boatEditForm[boat.documentId] || defaultBoatEditForm()).description}
                                onChange={(e) => setBoatEditForm((prev) => ({
                                  ...prev,
                                  [boat.documentId!]: {
                                    ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                    description: e.target.value,
                                  },
                                }))}
                                placeholder={lang === "ru" ? "Описание" : lang === "me" ? "Opis" : "Description"}
                                rows={4}
                              />

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                                {[
                                  ["capacity", lang === "ru" ? "Вместимость" : lang === "me" ? "Kapacitet" : "Capacity"],
                                  ["lengthM", lang === "ru" ? "Длина, м" : lang === "me" ? "Dužina, m" : "Length, m"],
                                  ["year", lang === "ru" ? "Год" : lang === "me" ? "Godina" : "Year"],
                                  ["engineHp", lang === "ru" ? "Мощность, hp" : lang === "me" ? "Snaga, hp" : "Engine, hp"],
                                  ["homeMarinaId", lang === "ru" ? "ID локации" : lang === "me" ? "ID lokacije" : "Location ID"],
                                  ["ownerPhone", lang === "ru" ? "Телефон" : lang === "me" ? "Telefon" : "Phone"],
                                  ["rentPriceHour", lang === "ru" ? "Цена/час" : lang === "me" ? "Cijena/sat" : "Price/hour"],
                                  ["rentPriceDay", lang === "ru" ? "Цена/день" : lang === "me" ? "Cijena/dan" : "Price/day"],
                                  ["rentPriceWeek", lang === "ru" ? "Цена/неделя" : lang === "me" ? "Cijena/nedjelja" : "Price/week"],
                                  ["minRentalHours", lang === "ru" ? "Мин. часов" : lang === "me" ? "Min. sati" : "Min. hours"],
                                ].map(([key, label]) => (
                                  <label key={key} style={{ display: "grid", gap: 4 }}>
                                    <span className="kicker" style={{ margin: 0 }}>{label}</span>
                                    <input
                                      value={(boatEditForm[boat.documentId!] || defaultBoatEditForm())[key as keyof BoatEditFormState] as string}
                                      onChange={(e) => {
                                        setBoatEditForm((prev) => ({
                                          ...prev,
                                          [boat.documentId!]: {
                                            ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                            [key]: e.target.value,
                                          },
                                        }));
                                        setBoatEditFieldErrors((prev) => ({
                                          ...prev,
                                          [boat.documentId!]: {
                                            ...(prev[boat.documentId!] || {}),
                                            [key]: "",
                                          },
                                        }));
                                      }}
                                      placeholder={label}
                                      style={inputErrorStyle(boatEditFieldErrors[boat.documentId!]?.[key])}
                                    />
                                    {fieldErrorMessage(boatEditFieldErrors[boat.documentId!]?.[key])}
                                  </label>
                                ))}
                              </div>

                              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={(boatEditForm[boat.documentId] || defaultBoatEditForm()).instantBooking}
                                  onChange={(e) => setBoatEditForm((prev) => ({
                                    ...prev,
                                    [boat.documentId!]: {
                                      ...(prev[boat.documentId!] || defaultBoatEditForm()),
                                      instantBooking: e.target.checked,
                                    },
                                  }))}
                                />
                                {lang === "ru" ? "Мгновенное бронирование" : lang === "me" ? "Instant rezervacija" : "Instant booking"}
                              </label>

                              {boatEditError[boat.documentId] ? (
                                <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                  {boatEditError[boat.documentId]}
                                </p>
                              ) : null}

                              {boatEditSuccess[boat.documentId] ? (
                                <p className="kicker" style={{ margin: 0, color: "#15803d" }}>
                                  {boatEditSuccess[boat.documentId]}
                                </p>
                              ) : null}

                              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                <button
                                  type="button"
                                  className="button primary"
                                  disabled={boatEditSaving[boat.documentId] === true}
                                  onClick={() => saveAllBoatChanges(boat)}
                                >
                                  {boatEditSaving[boat.documentId] === true
                                    ? (lang === "ru" ? "Сохранение..." : lang === "me" ? "Čuvanje..." : "Saving...")
                                    : (lang === "ru" ? "Сохранить всё" : lang === "me" ? "Sačuvaj sve" : "Save all")}
                                </button>

                                <button
                                  type="button"
                                  className="button secondary"
                                  disabled={boatEditSaving[boat.documentId] === true}
                                  onClick={() => setEditingBoatDocumentId(null)}
                                >
                                  {lang === "ru" ? "Отмена" : lang === "me" ? "Otkaži" : "Cancel"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div
                          id={boatSetupAnchor(boat, "routes")}
                          className="card"
                          style={{
                            padding: 14,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <strong>{copy.ownerRoutes}</strong>
                              <span className="kicker" style={{ margin: 0 }}>
                                {(boatExperiences[getBoatExperienceKey(boat)] || []).length}/3
                              </span>
                            </div>

                            {experienceLoading ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                {copy.loadingRoutes}
                              </p>
                            ) : null}

                            {experienceError ? (
                              <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                {experienceError}
                              </p>
                            ) : null}

                            {(boatExperiences[getBoatExperienceKey(boat)] || []).length ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                {(boatExperiences[getBoatExperienceKey(boat)] || []).map((experience) => {
                                  const ownerPrice = Number(experience.price);
                                  const customerPrice = applyMarketplaceFee(ownerPrice);
                                  const coverUrl = normalizeMediaUrl(experience.cover?.url);

                                  return (
                                    <div
                                      key={getExperienceStableKey(experience)}
                                      style={{
                                        padding: 10,
                                        borderRadius: 12,
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                      }}
                                    >
                                      {editingBoatDocumentId === boat.documentId ? (
                                        <div style={{ display: "grid", gap: 8 }}>
                                          {coverUrl ? (
                                            <img src={coverUrl} alt={experience.title || copy.routes} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10 }} />
                                          ) : null}
                                          <input
                                            value={(experienceEditForm[getExperienceStableKey(experience)] || experienceToForm(experience)).title}
                                            onChange={(e) => setExperienceEditForm((prev) => ({ ...prev, [getExperienceStableKey(experience)]: { ...(prev[getExperienceStableKey(experience)] || experienceToForm(experience)), title: e.target.value } }))}
                                            placeholder={lang === "ru" ? "Название маршрута" : lang === "me" ? "Naziv rute" : "Route title"}
                                          />
                                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                                            <input type="number" min="0.5" max="24" step="0.5" value={(experienceEditForm[getExperienceStableKey(experience)] || experienceToForm(experience)).durationHours} onChange={(e) => setExperienceEditForm((prev) => ({ ...prev, [getExperienceStableKey(experience)]: { ...(prev[getExperienceStableKey(experience)] || experienceToForm(experience)), durationHours: e.target.value } }))} />
                                            <input type="number" min="1" step="1" value={(experienceEditForm[getExperienceStableKey(experience)] || experienceToForm(experience)).price} onChange={(e) => setExperienceEditForm((prev) => ({ ...prev, [getExperienceStableKey(experience)]: { ...(prev[getExperienceStableKey(experience)] || experienceToForm(experience)), price: e.target.value } }))} />
                                          </div>
                                          <input value={(experienceEditForm[getExperienceStableKey(experience)] || experienceToForm(experience)).shortDescription} onChange={(e) => setExperienceEditForm((prev) => ({ ...prev, [getExperienceStableKey(experience)]: { ...(prev[getExperienceStableKey(experience)] || experienceToForm(experience)), shortDescription: e.target.value } }))} placeholder={lang === "ru" ? "Краткое описание" : lang === "me" ? "Kratak opis" : "Short description"} />
                                          <button type="button" className="button secondary" disabled={experienceDeletePending[getExperienceStableKey(experience)] === true} onClick={() => deleteExperienceForOwner(experience)}>
                                            {lang === "ru" ? "Удалить маршрут" : lang === "me" ? "Obriši rutu" : "Delete route"}
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          {coverUrl ? (
                                            <img src={coverUrl} alt={experience.cover?.alternativeText || experience.title || copy.routes} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginBottom: 8, background: "rgba(255,255,255,0.06)" }} />
                                          ) : null}
                                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                            <strong>{experience.title || copy.routes}</strong>
                                            <span className="pill">{experience.publishedAt ? copy.routePublished : copy.routeDraft}</span>
                                          </div>
                                          {!experience.publishedAt ? <p className="kicker" style={{ margin: "6px 0 0" }}>{copy.routeHiddenUntilReview}</p> : null}
                                          <p className="kicker" style={{ margin: "6px 0 0" }}>{experience.duration_hours ?? "—"}h · {experience.short_description || "—"}</p>
                                          <p className="kicker" style={{ margin: "6px 0 0" }}>
                                            {lang === "ru" ? "Цена owner" : lang === "me" ? "Cijena vlasnika" : "Owner price"}: {formatOwnerExperiencePrice(ownerPrice)}{" · "}
                                            {lang === "ru" ? "Цена клиента" : lang === "me" ? "Cijena za klijenta" : "Client price"} (+{Math.round(MARKETPLACE_FEE_RATE * 100)}%): {formatOwnerExperiencePrice(customerPrice)}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="kicker" style={{ margin: 0 }}>
                                {copy.noRoutesYet}
                              </p>
                            )}

                            {editingBoatDocumentId === boat.documentId && (boatExperiences[getBoatExperienceKey(boat)] || []).length < 3 ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  type="text"
                                  placeholder={lang === "ru" ? "Название маршрута" : lang === "me" ? "Naziv rute" : "Route title"}
                                  value={(experienceForm[Number(boat.id)] || defaultExperienceForm()).title}
                                  onChange={(e) => {
                                    const boatId = Number(boat.id);
                                    setExperienceForm((prev) => ({
                                      ...prev,
                                      [boatId]: {
                                        ...(prev[boatId] || defaultExperienceForm()),
                                        title: e.target.value,
                                      },
                                    }));
                                    setExperienceFieldErrors((prev) => ({
                                      ...prev,
                                      [boatId]: {
                                        ...(prev[boatId] || {}),
                                        title: "",
                                      },
                                    }));
                                  }}
                                  style={inputErrorStyle(experienceFieldErrors[Number(boat.id)]?.title)}
                                />
                                {fieldErrorMessage(experienceFieldErrors[Number(boat.id)]?.title)}

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                    gap: 10,
                                  }}
                                >
                                  <input
                                    type="number"
                                    min="0.5"
                                    max="24"
                                    step="0.5"
                                    placeholder={lang === "ru" ? "Часы" : lang === "me" ? "Sati" : "Hours"}
                                    value={(experienceForm[Number(boat.id)] || defaultExperienceForm()).durationHours}
                                    onChange={(e) => {
                                      const boatId = Number(boat.id);
                                      setExperienceForm((prev) => ({
                                        ...prev,
                                        [boatId]: {
                                          ...(prev[boatId] || defaultExperienceForm()),
                                          durationHours: e.target.value,
                                        },
                                      }));
                                      setExperienceFieldErrors((prev) => ({
                                        ...prev,
                                        [boatId]: {
                                          ...(prev[boatId] || {}),
                                          durationHours: "",
                                        },
                                      }));
                                    }}
                                    style={inputErrorStyle(experienceFieldErrors[Number(boat.id)]?.durationHours)}
                                  />
                                  {fieldErrorMessage(experienceFieldErrors[Number(boat.id)]?.durationHours)}

                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder={lang === "ru" ? "Цена owner EUR" : lang === "me" ? "Cijena vlasnika EUR" : "Owner price EUR"}
                                    value={(experienceForm[Number(boat.id)] || defaultExperienceForm()).price}
                                    onChange={(e) => {
                                      const boatId = Number(boat.id);
                                      setExperienceForm((prev) => ({
                                        ...prev,
                                        [boatId]: {
                                          ...(prev[boatId] || defaultExperienceForm()),
                                          price: e.target.value,
                                        },
                                      }));
                                      setExperienceFieldErrors((prev) => ({
                                        ...prev,
                                        [boatId]: {
                                          ...(prev[boatId] || {}),
                                          price: "",
                                        },
                                      }));
                                    }}
                                    style={inputErrorStyle(experienceFieldErrors[Number(boat.id)]?.price)}
                                  />
                                  {fieldErrorMessage(experienceFieldErrors[Number(boat.id)]?.price)}
                                </div>

                                <input
                                  type="text"
                                  placeholder={lang === "ru" ? "Краткое описание" : lang === "me" ? "Kratak opis" : "Short description"}
                                  value={(experienceForm[Number(boat.id)] || defaultExperienceForm()).shortDescription}
                                  onChange={(e) => setExperienceForm((prev) => ({
                                    ...prev,
                                    [Number(boat.id)]: {
                                      ...(prev[Number(boat.id)] || defaultExperienceForm()),
                                      shortDescription: e.target.value,
                                    },
                                  }))}
                                />

                                <div style={{ display: "grid", gap: 8 }}>
                                  {(experienceForm[Number(boat.id)] || defaultExperienceForm()).coverUrl ? (
                                    <img
                                      src={(experienceForm[Number(boat.id)] || defaultExperienceForm()).coverUrl || ""}
                                      alt={lang === "ru" ? "Фото маршрута" : lang === "me" ? "Fotografija rute" : "Route photo"}
                                      style={{
                                        width: "100%",
                                        maxHeight: 160,
                                        objectFit: "cover",
                                        borderRadius: 12,
                                        background: "rgba(255,255,255,0.06)",
                                      }}
                                    />
                                  ) : null}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={Boolean(experienceUploadBusy[Number(boat.id)])}
                                    onChange={(e) => uploadExperienceCover(Number(boat.id), e.target.files)}
                                  />
                                  <p className="kicker" style={{ margin: 0 }}>
                                    {experienceUploadBusy[Number(boat.id)]
                                      ? copy.routePhotoUploading
                                      : copy.routePhotoHelp}
                                  </p>
                                </div>

                                <button
                                  className="button secondary"
                                  type="button"
                                  disabled={Boolean(experienceBusy[Number(boat.id)])}
                                  onClick={() => createExperienceForBoat(Number(boat.id))}
                                >
                                  {copy.saveRoute}
                                </button>
                              </div>
                            ) : editingBoatDocumentId === boat.documentId ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                {copy.routeLimitReached}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div
                          id={boatSetupAnchor(boat, "calendar")}
                          className="card"
                          style={{
                            padding: 14,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <strong>{copy.boatAvailability}</strong>

                              <button
                                className="button secondary"
                                type="button"
                                onClick={() => loadBlackoutsForBoat(Number(boat.id))}
                              >
                                {copy.refresh}
                              </button>
                            </div>

                            {blackoutLoading[Number(boat.id)] ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                {copy.loadingCalendar}
                              </p>
                            ) : null}

                            {blackoutError[Number(boat.id)] ? (
                              <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                {blackoutError[Number(boat.id)]}
                              </p>
                            ) : null}

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                gap: 10,
                              }}
                            >
                              <input
                                type="date"
                                value={blackoutForm[Number(boat.id)]?.startDate || ""}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: e.target.value,
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: prev[Number(boat.id)]?.endDate || e.target.value,
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="time"
                                value={blackoutForm[Number(boat.id)]?.startTime || "09:00"}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || "",
                                    startTime: e.target.value,
                                    endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="date"
                                value={blackoutForm[Number(boat.id)]?.endDate || ""}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || e.target.value,
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: e.target.value,
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="time"
                                value={blackoutForm[Number(boat.id)]?.endTime || "17:00"}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || "",
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                    endTime: e.target.value,
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />
                            </div>

                            <input
                              type="text"
                              placeholder={copy.optionalInternalReason}
                              value={blackoutForm[Number(boat.id)]?.reason || ""}
                              onChange={(e) => setBlackoutForm((prev) => ({
                                ...prev,
                                [Number(boat.id)]: {
                                  startDate: prev[Number(boat.id)]?.startDate || "",
                                  startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                  endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                  endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                  reason: e.target.value,
                                },
                              }))}
                            />

                            <button
                              className="button secondary"
                              type="button"
                              disabled={Boolean(blackoutBusy[Number(boat.id)])}
                              onClick={() => createBlackoutForBoat(Number(boat.id))}
                            >
                              {copy.addClosedDate}
                            </button>

                            <OwnerAvailabilityCalendar
                              lang={lang}
                              blackouts={boatBlackouts[Number(boat.id)] || []}
                            />

                            {boatBlackouts[Number(boat.id)]?.length ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                {boatBlackouts[Number(boat.id)].map((blackout) => (
                                  <div
                                    key={blackout.id}
                                    style={{
                                      padding: 10,
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.04)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                                      {formatOwnerBlackoutRange(blackout, lang)}
                                    </div>

                                    <div className="kicker" style={{ marginTop: 6 }}>
                                      {blackout.reason || "blocked"}
                                    </div>

                                    <button
                                      className="button secondary"
                                      type="button"
                                      disabled={Boolean(blackoutBusy[Number(boat.id)])}
                                      onClick={() => deleteBlackoutForBoat(Number(boat.id), blackout.id)}
                                      style={{ marginTop: 8 }}
                                    >
                                      {copy.delete}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="kicker" style={{ margin: 0 }}>
                                {copy.noClosedDates}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="kicker" style={{ margin: 0 }}>
                        {lang === "ru" ? "Инструменты появятся после сохранения лодки." : lang === "me" ? "Alati će biti dostupni nakon čuvanja plovila." : "Tools appear after the boat is saved."}
                      </p>
                    )}
                  </div>
                    );
                  })()
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 18 }}>
                <p style={{ margin: 0 }}>{pageCopy(lang).noBoatsYet}</p>
                <p className="kicker" style={{ margin: "8px 0 0" }}>{copy.noBoatForRoutes}</p>
              </div>
            )}

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).recentBookingActivity}</h2>

              {recentActivity.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {recentActivity.map((booking, index) => {
                    const key = bookingActionKey(booking, index);
                    const publicToken = booking.public_token?.trim();
                    const isProcessing = Boolean(processingAction[key]);
                    const canAct = booking.status === "hold" && Boolean(publicToken) && !isProcessing;

                    return (
                      <div
                        key={booking.id ?? booking.public_id ?? index}
                        className="card"
                        style={{
                          padding: 18,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>
                              {booking.public_id || "—"}
                            </h3>
                            <p className="kicker" style={{ marginTop: 6 }}>
                              {booking.customer_name || "—"} · {booking.customer_email || "—"}
                            </p>
                          </div>

                          <span
                            className="pill"
                            style={{
                              alignSelf: "start",
                              background: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {booking.status || "—"}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span>{copy.start}: {booking.slot_start_utc || "—"}</span>
                          <span>·</span>
                          <span>{copy.end}: {booking.slot_end_utc || "—"}</span>
                        </div>

                        {booking.status === "hold" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div className="actions" style={{ marginTop: 0 }}>
                              <button
                                className="button secondary"
                                type="button"
                                disabled={!canAct}
                                onClick={() => runOwnerAction(booking, index, "confirm")}
                              >
                                {processingAction[key] === "confirm" ? pageCopy(lang).confirming : pageCopy(lang).confirm}
                              </button>
                              <button
                                className="button secondary"
                                type="button"
                                disabled={!canAct}
                                onClick={() => runOwnerAction(booking, index, "decline")}
                              >
                                {processingAction[key] === "decline" ? pageCopy(lang).declining : pageCopy(lang).decline}
                              </button>
                            </div>

                            {!publicToken ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                Owner action token unavailable.
                              </p>
                            ) : null}

                            {actionSuccess[key] ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                {actionSuccess[key]}
                              </p>
                            ) : null}

                            {actionError[key] ? (
                              <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                {actionError[key]}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>{pageCopy(lang).noRecentBookingActivity}</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).bookingCalendar}</h2>

              <div
                className="card"
                style={{
                  padding: 18,
                  marginBottom: 14,
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <div>
                  <p className="kicker" style={{ margin: 0 }}>{copy.upcomingBookings}</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {upcomingBookingsCount}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>{copy.upcomingHolds}</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {upcomingHoldsCount}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>{copy.expiredEntries}</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {expiredCalendarCount}
                  </div>
                </div>
              </div>

              {calendarGroups.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {calendarGroups.map((group) => (
                    <div key={group.dateKey}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 20 }}>{group.label}</h3>
                      <div style={{ display: "grid", gap: 12 }}>
                        {group.events.map((event, index) => (
                          <div
                            key={event.id || `${group.dateKey}-${index}`}
                            className="card"
                            style={{
                              padding: 16,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: 18 }}>
                                  {event.boatTitle || copy.boatNotAssigned}
                                </h4>
                                <p className="kicker" style={{ marginTop: 6 }}>
                                  {event.status || "—"} · {copy.paymentIntent}: {event.hasPaymentIntent ? copy.yes : copy.no}
                                </p>
                              </div>

                              <span
                                className="pill"
                                style={{
                                  alignSelf: "start",
                                  background: calendarBadgeBackground(event.displayType),
                                }}
                              >
                                {calendarBadgeLabel(event.displayType, lang)}
                              </span>
                            </div>

                            <div className="meta-row">
                              <span>{copy.start}: {event.startUtc || "—"}</span>
                              <span>·</span>
                              <span>{copy.end}: {event.endUtc || "—"}</span>
                            </div>

                            <div className="meta-row">
                              <span>{copy.booking}: {event.bookingId ?? "—"}</span>
                              <span>·</span>
                              <span>{copy.ownerDecision}: {event.ownerDecision || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>{pageCopy(lang).noBookingCalendarEntries}</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).occupancyOverview}</h2>

              {occupancyItems.length ? (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  }}
                >
                  {occupancyItems.map((item, index) => {
                    const isHold = item.status === "hold";
                    const label = isHold ? "HOLD" : "BOOKED";
                    const background = isHold ? "rgba(234,179,8,0.18)" : "rgba(22,163,74,0.18)";

                    return (
                      <div
                        key={item.id ?? item.public_id ?? `${item.status ?? "occupancy"}-${index}`}
                        className="card"
                        style={{
                          padding: 18,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>
                              {item.public_id || "—"}
                            </h3>
                            <p className="kicker" style={{ marginTop: 6 }}>
                              {item.status || "—"}
                            </p>
                          </div>

                          <span
                            className="pill"
                            style={{
                              alignSelf: "start",
                              background,
                            }}
                          >
                            {label}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span>{copy.start}: {item.slot_start_utc || "—"}</span>
                          <span>·</span>
                          <span>{copy.end}: {item.slot_end_utc || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>{pageCopy(lang).noActiveOccupancy}</p>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const boatForm = read("components/boat-form/BoatForm.tsx");
const dashboard = read("app/[lang]/owner-dashboard/OwnerDashboardClient.tsx");
const ownerBoatsApi = read("app/api/owner/boats/route.ts");
const loginForm = read("app/[lang]/owner-login/OwnerLoginForm.tsx");
const registerForm = read("app/[lang]/owner-register/OwnerRegisterForm.tsx");
const ownerInternalAuth = read("lib/auth/ownerInternalAuth.ts");
const ownerRateLimit = read("lib/security/ownerRateLimit.ts");
const ownerRegisterApi = read("app/api/auth/owner-register/route.ts");
const ownerInternalProbe = read("app/api/auth/owner-internal-auth-probe/route.ts");
const ownerExperiencesApi = read("app/api/owner/experiences/route.ts");
const ownerBlackoutsApi = read("app/api/owner/blackouts/route.ts");
const ownerProfileApi = read("app/api/owner/profile/route.ts");
const ownerSubmitReviewApi = read("app/api/owner/boats/submit-review/route.ts");
const ownerEmailVerification = read("lib/security/ownerContactVerification.ts");
const ownerEmailSendApi = read("app/api/auth/owner-email-verification/send/route.ts");
const ownerEmailConfirmApi = read("app/api/auth/owner-email-verification/confirm/route.ts");
const ownerWhatsAppSendApi = read("app/api/auth/owner-whatsapp-verification/send/route.ts");
const ownerWhatsAppCheckApi = read("app/api/auth/owner-whatsapp-verification/check/route.ts");
const ownerVerificationPanel = read("components/owner/OwnerContactVerificationPanel.tsx");

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

test("unauthenticated visitors see the existing owner auth prompt before the form", () => {
  assert.ok(boatForm.includes('fetch("/api/owner/dashboard"'));
  assert.ok(boatForm.includes('authStatus === "unauthenticated"'));
  assert.ok(boatForm.includes("owner-login?next="));
  assert.ok(boatForm.includes("owner-register?next="));
  assert.ok(boatForm.indexOf("authStatus === \"unauthenticated\"") < boatForm.indexOf("<form className=\"boat-form-body\""));
});

test("authenticated owner account email is shown read-only on the listing form", () => {
  assert.ok(boatForm.includes("ownerAccount.email"));
  assert.ok(boatForm.includes("ui.contactEmail"));
  assert.ok(boatForm.includes("readOnly"));
  assert.ok(boatForm.includes("owner-dashboard#owner-profile"));
});

test("boat payload does not duplicate account email", () => {
  const payloadBlock = blockBetween(boatForm, "const apiPayload = useMemo", "async function handleImageUpload");
  assert.doesNotMatch(payloadBlock, /ownerEmail|email/i);
  assert.ok(ownerBoatsApi.includes("owner_user_id: me.id"));
});

test("successful create redirects to the existing owner dashboard", () => {
  assert.ok(boatForm.includes("router.push(target)"));
  assert.ok(boatForm.includes("owner-dashboard"));
});

test("post-create redirect includes a stable boat identifier", () => {
  assert.ok(boatForm.includes("boat?.documentId"));
  assert.ok(boatForm.includes("createdBoat=${encodeURIComponent(createdBoat)}"));
});

test("dashboard selects a newly created boat from query", () => {
  assert.ok(dashboard.includes("createdBoatParam"));
  assert.ok(dashboard.includes('new URLSearchParams(window.location.search).get("createdBoat")'));
  assert.ok(dashboard.includes("const selectedBoat = useMemo"));
  assert.ok(dashboard.includes("setSelectedBoatRef(createdBoat)"));
});

test("dashboard persists selection and falls back to the first owned boat", () => {
  assert.ok(dashboard.includes('window.localStorage.getItem("sharmar-owner-selected-boat")'));
  assert.ok(dashboard.includes('window.localStorage.setItem("sharmar-owner-selected-boat"'));
  assert.ok(dashboard.includes("return matched ?? boats[0] ?? null"));
});

test("foreign boat selection cannot be trusted from query alone", () => {
  assert.ok(dashboard.includes("return matched ?? boats[0] ?? null"));
  assert.ok(dashboard.includes("data?.boats ?? []"));
  assert.ok(ownerExperiencesApi.includes("Boat does not belong to owner"));
  assert.ok(ownerBlackoutsApi.includes("boat_not_found_for_owner"));
});

test("checklist uses existing dashboard sections", () => {
  assert.ok(dashboard.includes("copy.listingSetup"));
  assert.ok(dashboard.includes("boatHasBasicInformation(selectedBoat)"));
  assert.ok(dashboard.includes("ownerHasRequiredDocuments(data)"));
  assert.ok(dashboard.includes("boatExperiences[getBoatExperienceKey(selectedBoat)]"));
  assert.ok(dashboard.includes("done: Boolean(selectedBoat.id)"));
  assert.ok(dashboard.includes('boatSetupAnchor(selectedBoat, "calendar")'));
});

test("documents checklist link targets the existing document section", () => {
  assert.ok(dashboard.includes('id="owner-documents"'));
  assert.ok(dashboard.includes('href: "#owner-documents"'));
  assert.ok(dashboard.includes("uploadOwnerDocument"));
  assert.ok(dashboard.includes("/api/owner/documents"));
});

test("routes checklist link targets the existing experience section", () => {
  assert.ok(dashboard.includes('boatSetupAnchor(selectedBoat, "routes")'));
  assert.ok(dashboard.includes("createExperienceForBoat"));
  assert.ok(dashboard.includes("/api/owner/experiences"));
});

test("route form is unavailable until a boat exists", () => {
  assert.ok(dashboard.includes("copy.noBoatForRoutes"));
  assert.ok(dashboard.includes("Сначала добавьте лодку. После сохранения вы сможете создать маршруты."));
  assert.ok(dashboard.includes("Add a boat first. You can create routes after saving it."));
  assert.ok(dashboard.includes("Prvo dodajte plovilo. Nakon čuvanja možete kreirati rute."));
});

test("calendar checklist link targets the existing blackout calendar section", () => {
  assert.ok(dashboard.includes('boatSetupAnchor(selectedBoat, "calendar")'));
  assert.ok(dashboard.includes("OwnerAvailabilityCalendar"));
  assert.ok(dashboard.includes("/api/owner/blackouts"));
});

test("calendar is available for draft boats without admin approval gate", () => {
  const calendarBlock = blockBetween(dashboard, 'id={boatSetupAnchor(boat, "calendar")}', "<OwnerAvailabilityCalendar");
  assert.doesNotMatch(calendarBlock, /approved|published|under_review|moderation_status/);
  assert.ok(dashboard.includes("copy.boatAvailability"));
});

test("submit-review checklist uses the existing handler and API", () => {
  assert.ok(dashboard.includes('boatSetupAnchor(selectedBoat, "submit-review")'));
  assert.ok(dashboard.includes("submitBoatForReview"));
  assert.ok(dashboard.includes("/api/owner/boats/submit-review"));
});

test("instant booking is off by default on the initial form and API fallback", () => {
  assert.ok(boatForm.includes("instantBooking: false"));
  assert.ok(ownerBoatsApi.includes("const instantBooking = body.instantBooking === true"));
});

test("Russian initial form translations do not contain the audited English strings", () => {
  const ruBlock = blockBetween(boatForm, "ru: {", "me: {");
  [
    "Add motor boat for rent",
    "Listing language is automatically detected from the current site language.",
    "Listing saved for review. Visible after approval.",
    "Upload up to 8 JPG, PNG or WEBP images.",
    "Drag & drop images here or click below",
    "Select images",
  ].forEach((text) => assert.equal(ruBlock.includes(text), false, `${text} leaked into RU translations`));
});

test("English initial form translations contain the intended English strings", () => {
  assert.ok(boatForm.includes('titleRentMotor: "Add motor boat for rent"'));
  assert.ok(boatForm.includes("Listing language is automatically detected from the current site language."));
  assert.ok(boatForm.includes("Select images"));
});

test("Montenegrin initial form translations contain localized owner flow strings", () => {
  assert.ok(boatForm.includes('titleRentMotor: "Dodaj motorno plovilo za najam"'));
  assert.ok(boatForm.includes("Kontakt email"));
  assert.ok(boatForm.includes("Trenutnu rezervaciju možete uključiti kasnije"));
});

test("forgot and reset password routes are not changed by this owner flow connection", () => {
  const diff = execFileSync("git", [
    "diff",
    "--name-only",
    "--",
    "frontend/app/[lang]/owner-forgot-password",
    "frontend/app/[lang]/owner-reset-password",
  ], { cwd: dirname(root), encoding: "utf8" });
  assert.equal(diff.trim(), "");
  assert.ok(loginForm.includes("owner-forgot-password"));
  assert.doesNotMatch(registerForm, /owner-forgot-password|owner-reset-password/);
});

test("existing document, experience, and blackout APIs are reused without duplicated routes", () => {
  const changed = execFileSync("git", ["diff", "--name-only", "--", "frontend"], {
    cwd: dirname(root),
    encoding: "utf8",
  });
  assert.doesNotMatch(changed, /documents2|experiences2|calendar2|blackouts2/);
  assert.ok(dashboard.includes("/api/owner/documents"));
  assert.ok(dashboard.includes("/api/owner/experiences"));
  assert.ok(dashboard.includes("/api/owner/blackouts"));
});

test("experience creation sets boat relation server-side and ignores owner relation from browser", () => {
  assert.ok(ownerExperiencesApi.includes("const parsed = parseCreateExperienceBody(body)"));
  assert.ok(ownerExperiencesApi.includes("await getOwnerBoat(p.boatId, ownerRes.owner.id, serverToken)"));
  assert.ok(ownerExperiencesApi.includes("boat: p.boatId"));
  assert.ok(ownerExperiencesApi.includes("confirmed: true"));
  assert.doesNotMatch(blockBetween(ownerExperiencesApi, "function parseCreateExperienceBody", "function extractNumberId"), /ownerId|owner_user|userId|user_id/i);
});

test("owner-created experiences stay draft and inactive until moderation", () => {
  assert.ok(ownerExperiencesApi.includes("publishedAt: null"));
  assert.ok(ownerExperiencesApi.includes("is_active: false"));
  assert.ok(ownerExperiencesApi.includes('publicationState: "draft"'));
  assert.ok(dashboard.includes("copy.routeHiddenUntilReview"));
});

test("old unassigned route copy exists but is not auto-repaired", () => {
  assert.ok(dashboard.includes("Boat not assigned"));
  assert.ok(dashboard.includes("Лодка не указана"));
  assert.ok(dashboard.includes("Plovilo nije povezano"));
  assert.doesNotMatch(ownerExperiencesApi, /unassigned|auto.*assign|repair/i);
});

test("owner blackout creation rejects overlapping existing blackouts before CMS write", () => {
  assert.ok(ownerBlackoutsApi.includes("existingBlackoutOverlaps"));
  assert.ok(ownerBlackoutsApi.includes("rangesOverlap"));
  assert.ok(ownerBlackoutsApi.includes('error: "blackout_overlap"'));
});

test("owner blackout API enforces ownership before create and delete", () => {
  assert.ok(ownerBlackoutsApi.includes("ownerOwnsBoat(req, boatId)"));
  assert.ok(ownerBlackoutsApi.includes("boat_not_found_for_owner"));
  assert.ok(dashboard.includes("deleteBlackoutForBoat(Number(boat.id), blackout.id)"));
});

test("technical calendar placeholders are hidden from owner dashboard UI", () => {
  [
    "Google Calendar sync not enabled",
    "iCal export foundation ready",
    "Export URL placeholder",
    "[owner-export-token]",
    "External provider sync disabled",
  ].forEach((text) => assert.equal(dashboard.includes(text), false, `${text} leaked into dashboard`));
});

test("booking calendar summary labels are localized", () => {
  assert.ok(dashboard.includes("copy.upcomingBookings"));
  assert.ok(dashboard.includes("copy.upcomingHolds"));
  assert.ok(dashboard.includes("copy.expiredEntries"));
  assert.ok(dashboard.includes("calendarBadgeLabel(event.displayType, lang)"));
});

test("document status distinguishes missing documents from awaiting review", () => {
  assert.ok(dashboard.includes("function documentReviewLabel"));
  assert.ok(dashboard.includes("documentsNotUploaded"));
  assert.ok(dashboard.includes("documentsAwaitingReview"));
  assert.ok(dashboard.includes("documentsVerified"));
  assert.ok(dashboard.includes("documentsRejected"));
  assert.ok(dashboard.includes('return isDocumentUploaded(data, "passport") || isDocumentUploaded(data, "identity")'));
});

test("dashboard RU/ME/EN localization covers selected boat, routes, calendar, and document states", () => {
  [
    "Выбранная лодка",
    "Доступность лодки",
    "Маршруты владельца",
    "Документы не загружены",
    "Документы ожидают проверки",
    "Документы подтверждены",
    "Izabrano plovilo",
    "Dostupnost plovila",
    "Rute vlasnika",
    "Dokumenti nisu otpremljeni",
    "Documents not uploaded",
    "Documents awaiting review",
    "Boat availability",
  ].forEach((text) => assert.ok(dashboard.includes(text), `${text} missing from dashboard translations`));
});

test("dashboard avoids visible old English calendar strings in runtime JSX", () => {
  assert.ok(dashboard.includes("{copy.upcomingBookings}"));
  assert.ok(dashboard.includes("{copy.upcomingHolds}"));
  assert.ok(dashboard.includes("{copy.expiredEntries}"));
  assert.ok(dashboard.includes("{copy.paymentIntent}:"));
  assert.ok(dashboard.includes("{copy.ownerDecision}:"));
});

test("owner internal token helper is server-only and not referenced by client components", () => {
  assert.ok(ownerInternalAuth.includes('OWNER_INTERNAL_TOKEN_ENV = "OWNER_API_TOKEN"'));
  assert.ok(ownerInternalAuth.includes('env.NODE_ENV !== "production"'));
  assert.ok(ownerRateLimit.includes("getOwnerInternalToken()"));
  assert.equal(boatForm.includes("OWNER_API_TOKEN"), false);
  assert.equal(registerForm.includes("OWNER_API_TOKEN"), false);
});

test("owner registration keeps duplicate email mapping while using safe unavailable copy", () => {
  assert.ok(ownerRegisterApi.includes('return "email_already_registered"'));
  assert.ok(registerForm.includes("Сервис регистрации временно недоступен. Повторите попытку позже."));
  assert.ok(registerForm.includes("Registration is temporarily unavailable. Please try again later."));
  assert.ok(registerForm.includes("Registracija je privremeno nedostupna. Pokušajte ponovo kasnije."));
});

test("owner auth prompt links remain visually separated", () => {
  assert.ok(boatForm.includes("boat-form-auth-actions"));
  assert.ok(boatForm.includes("gap: 12px"));
  assert.ok(boatForm.includes("owner-login?next="));
  assert.ok(boatForm.includes("owner-register?next="));
});

test("owner internal auth probe does not send registration data", () => {
  assert.ok(ownerInternalProbe.includes("checkPersistentRateLimit"));
  assert.ok(ownerInternalProbe.includes("owner-internal-auth-probe"));
  assert.equal(ownerInternalProbe.includes("owner-register"), false);
  assert.equal(ownerInternalProbe.includes("email"), false);
  assert.equal(ownerInternalProbe.includes("password"), false);
  assert.equal(ownerInternalProbe.includes("whatsapp"), false);
});

test("owner onboarding includes signed email verification and dashboard resend", () => {
  assert.ok(ownerRegisterApi.includes("sendOwnerVerificationEmail"));
  assert.ok(ownerRegisterApi.includes("verification_email_sent"));
  assert.ok(ownerEmailVerification.includes("createHmac"));
  assert.ok(ownerEmailVerification.includes("emailHash"));
  assert.ok(ownerEmailVerification.includes("expiresAt"));
  assert.ok(ownerEmailSendApi.includes("requireAuthenticatedOwner"));
  assert.ok(ownerEmailConfirmApi.includes("verifyOwnerEmailVerificationToken"));
  assert.ok(ownerEmailConfirmApi.includes("email_verified: true"));
  assert.ok(ownerVerificationPanel.includes("/api/auth/owner-email-verification/send"));
});

test("owner onboarding uses Twilio Verify WhatsApp OTP and never exposes credentials to the client", () => {
  assert.ok(ownerEmailVerification.includes("https://verify.twilio.com/v2/Services/"));
  assert.ok(ownerEmailVerification.includes('Channel: "whatsapp"'));
  assert.ok(ownerEmailVerification.includes('"VerificationCheck"'));
  assert.ok(ownerWhatsAppSendApi.includes("startOwnerWhatsAppVerification"));
  assert.ok(ownerWhatsAppCheckApi.includes("checkOwnerWhatsAppVerification"));
  assert.ok(ownerWhatsAppCheckApi.includes("whatsapp_verified: true"));
  assert.equal(ownerVerificationPanel.includes("TWILIO_AUTH_TOKEN"), false);
  assert.equal(registerForm.includes("TWILIO_AUTH_TOKEN"), false);
});

test("verified WhatsApp number cannot be silently replaced", () => {
  assert.ok(ownerProfileApi.includes("verified_whatsapp_change_requires_support"));
  assert.ok(ownerProfileApi.includes("normalizeOwnerWhatsApp"));
});

test("contact verification is enforced server-side before review and instant booking", () => {
  assert.ok(ownerSubmitReviewApi.includes("owner_email_not_verified"));
  assert.ok(ownerSubmitReviewApi.includes("owner_whatsapp_not_verified"));
  assert.ok(ownerBoatsApi.includes("owner_contact_verification_required"));
  assert.ok(dashboard.includes("Verify email and WhatsApp first."));
  assert.ok(dashboard.includes('id="owner-contact-verification"'));
});

test("registration button has explicit high-contrast styling", () => {
  assert.ok(registerForm.includes('background: isLoading ? "#475569" : "#0f766e"'));
  assert.ok(registerForm.includes('color: "#ffffff"'));
  assert.ok(registerForm.includes("opacity: 1"));
});

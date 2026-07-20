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
});

test("checklist uses existing dashboard sections", () => {
  assert.ok(dashboard.includes("copy.listingSetup"));
  assert.ok(dashboard.includes("boatHasBasicInformation(selectedBoat)"));
  assert.ok(dashboard.includes("ownerHasRequiredDocuments(data)"));
  assert.ok(dashboard.includes("boatExperiences[getBoatExperienceKey(selectedBoat)]"));
  assert.ok(dashboard.includes("boatBlackouts[Number(selectedBoat.id)]"));
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

test("calendar checklist link targets the existing blackout calendar section", () => {
  assert.ok(dashboard.includes('boatSetupAnchor(selectedBoat, "calendar")'));
  assert.ok(dashboard.includes("OwnerAvailabilityCalendar"));
  assert.ok(dashboard.includes("/api/owner/blackouts"));
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

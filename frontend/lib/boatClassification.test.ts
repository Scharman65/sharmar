import assert from "node:assert/strict";
import test from "node:test";

import {
  asPropulsion,
  asVesselType,
  boatTypeFromVesselType,
  normalizePropulsion,
  normalizeVesselType,
  propulsionLabel,
  vesselTypeLabel,
} from "./boatClassification.ts";

test("accepts catamaran vessel type and rejects invalid vessel type", () => {
  assert.equal(asVesselType("catamaran"), "catamaran");
  assert.equal(asVesselType("motorboat"), "motorboat");
  assert.equal(asVesselType("sailboat"), "sailboat");
  assert.equal(asVesselType("trimaran"), null);
});

test("accepts valid propulsion and rejects invalid propulsion", () => {
  assert.equal(asPropulsion("sail"), "sail");
  assert.equal(asPropulsion("motor"), "motor");
  assert.equal(asPropulsion("hybrid"), null);
});

test("maps new vessel types to legacy boat_type without changing old values", () => {
  assert.equal(boatTypeFromVesselType("motorboat"), "Motorboat");
  assert.equal(boatTypeFromVesselType("sailboat"), "Sailboat");
  assert.equal(boatTypeFromVesselType("catamaran"), "Catamaran");
});

test("keeps old payloads without propulsion compatible", () => {
  assert.equal(normalizePropulsion(undefined, "motorboat"), "motor");
  assert.equal(normalizePropulsion(undefined, "sailboat"), "sail");
  assert.equal(normalizePropulsion(undefined, "catamaran"), "sail");
});

test("normalizes legacy raw boat_type values from existing rows", () => {
  assert.equal(normalizeVesselType("Catamaran"), "catamaran");
  assert.equal(normalizeVesselType("Sailboat"), "sailboat");
  assert.equal(normalizeVesselType("Motorboat"), "motorboat");
});

test("localizes catamaran and propulsion labels", () => {
  assert.equal(vesselTypeLabel("catamaran", "en"), "Catamaran");
  assert.equal(vesselTypeLabel("catamaran", "ru"), "Катамаран");
  assert.equal(vesselTypeLabel("catamaran", "me"), "Katamaran");
  assert.equal(vesselTypeLabel("catamaran", "sr-Latn-ME"), "Katamaran");
  assert.notEqual(vesselTypeLabel("catamaran", "en"), "catamaran");
  assert.equal(propulsionLabel("sail", "catamaran", "en"), "Sail");
  assert.equal(propulsionLabel("sail", "catamaran", "ru"), "Парусный");
  assert.equal(propulsionLabel("sail", "catamaran", "me"), "Jedra");
  assert.equal(propulsionLabel("motor", "catamaran", "en"), "Motor");
  assert.equal(propulsionLabel("motor", "catamaran", "ru"), "Моторный");
  assert.equal(propulsionLabel("motor", "catamaran", "me"), "Motor");
});

test("propulsion display fallback follows vessel type for legacy rows", () => {
  assert.equal(propulsionLabel(null, "motorboat", "en"), "Motor");
  assert.equal(propulsionLabel(null, "motorboat", "ru"), "Моторный");
  assert.equal(propulsionLabel(null, "motorboat", "me"), "Motor");

  assert.equal(propulsionLabel(null, "sailboat", "en"), "Sail");
  assert.equal(propulsionLabel(null, "sailboat", "ru"), "Парусный");
  assert.equal(propulsionLabel(null, "sailboat", "me"), "Jedra");

  assert.equal(propulsionLabel(null, "catamaran", "en"), "Sail");
  assert.equal(propulsionLabel(null, "catamaran", "ru"), "Парусный");
  assert.equal(propulsionLabel(null, "catamaran", "me"), "Jedra");

  assert.equal(propulsionLabel("motor", "catamaran", "en"), "Motor");
  assert.equal(propulsionLabel("motor", "catamaran", "ru"), "Моторный");
  assert.equal(propulsionLabel("motor", "catamaran", "me"), "Motor");
});

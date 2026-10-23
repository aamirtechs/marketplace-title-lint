"use strict";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../src/logic.js");

test("presets carry the documented limits", () => {
  assert.strictEqual(L.getPreset("amazon").maxChars, 200);
  assert.strictEqual(L.getPreset("ebay").maxChars, 140);
  assert.strictEqual(L.getPreset("etsy").maxChars, 140);
  assert.strictEqual(L.getPreset("shopify").maxChars, 255);
});

test("length check flags titles over the configurable limit", () => {
  const long = "Widget ".repeat(40).trim(); // 279 chars
  const r = L.lintTitle(long, { maxChars: 200 });
  assert.strictEqual(r.passed, false);
  assert.ok(r.violations.some(v => v.type === "length"));
  const ok = L.lintTitle("Short Widget Title", { maxChars: 200 });
  assert.strictEqual(ok.passed, true);
  const custom = L.lintTitle("12345678901", { maxChars: 10 });
  assert.strictEqual(custom.passed, false);
});

test("byte length counts multibyte characters", () => {
  assert.strictEqual(L.utf8ByteLength("abc"), 3);
  assert.strictEqual(L.utf8ByteLength("café"), 5);
  assert.strictEqual(L.utf8ByteLength(""), 0);
  const r = L.lintTitle("café café", { maxChars: 200, maxBytes: 8 });
  assert.ok(r.violations.some(v => v.type === "bytes"));
});

test("repeated word detection over the limit", () => {
  const reps = L.repeatedWords("steel steel steel bottle steel", 2);
  assert.strictEqual(reps.length, 1);
  assert.strictEqual(reps[0].word, "steel");
  assert.strictEqual(reps[0].count, 4);
  const r = L.lintTitle("steel steel steel bottle", {});
  assert.ok(r.violations.some(v => v.type === "repeat"));
  const twice = L.lintTitle("steel bottle steel cap", {});
  assert.ok(!twice.violations.some(v => v.type === "repeat"));
});

test("banned characters and promo words are flagged", () => {
  const r = L.lintTitle("Best Widget! Sale Price $pecial?", {});
  const types = r.violations.map(v => v.type);
  assert.ok(types.includes("banned-char"));
  assert.ok(types.includes("promo"));
  assert.ok(r.bannedChars.includes("!"));
  assert.ok(r.bannedChars.includes("$"));
  assert.ok(r.promoWords.includes("best"));
});

test("ALL-CAPS titles are flagged", () => {
  const r = L.lintTitle("SUPER STRONG STEEL BOTTLE FOR TRAVEL", {});
  assert.strictEqual(r.allCaps, true);
  assert.ok(r.violations.some(v => v.type === "all-caps"));
});

test("cleanTitle removes banned chars, extra repeats and trims to limit", () => {
  const cleaned = L.cleanTitle("Steel! Steel Steel Steel Bottle?", { maxChars: 200, maxRepeats: 2 });
  assert.ok(!cleaned.includes("!"));
  assert.ok(!cleaned.includes("?"));
  assert.strictEqual(cleaned.toLowerCase().split("steel").length - 1, 2);
  const longClean = L.cleanTitle("word ".repeat(60).trim(), { maxChars: 50 });
  assert.ok(longClean.length <= 50, "len " + longClean.length);
});

test("lintCSV finds the title column and builds both exports", () => {
  const csv = "sku,title,search terms\n1,Good Steel Bottle,steel bottle\n2,Bad! Bad! Bad! Title,bad title";
  const res = L.lintCSV(csv, { maxChars: 200 });
  assert.strictEqual(res.titleColumn, "title");
  assert.strictEqual(res.rows.length, 2);
  assert.strictEqual(res.rows[0].lint.passed, true);
  assert.strictEqual(res.rows[1].lint.passed, false);
  assert.ok(L.buildViolationsCSV(res).includes("banned-char"));
  assert.ok(L.buildCleanedCSV(res).includes("cleaned_title"));
});

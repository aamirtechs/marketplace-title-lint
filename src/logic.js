"use strict";
// Marketplace Title Lint: core logic (pure functions, no DOM).

function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", inQ = false;
  const s = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; } }
      else { cur += c; }
    } else if (c === '"') { inQ = true; }
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else { cur += c; }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  const clean = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  if (!clean.length) { return { headers: [], rows: [] }; }
  const headers = clean[0].map(function (h) { return String(h).trim(); });
  const out = clean.slice(1).map(function (r) {
    const o = {};
    headers.forEach(function (h, idx) { o[h] = r[idx] !== undefined ? String(r[idx]).trim() : ""; });
    return o;
  });
  return { headers: headers, rows: out };
}
function csvEscape(v) {
  const s = String(v === null || v === undefined ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(headers, rows) {
  return [headers.join(",")].concat(rows.map(function (r) {
    return headers.map(function (h) { return csvEscape(r[h]); }).join(",");
  })).join("\n");
}
function findColumn(headers, candidates) {
  const low = headers.map(function (h) { return h.toLowerCase(); });
  for (const c of candidates) { const i = low.indexOf(c); if (i >= 0) { return headers[i]; } }
  for (const c of candidates) { const i = low.findIndex(function (h) { return h.indexOf(c) !== -1; }); if (i >= 0) { return headers[i]; } }
  return null;
}

var DEFAULT_BANNED_CHARS = ["!", "$", "?", "_", "{", "}", "^", "~", "`", "<", ">", "|"];
var DEFAULT_PROMO_WORDS = ["best", "#1", "free shipping", "sale", "discount", "cheap", "guaranteed", "limited time", "buy now", "top rated", "best seller", "hot deal", "lowest price"];

var PRESETS = {
  amazon: { name: "Amazon", maxChars: 200, maxRepeats: 2, maxBytes: null },
  ebay: { name: "eBay", maxChars: 140, maxRepeats: 2, maxBytes: null },
  etsy: { name: "Etsy", maxChars: 140, maxRepeats: 2, maxBytes: null },
  shopify: { name: "Shopify", maxChars: 255, maxRepeats: 99, maxBytes: null }
};

function getPreset(name) {
  const p = PRESETS[String(name || "amazon").toLowerCase()];
  return p ? Object.assign({}, p) : Object.assign({}, PRESETS.amazon);
}

function utf8ByteLength(str) {
  let bytes = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x80) { bytes += 1; }
    else if (code < 0x800) { bytes += 2; }
    else if (code >= 0xD800 && code <= 0xDBFF) { bytes += 4; i++; }
    else { bytes += 3; }
  }
  return bytes;
}

function normalizeOptions(options) {
  const o = options || {};
  return {
    maxChars: o.maxChars !== undefined ? Number(o.maxChars) : 200,
    maxBytes: o.maxBytes !== undefined && o.maxBytes !== null ? Number(o.maxBytes) : null,
    maxRepeats: o.maxRepeats !== undefined ? Number(o.maxRepeats) : 2,
    bannedChars: o.bannedChars || DEFAULT_BANNED_CHARS,
    promoWords: o.promoWords || DEFAULT_PROMO_WORDS,
    capsRatioLimit: o.capsRatioLimit !== undefined ? Number(o.capsRatioLimit) : 0.8
  };
}

function repeatedWords(title, maxRepeats) {
  const counts = {};
  const words = String(title || "").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter(Boolean);
  words.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
  return Object.keys(counts).filter(function (w) { return counts[w] > maxRepeats; })
    .map(function (w) { return { word: w, count: counts[w] }; })
    .sort(function (a, b) { return b.count - a.count; });
}

function lintTitle(title, options) {
  const opts = normalizeOptions(options);
  const t = String(title || "");
  const violations = [];
  const charCount = t.length;
  const byteCount = utf8ByteLength(t);
  if (charCount > opts.maxChars) { violations.push({ type: "length", message: "Title is " + charCount + " chars, over the " + opts.maxChars + " limit" }); }
  if (opts.maxBytes !== null && byteCount > opts.maxBytes) { violations.push({ type: "bytes", message: "Title is " + byteCount + " bytes, over the " + opts.maxBytes + " byte limit" }); }
  const reps = repeatedWords(t, opts.maxRepeats);
  reps.forEach(function (r) { violations.push({ type: "repeat", message: 'Word "' + r.word + '" appears ' + r.count + " times (max " + opts.maxRepeats + ")" }); });
  const bannedFound = opts.bannedChars.filter(function (c) { return t.indexOf(c) !== -1; });
  bannedFound.forEach(function (c) { violations.push({ type: "banned-char", message: 'Banned character "' + c + '" found' }); });
  const letters = t.replace(/[^A-Za-z]/g, "");
  const upper = t.replace(/[^A-Z]/g, "");
  const capsRatio = letters.length ? upper.length / letters.length : 0;
  const allCaps = letters.length >= 8 && capsRatio > opts.capsRatioLimit;
  if (allCaps) { violations.push({ type: "all-caps", message: "Title is mostly ALL-CAPS" }); }
  const lower = " " + t.toLowerCase() + " ";
  const promoFound = opts.promoWords.filter(function (p) {
    const needle = String(p).toLowerCase();
    return lower.indexOf(needle) !== -1 && /[a-z0-9]/.test(needle);
  });
  promoFound.forEach(function (p) { violations.push({ type: "promo", message: 'Promo wording "' + p + '" found' }); });
  return {
    title: t, charCount: charCount, byteCount: byteCount,
    repeatedWords: reps, bannedChars: bannedFound, promoWords: promoFound,
    capsRatio: Math.round(capsRatio * 100) / 100, allCaps: allCaps,
    violations: violations, passed: violations.length === 0
  };
}

function cleanTitle(title, options) {
  const opts = normalizeOptions(options);
  let t = String(title || "");
  opts.bannedChars.forEach(function (c) { t = t.split(c).join(" "); });
  t = t.replace(/\s+/g, " ").trim();
  // Drop word occurrences beyond the repeat limit, keeping order.
  const seen = {};
  const kept = [];
  t.split(" ").forEach(function (w) {
    const key = w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
    if (key) {
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > opts.maxRepeats) { return; }
    }
    kept.push(w);
  });
  t = kept.join(" ");
  if (t.length > opts.maxChars) {
    let cut = t.slice(0, opts.maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > opts.maxChars * 0.6) { cut = cut.slice(0, lastSpace); }
    t = cut.trim();
  }
  return t;
}

function lintCSV(text, options) {
  const opts = options || {};
  const parsed = parseCSV(text);
  const titleCol = opts.titleColumn || findColumn(parsed.headers, ["title", "product title", "name", "listing"]);
  const termsCol = opts.termsColumn || findColumn(parsed.headers, ["search terms", "search_terms", "backend", "keywords"]);
  const rows = parsed.rows.map(function (r, i) {
    const title = titleCol ? r[titleCol] : "";
    const lint = lintTitle(title, opts);
    let termsBytes = null, termsOk = null;
    if (termsCol) {
      termsBytes = utf8ByteLength(r[termsCol] || "");
      termsOk = termsBytes <= (opts.maxTermsBytes || 250);
      if (!termsOk) { lint.violations.push({ type: "terms-bytes", message: "Search terms are " + termsBytes + " bytes, over the " + (opts.maxTermsBytes || 250) + " byte limit" }); lint.passed = false; }
    }
    return { row: i + 2, title: title, lint: lint, suggestion: cleanTitle(title, opts), termsBytes: termsBytes, termsOk: termsOk };
  });
  return { titleColumn: titleCol, termsColumn: termsCol, headers: parsed.headers, rows: rows };
}

function buildViolationsCSV(result) {
  const headers = ["row", "title", "chars", "bytes", "violation_type", "violation"];
  const rows = [];
  result.rows.forEach(function (r) {
    r.lint.violations.forEach(function (v) {
      rows.push({ row: r.row, title: r.title, chars: r.lint.charCount, bytes: r.lint.byteCount, violation_type: v.type, violation: v.message });
    });
  });
  return toCSV(headers, rows);
}
function buildCleanedCSV(result) {
  const headers = ["row", "original_title", "cleaned_title", "original_chars", "cleaned_chars", "status"];
  const rows = result.rows.map(function (r) {
    return { row: r.row, original_title: r.title, cleaned_title: r.suggestion, original_chars: r.lint.charCount, cleaned_chars: r.suggestion.length, status: r.lint.passed ? "pass" : "needs fix" };
  });
  return toCSV(headers, rows);
}

const api = { parseCSV, toCSV, findColumn, PRESETS, DEFAULT_BANNED_CHARS, DEFAULT_PROMO_WORDS, getPreset, utf8ByteLength, repeatedWords, lintTitle, cleanTitle, lintCSV, buildViolationsCSV, buildCleanedCSV };
if (typeof module !== "undefined" && module.exports) { module.exports = api; }
if (typeof window !== "undefined") { window.MarketplaceTitleLint = api; }

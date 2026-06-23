/**
 * Regression tests for Subresource Integrity (SRI) on remote <script>/<link> tags.
 *
 * BUG-010: hotspots.html shipped a fabricated integrity hash for leaflet.js, so
 * the browser refused to execute it and the map died with "L is not defined".
 * map.html carried the correct hash. The class of bug is: the SAME CDN asset
 * pinned with DIFFERENT (and therefore at-least-one-wrong) integrity hashes
 * across pages. These tests pin that down offline & deterministically — no
 * network fetch, in keeping with the project's network-ethics rule.
 *
 * What is NOT checked here: that a hash matches the bytes the CDN actually
 * serves (that needs a network fetch — done by hand at fix time with
 * `curl -sL <url> | openssl dgst -sha256 -binary | openssl base64`). The
 * cross-file consistency + well-formedness checks below catch a hand-typed or
 * hallucinated hash, which is how BUG-010 slipped in.
 *
 * Run: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML_FILES = ["index.html", "map.html", "hotspots.html", "anc.html", "laws.html"];

// Pull a single attribute's value out of a tag's attribute string.
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

// Every <script>/<link> tag across all HTML files, with the bits we care about.
function collectTags() {
  const tags = [];
  for (const file of HTML_FILES) {
    const html = readFileSync(join(ROOT, file), "utf8");
    for (const m of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
      const tag = m[0];
      const url = attr(tag, "src") || attr(tag, "href");
      tags.push({
        file,
        kind: m[1].toLowerCase(),
        url,
        rel: attr(tag, "rel"),
        integrity: attr(tag, "integrity"),
        crossorigin: tag.toLowerCase().includes("crossorigin"),
      });
    }
  }
  return tags;
}

// A remote resource the browser executes/applies: remote scripts and stylesheets.
function isRemoteSubresource(t) {
  if (!t.url || !/^https?:\/\//i.test(t.url)) return false;
  if (t.kind === "script") return true;
  if (t.kind === "link") return (t.rel || "").toLowerCase().includes("stylesheet");
  return false;
}

const TAGS = collectTags();
const REMOTE = TAGS.filter(isRemoteSubresource);

test("there is at least one remote subresource to guard (sanity)", () => {
  // If this fails the regexes stopped matching — the other tests would pass vacuously.
  assert.ok(REMOTE.length >= 2, `expected remote scripts/styles, found ${REMOTE.length}`);
});

test("every remote script/stylesheet declares an integrity hash", () => {
  const missing = REMOTE.filter((t) => !t.integrity).map((t) => `${t.file}: ${t.url}`);
  assert.deepEqual(missing, [], `remote subresources without SRI:\n${missing.join("\n")}`);
});

test("every integrity-pinned tag also sets crossorigin (SRI needs CORS)", () => {
  // Without crossorigin the browser blocks a cross-origin subresource that has
  // an integrity attribute — the asset silently fails to load.
  const bad = REMOTE.filter((t) => t.integrity && !t.crossorigin).map((t) => `${t.file}: ${t.url}`);
  assert.deepEqual(bad, [], `integrity without crossorigin:\n${bad.join("\n")}`);
});

test("integrity hashes are well-formed sha256/384/512 base64", () => {
  const SRI = /^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/;
  for (const t of REMOTE) {
    if (!t.integrity) continue;
    for (const token of t.integrity.trim().split(/\s+/)) {
      assert.match(token, SRI, `malformed integrity in ${t.file} for ${t.url}: "${token}"`);
    }
  }
});

test("the same remote URL is pinned to the same hash everywhere it appears", () => {
  // This is the direct BUG-010 regression: leaflet.js was pinned to one hash in
  // map.html and a different (wrong) hash in hotspots.html.
  const byUrl = new Map();
  for (const t of REMOTE) {
    if (!t.integrity) continue;
    if (!byUrl.has(t.url)) byUrl.set(t.url, []);
    byUrl.get(t.url).push({ file: t.file, integrity: t.integrity.trim() });
  }
  for (const [url, uses] of byUrl) {
    const distinct = [...new Set(uses.map((u) => u.integrity))];
    assert.equal(
      distinct.length,
      1,
      `inconsistent SRI hash for ${url}:\n` + uses.map((u) => `  ${u.file}: ${u.integrity}`).join("\n"),
    );
  }
});

test("Leaflet 1.9.4 is pinned to its known-good published hashes", () => {
  // Belt-and-suspenders: pin the exact upstream hashes so a wrong-but-consistent
  // edit (same bad hash pasted into both files) still fails. Verified against the
  // CDN artifacts at fix time.
  const KNOWN = {
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js":
      "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css":
      "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
  };
  for (const [url, expected] of Object.entries(KNOWN)) {
    const uses = REMOTE.filter((t) => t.url === url);
    assert.ok(uses.length > 0, `expected at least one reference to ${url}`);
    for (const u of uses) {
      assert.equal(u.integrity.trim(), expected, `${u.file} pins ${url} to a non-published hash`);
    }
  }
});

#!/usr/bin/env node
/**
 * Replace corrupted MyMemory quota warnings with English fallback.
 * Run: node scripts/i18n/sanitize-translations.mjs && node scripts/i18n/build-bundles.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");
const CACHE = path.join(__dirname, "cache");
const EN = path.join(MESSAGES, "en");

const BAD = /MYMEMORY WARNING/i;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sanitizeTree(enTree, locTree) {
  if (typeof enTree === "string") {
    if (typeof locTree === "string" && !BAD.test(locTree)) return locTree;
    return enTree;
  }
  if (Array.isArray(enTree)) {
    return enTree.map((v, i) => sanitizeTree(v, locTree?.[i]));
  }
  const out = {};
  for (const [k, v] of Object.entries(enTree)) {
    out[k] = sanitizeTree(v, locTree?.[k]);
  }
  return out;
}

const locales = fs.readdirSync(MESSAGES).filter((d) => d !== "en");
let fixed = 0;

for (const locale of locales) {
  const dir = path.join(MESSAGES, locale);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const enPath = path.join(EN, file);
    const locPath = path.join(dir, file);
    const raw = fs.readFileSync(locPath, "utf8");
    if (!BAD.test(raw)) continue;
    const enTree = readJson(enPath);
    const locTree = readJson(locPath);
    const clean = sanitizeTree(enTree, locTree);
    fs.writeFileSync(locPath, JSON.stringify(clean, null, 2) + "\n");
    fixed++;
  }
}

if (fs.existsSync(CACHE)) {
  for (const f of fs.readdirSync(CACHE)) {
    const content = fs.readFileSync(path.join(CACHE, f), "utf8");
    if (BAD.test(content)) fs.unlinkSync(path.join(CACHE, f));
  }
}

console.log(`Sanitized ${fixed} namespace files`);

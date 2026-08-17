#!/usr/bin/env node
/**
 * Fast parallel translation: dedupe strings, translate once per locale, apply to namespaces.
 * Preserves existing non-English translations in de/fa.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  protectPlaceholders,
  unprotectPlaceholders,
  restorePlaceholders,
  samePlaceholders,
} from "./placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");
const CACHE = path.join(__dirname, "cache");
const EN = path.join(MESSAGES, "en");
const CONCURRENCY = 8;

const LOCALES = [
  { code: "de", api: "de" },
  { code: "fa", api: "fa" },
  { code: "zh-CN", api: "zh-CN" },
  { code: "zh-TW", api: "zh-TW" },
  { code: "ja", api: "ja" },
  { code: "nl", api: "nl" },
  { code: "nl-BE", api: "nl" },
  { code: "fr", api: "fr" },
  { code: "fr-BE", api: "fr" },
  { code: "de-BE", api: "de" },
  { code: "es", api: "es" },
  { code: "it", api: "it" },
  { code: "pt", api: "pt" },
  { code: "pt-BR", api: "pt-BR" },
  { code: "ru", api: "ru" },
  { code: "tr", api: "tr" },
  { code: "ar", api: "ar" },
  { code: "ko", api: "ko" },
  { code: "pl", api: "pl" },
  { code: "uk", api: "uk" },
  { code: "hi", api: "hi" },
  { code: "id", api: "id" },
  { code: "vi", api: "vi" },
];

const NAMESPACES = fs
  .readdirSync(EN)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

function cacheKey(text, locale) {
  return crypto.createHash("sha256").update(`${locale}:${text}`).digest("hex");
}

function readCache(key) {
  const file = path.join(CACHE, `${key}.txt`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function writeCache(key, value) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, `${key}.txt`), value);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function collectStrings(tree, out = new Set()) {
  if (typeof tree === "string") {
    out.add(tree);
    return out;
  }
  if (Array.isArray(tree)) {
    tree.forEach((v) => collectStrings(v, out));
    return out;
  }
  Object.values(tree).forEach((v) => collectStrings(v, out));
  return out;
}

function applyMap(tree, map) {
  if (typeof tree === "string") return map.get(tree) ?? tree;
  if (Array.isArray(tree)) return tree.map((v) => applyMap(v, map));
  const out = {};
  for (const [k, v] of Object.entries(tree)) out[k] = applyMap(v, map);
  return out;
}

function collectExistingTranslations(enTree, localeTree, map) {
  if (typeof enTree === "string" && typeof localeTree === "string") {
    if (localeTree !== enTree) map.set(enTree, localeTree);
    return;
  }
  if (Array.isArray(enTree)) {
    enTree.forEach((v, i) => collectExistingTranslations(v, localeTree?.[i], map));
    return;
  }
  if (enTree && typeof enTree === "object") {
    for (const k of Object.keys(enTree)) {
      collectExistingTranslations(enTree[k], localeTree?.[k], map);
    }
  }
}

async function translateOne(text, apiLang) {
  if (!text?.trim()) return text;
  if (/^[\d\s.,:;+\-–—/\\|()[\]{}#@$%^&*<>~`'"!?]+$/.test(text)) return text;

  const protectedText = protectPlaceholders(text);
  const key = cacheKey(protectedText, apiLang);
  const cached = readCache(key);
  if (cached) {
    const restored = unprotectPlaceholders(cached);
    return samePlaceholders(text, restored) ? restored : restorePlaceholders(text, restored);
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(protectedText.slice(0, 500))}&langpair=en|${apiLang}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.quotaFinished) {
        await sleep(4000);
        continue;
      }
      const raw = data.responseData?.translatedText ?? protectedText;
      const out = unprotectPlaceholders(raw);
      const final = samePlaceholders(text, out) ? out : restorePlaceholders(text, out);
      writeCache(key, protectPlaceholders(final));
      return final;
    } catch {
      await sleep(1500);
    }
  }
  return text;
}

async function poolMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function translateLocale(code, api) {
  const localeDir = path.join(MESSAGES, code);
  fs.mkdirSync(localeDir, { recursive: true });

  const translationMap = new Map();

  // Preserve existing translations
  for (const ns of NAMESPACES) {
    const enTree = JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"));
    const locPath = path.join(localeDir, `${ns}.json`);
    if (fs.existsSync(locPath)) {
      collectExistingTranslations(enTree, JSON.parse(fs.readFileSync(locPath, "utf8")), translationMap);
    }
  }

  const allEnStrings = [...collectStrings(
    Object.fromEntries(NAMESPACES.map((ns) => [ns, JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"))])),
  )];

  const toTranslate = allEnStrings.filter((s) => !translationMap.has(s));
  console.log(`  ${code}: ${translationMap.size} preserved, ${toTranslate.length} to translate`);

  await poolMap(
    toTranslate,
    async (text) => {
      const translated = await translateOne(text, api);
      translationMap.set(text, translated);
      await sleep(120);
    },
    CONCURRENCY,
  );

  for (const ns of NAMESPACES) {
    const enTree = JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"));
    const out = applyMap(enTree, translationMap);
    fs.writeFileSync(path.join(localeDir, `${ns}.json`), JSON.stringify(out, null, 2) + "\n");
  }
}

async function main() {
  console.log("Parallel translation starting…");
  for (const { code, api } of LOCALES) {
    console.log(`\n=== ${code} ===`);
    await translateLocale(code, api);
  }
  console.log("\nDone. Validating…");
  const result = spawnSync(process.execPath, [path.join(__dirname, "validate-i18n.mjs")], {
    stdio: "inherit",
  });
  if (result.status) process.exit(result.status);
  console.log("Run: node scripts/i18n/build-bundles.mjs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

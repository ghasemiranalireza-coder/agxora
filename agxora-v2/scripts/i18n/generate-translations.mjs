#!/usr/bin/env node
/**
 * Generate locale namespace files from English using MyMemory API + disk cache.
 * Preserves existing de/fa translations. Run: node scripts/i18n/generate-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");
const CACHE = path.join(__dirname, "cache");
const EN = path.join(MESSAGES, "en");

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

const SKIP_TRANSLATE = new Set([
  "AGXORA",
  "AGX",
  "CRM",
  "API",
  "AI",
  "OS",
  "IAM",
  "KPI",
  "URL",
  "UUID",
  "ERP",
  "SaaS",
  "DATEV",
  "OAuth",
  "Stripe",
  "PostgreSQL",
  "OpenAI",
  "Anthropic",
  "Azure",
  "Ollama",
  "OpenRouter",
  "UTC",
  "EUR",
  "USD",
]);

function cacheKey(text, locale) {
  return crypto.createHash("sha256").update(`${locale}:${text}`).digest("hex");
}

function readCache(key) {
  const file = path.join(CACHE, `${key}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  return null;
}

function writeCache(key, value) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, `${key}.txt`), value);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text, apiLang) {
  if (!text || !text.trim()) return text;
  if (/^[\d\s.,:;+\-–—/\\|()[\]{}#@$%^&*<>~`'"!?]+$/.test(text)) return text;
  if (/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d.,:;+\-–—/\\|()[\]{}#@$%^&*<>~`'"!?]+$/.test(text)) return text;
  if (text.includes("{") && text.includes("}")) {
    const parts = text.split(/(\{[^}]+\})/g);
    const translated = await Promise.all(
      parts.map(async (part) =>
        part.startsWith("{") && part.endsWith("}") ? part : translateText(part, apiLang),
      ),
    );
    return translated.join("");
  }

  const key = cacheKey(text, apiLang);
  const cached = readCache(key);
  if (cached) return cached;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${apiLang}`;
  let attempt = 0;
  while (attempt < 5) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.quotaFinished) {
        await sleep(5000);
        attempt++;
        continue;
      }
      const out = data.responseData?.translatedText ?? text;
      writeCache(key, out);
      await sleep(350);
      return out;
    } catch {
      await sleep(2000);
      attempt++;
    }
  }
  return text;
}

function shouldSkip(text) {
  if (SKIP_TRANSLATE.has(text)) return true;
  if (/^https?:\/\//.test(text)) return true;
  if (/^[A-Z0-9_]+$/.test(text)) return true;
  return false;
}

async function translateTree(enTree, existingTree, apiLang) {
  if (typeof enTree === "string") {
    if (existingTree && typeof existingTree === "string" && existingTree !== enTree) {
      return existingTree;
    }
    if (shouldSkip(enTree)) return enTree;
    return translateText(enTree, apiLang);
  }
  if (Array.isArray(enTree)) {
    const existing = Array.isArray(existingTree) ? existingTree : [];
    const out = [];
    for (let i = 0; i < enTree.length; i++) {
      out.push(await translateTree(enTree[i], existing[i], apiLang));
    }
    return out;
  }
  const out = {};
  for (const [key, value] of Object.entries(enTree)) {
    out[key] = await translateTree(value, existingTree?.[key], apiLang);
  }
  return out;
}

async function main() {
  console.log(`Translating ${NAMESPACES.length} namespaces for ${LOCALES.length} locales…`);
  for (const { code, api } of LOCALES) {
    const localeDir = path.join(MESSAGES, code);
    fs.mkdirSync(localeDir, { recursive: true });
    console.log(`\n=== ${code} ===`);
    for (const ns of NAMESPACES) {
      const enPath = path.join(EN, `${ns}.json`);
      const outPath = path.join(localeDir, `${ns}.json`);
      const enTree = JSON.parse(fs.readFileSync(enPath, "utf8"));
      let existing = {};
      if (fs.existsSync(outPath)) {
        existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
      }
      process.stdout.write(`  ${ns}… `);
      const translated = await translateTree(enTree, existing, api);
      fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + "\n");
      console.log("done");
    }
  }
  console.log("\nComplete. Run: node scripts/i18n/build-bundles.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

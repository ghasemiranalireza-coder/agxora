#!/usr/bin/env node
/**
 * Fail if locale source files are missing keys or change placeholder names.
 * Run: node scripts/i18n/validate-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectLeafMap,
  extractPlaceholders,
  samePlaceholders,
} from "./placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");

const REQUIRED_LOCALES = [
  "en", "de", "fa", "zh-CN", "zh-TW", "ja", "nl", "nl-BE", "fr", "fr-BE",
  "de-BE", "es", "it", "pt", "pt-BR", "ru", "tr", "ar", "ko", "pl", "uk",
  "hi", "id", "vi",
];

const NAMESPACES = fs
  .readdirSync(path.join(MESSAGES, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

function loadLocale(locale) {
  const tree = {};
  for (const ns of NAMESPACES) {
    const file = path.join(MESSAGES, locale, `${ns}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing namespace file: ${locale}/${ns}.json`);
    }
    tree[ns] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return tree;
}

const enTree = loadLocale("en");
const enLeaves = collectLeafMap(enTree);
const missing = [];
const extra = [];
const placeholderMismatches = [];

for (const locale of REQUIRED_LOCALES) {
  if (locale === "en") continue;
  const locTree = loadLocale(locale);
  const locLeaves = collectLeafMap(locTree);
  for (const key of enLeaves.keys()) {
    if (!locLeaves.has(key)) missing.push(`${locale}:${key}`);
  }
  for (const key of locLeaves.keys()) {
    if (!enLeaves.has(key)) extra.push(`${locale}:${key}`);
  }
  for (const [key, enVal] of enLeaves) {
    const locVal = locLeaves.get(key);
    if (typeof enVal !== "string" || typeof locVal !== "string") continue;
    if (!samePlaceholders(enVal, locVal)) {
      placeholderMismatches.push({
        locale,
        key,
        en: extractPlaceholders(enVal).join(","),
        loc: extractPlaceholders(locVal).join(","),
        sample: locVal.slice(0, 80),
      });
    }
  }
}

let failed = false;

if (missing.length) {
  failed = true;
  console.error(`Missing keys: ${missing.length}`);
  for (const row of missing.slice(0, 40)) console.error(`  - ${row}`);
  if (missing.length > 40) console.error(`  … ${missing.length - 40} more`);
}

if (placeholderMismatches.length) {
  failed = true;
  console.error(`Placeholder mismatches: ${placeholderMismatches.length}`);
  for (const row of placeholderMismatches.slice(0, 40)) {
    console.error(
      `  - ${row.locale} ${row.key} en={${row.en}} loc={${row.loc}} :: ${row.sample}`,
    );
  }
  if (placeholderMismatches.length > 40) {
    console.error(`  … ${placeholderMismatches.length - 40} more`);
  }
}

if (extra.length) {
  console.warn(`Extra keys (non-fatal): ${extra.length}`);
}

if (failed) {
  process.exit(1);
}

console.log(
  `i18n validation OK — ${REQUIRED_LOCALES.length} locales, ${enLeaves.size} English leaves, placeholders match.`,
);

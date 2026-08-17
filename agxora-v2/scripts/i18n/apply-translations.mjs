#!/usr/bin/env node
/**
 * Apply curated translations onto locale namespace JSON files.
 * Also copies parent locales onto Belgian / Brazilian variants when missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TRANSLATIONS } from "./translations-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "../../app/lib/i18n/messages");

const PARENT = {
  "nl-BE": "nl",
  "fr-BE": "fr",
  "de-BE": "de",
  "pt-BR": "pt",
};

const NAMESPACES = fs
  .readdirSync(path.join(MESSAGES, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object" || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function applyLocale(locale, keyMap) {
  const trees = {};
  for (const ns of NAMESPACES) {
    const file = path.join(MESSAGES, locale, `${ns}.json`);
    trees[ns] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  for (const [dotted, value] of Object.entries(keyMap)) {
    const ns = dotted.split(".")[0];
    const rest = dotted.slice(ns.length + 1);
    if (!trees[ns]) continue;
    setPath(trees[ns], rest, value);
  }
  for (const ns of NAMESPACES) {
    fs.writeFileSync(
      path.join(MESSAGES, locale, `${ns}.json`),
      JSON.stringify(trees[ns], null, 2) + "\n",
    );
  }
}

export function applyTranslations(dataset) {
  const byLocale = {};
  for (const [key, locales] of Object.entries(dataset)) {
    for (const [locale, value] of Object.entries(locales)) {
      if (!byLocale[locale]) byLocale[locale] = {};
      byLocale[locale][key] = value;
    }
  }

  for (const [child, parent] of Object.entries(PARENT)) {
    if (!byLocale[child]) byLocale[child] = { ...(byLocale[parent] ?? {}) };
    else {
      byLocale[child] = { ...(byLocale[parent] ?? {}), ...byLocale[child] };
    }
  }

  let locales = 0;
  let keys = 0;
  for (const [locale, keyMap] of Object.entries(byLocale)) {
    const dir = path.join(MESSAGES, locale);
    if (!fs.existsSync(dir)) continue;
    applyLocale(locale, keyMap);
    locales += 1;
    keys += Object.keys(keyMap).length;
  }

  console.log(`Applied curated translations to ${locales} locales (${keys} key writes).`);
}

export function copyRegional() {
  applyTranslations({});
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  applyTranslations(TRANSLATIONS);
}

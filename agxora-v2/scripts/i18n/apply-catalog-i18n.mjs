#!/usr/bin/env node
/**
 * Merge remaining catalog keys into the existing i18n message trees
 * and apply curated locale overlays. Does not create a second i18n system.
 *
 * Run: node scripts/i18n/apply-catalog-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_EN } from "./catalog-keys.mjs";
import { PARENT } from "./quality-overlay.mjs";
import { AGENTS_OVERLAY } from "./catalog-overlay-agents.mjs";
import { AGENTS_META_OVERLAY } from "./catalog-overlay-agents-meta.mjs";
import { INTEGRATIONS_OVERLAY } from "./catalog-overlay-integrations.mjs";
import { INTELLIGENCE_OVERLAY } from "./catalog-overlay-intelligence.mjs";
import { CREATOR_OVERLAY } from "./catalog-overlay-creator.mjs";
import {
  CREATOR_DATA_OVERLAY,
  CREATOR_FORMAT_DESC_OVERLAY,
} from "./catalog-overlay-creator-data.mjs";
import { AUTOMATION_OVERLAY, BILLING_OVERLAY } from "./catalog-overlay-automation.mjs";
import { TEMPLATES_OVERLAY } from "./catalog-overlay-templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "../../app/lib/i18n/messages");

const LOCALES = fs.readdirSync(MESSAGES).filter((name) => {
  const full = path.join(MESSAGES, name);
  return fs.statSync(full).isDirectory();
});

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      target[key] = {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, next));
    } else if (typeof value === "string") {
      out[next] = value;
    }
  }
  return out;
}

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

function getPath(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

const OVERLAYS = [
  AGENTS_OVERLAY,
  AGENTS_META_OVERLAY,
  INTEGRATIONS_OVERLAY,
  INTELLIGENCE_OVERLAY,
  CREATOR_OVERLAY,
  CREATOR_DATA_OVERLAY,
  CREATOR_FORMAT_DESC_OVERLAY,
  AUTOMATION_OVERLAY,
  BILLING_OVERLAY,
  TEMPLATES_OVERLAY,
];

function collectOverlay() {
  const merged = {};
  for (const overlay of OVERLAYS) {
    if (!overlay) continue;
    for (const [key, locMap] of Object.entries(overlay)) {
      merged[key] = locMap;
    }
  }
  return merged;
}

function applyKeyMap(trees, keyMap) {
  for (const [dotted, value] of Object.entries(keyMap)) {
    const ns = dotted.split(".")[0];
    const rest = dotted.slice(ns.length + 1);
    if (!trees[ns] || typeof value !== "string") continue;
    setPath(trees[ns], rest, value);
  }
}

const NAMESPACES = Object.keys(CATALOG_EN);

for (const ns of NAMESPACES) {
  const file = path.join(MESSAGES, "en", `${ns}.json`);
  const current = JSON.parse(fs.readFileSync(file, "utf8"));
  deepMerge(current, CATALOG_EN[ns]);
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
}

const englishFlat = flatten(CATALOG_EN);
const overlay = collectOverlay();
const missingOverlay = Object.keys(englishFlat).filter((key) => !overlay[key]);

for (const locale of LOCALES) {
  const trees = {};
  const nsFiles = fs
    .readdirSync(path.join(MESSAGES, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
  for (const ns of nsFiles) {
    trees[ns] = JSON.parse(
      fs.readFileSync(path.join(MESSAGES, locale, `${ns}.json`), "utf8"),
    );
  }
  for (const ns of NAMESPACES) {
    if (!trees[ns]) trees[ns] = {};
  }

  if (locale !== "en") {
    for (const [key, enVal] of Object.entries(englishFlat)) {
      const ns = key.split(".")[0];
      const rest = key.slice(ns.length + 1);
      if (!trees[ns]) trees[ns] = {};
      if (typeof getPath(trees[ns], rest) !== "string") {
        setPath(trees[ns], rest, enVal);
      }
    }
    const localeMap = {};
    for (const [key, locMap] of Object.entries(overlay)) {
      const value = locMap[locale] ?? locMap[PARENT[locale]];
      if (value) localeMap[key] = value;
    }
    applyKeyMap(trees, localeMap);
  }

  for (const ns of NAMESPACES) {
    fs.writeFileSync(
      path.join(MESSAGES, locale, `${ns}.json`),
      JSON.stringify(trees[ns], null, 2) + "\n",
    );
  }
}

const TOKEN_OK = /^(CRM|API|MRR|ARR|CTR|MCP|RAG|DATEV|POS|BOM|QC|AI|ERP|HR|Ops|OAuth 2\.0|Webhook|API key|NPS-Proxy|NPS proxy)$/i;
const faTrees = {};
for (const ns of NAMESPACES) {
  faTrees[ns] = JSON.parse(
    fs.readFileSync(path.join(MESSAGES, "fa", `${ns}.json`), "utf8"),
  );
}
const faEnglish = [];
for (const [key, enVal] of Object.entries(englishFlat)) {
  if (TOKEN_OK.test(enVal)) continue;
  const ns = key.split(".")[0];
  const rest = key.slice(ns.length + 1);
  const faVal = getPath(faTrees[ns], rest);
  if (typeof faVal === "string" && faVal === enVal) {
    faEnglish.push(key);
  }
}

console.log(`Catalog i18n applied to ${LOCALES.length} locales.`);
console.log(`English catalog keys: ${Object.keys(englishFlat).length}`);
console.log(`Overlay keys: ${Object.keys(overlay).length}`);
console.log(`Keys without overlay (English copy in non-en locales): ${missingOverlay.length}`);
if (missingOverlay.length) {
  for (const key of missingOverlay.slice(0, 40)) console.log(`  - ${key}`);
  if (missingOverlay.length > 40) console.log(`  … ${missingOverlay.length - 40} more`);
}
console.log(`Persian leftovers matching English catalog: ${faEnglish.length}`);
if (faEnglish.length) {
  for (const key of faEnglish.slice(0, 40)) console.log(`  - ${key}`);
  if (faEnglish.length > 40) console.log(`  … ${faEnglish.length - 40} more`);
}

#!/usr/bin/env node
/**
 * Generate locale files using Google Translate (unofficial gtx endpoint) + cache.
 * Preserves de/fa existing translations. Run: node scripts/i18n/translate-google.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");
const CACHE = path.join(__dirname, "cache-google");
const EN = path.join(MESSAGES, "en");
const CONCURRENCY = 6;

const LOCALES = [
  { code: "zh-CN", tl: "zh-CN" },
  { code: "zh-TW", tl: "zh-TW" },
  { code: "ja", tl: "ja" },
  { code: "nl", tl: "nl" },
  { code: "nl-BE", tl: "nl" },
  { code: "fr", tl: "fr" },
  { code: "fr-BE", tl: "fr" },
  { code: "de-BE", tl: "de" },
  { code: "es", tl: "es" },
  { code: "it", tl: "it" },
  { code: "pt", tl: "pt" },
  { code: "pt-BR", tl: "pt" },
  { code: "ru", tl: "ru" },
  { code: "tr", tl: "tr" },
  { code: "ar", tl: "ar" },
  { code: "ko", tl: "ko" },
  { code: "pl", tl: "pl" },
  { code: "uk", tl: "uk" },
  { code: "hi", tl: "hi" },
  { code: "id", tl: "id" },
  { code: "vi", tl: "vi" },
];

const NAMESPACES = fs.readdirSync(EN).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

function cacheKey(text, tl) {
  return crypto.createHash("sha256").update(`${tl}:${text}`).digest("hex");
}

function readCache(key) {
  const f = path.join(CACHE, `${key}.txt`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

function writeCache(key, val) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path.join(CACHE, `${key}.txt`), val);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateGoogle(text, tl) {
  if (!text?.trim()) return text;
  if (/^[\d\s.,:;+\-–—/\\|()[\]{}#@$%^&*<>~`'"!?]+$/.test(text)) return text;

  const key = cacheKey(text, tl);
  const cached = readCache(key);
  if (cached) return cached;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text.slice(0, 4500))}`;

  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const data = await res.json();
      const out = data?.[0]?.map((seg) => seg[0]).join("") ?? text;
      writeCache(key, out);
      await sleep(150);
      return out;
    } catch {
      await sleep(1000);
    }
  }
  return text;
}

function collectStrings(tree, out = new Set()) {
  if (typeof tree === "string") { out.add(tree); return out; }
  if (Array.isArray(tree)) tree.forEach((v) => collectStrings(v, out));
  else Object.values(tree).forEach((v) => collectStrings(v, out));
  return out;
}

function applyMap(tree, map) {
  if (typeof tree === "string") return map.get(tree) ?? tree;
  if (Array.isArray(tree)) return tree.map((v) => applyMap(v, map));
  const out = {};
  for (const [k, v] of Object.entries(tree)) out[k] = applyMap(v, map);
  return out;
}

function collectExisting(enTree, locTree, map) {
  if (typeof enTree === "string" && typeof locTree === "string" && locTree !== enTree) {
    map.set(enTree, locTree);
    return;
  }
  if (Array.isArray(enTree)) enTree.forEach((v, i) => collectExisting(v, locTree?.[i], map));
  else if (enTree && typeof enTree === "object")
    for (const k of Object.keys(enTree)) collectExisting(enTree[k], locTree?.[k], map);
}

async function poolMap(items, fn, n) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

async function translateLocale(code, tl) {
  const dir = path.join(MESSAGES, code);
  fs.mkdirSync(dir, { recursive: true });
  const map = new Map();

  for (const ns of NAMESPACES) {
    const enTree = JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"));
    const locPath = path.join(dir, `${ns}.json`);
    if (fs.existsSync(locPath)) collectExisting(enTree, JSON.parse(fs.readFileSync(locPath, "utf8")), map);
  }

  const enAll = [...collectStrings(Object.fromEntries(NAMESPACES.map((ns) => [ns, JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"))])) )];
  const todo = enAll.filter((s) => !map.has(s) || map.get(s) === s);
  console.log(`  ${code}: ${map.size} preserved, ${todo.length} to translate`);

  await poolMap(todo, async (text) => {
    const tr = await translateGoogle(text, tl);
    map.set(text, tr);
  }, CONCURRENCY);

  for (const ns of NAMESPACES) {
    const enTree = JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"));
    fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(applyMap(enTree, map), null, 2) + "\n");
  }
}

async function main() {
  console.log("Google Translate generation…");
  for (const { code, tl } of LOCALES) {
    console.log(`\n=== ${code} ===`);
    await translateLocale(code, tl);
  }
  console.log("\nDone. Run: node scripts/i18n/build-bundles.mjs");
}

main().catch((e) => { console.error(e); process.exit(1); });

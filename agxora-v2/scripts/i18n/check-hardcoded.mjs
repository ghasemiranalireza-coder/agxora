#!/usr/bin/env node
/**
 * Detect likely hardcoded user-facing English in TS/TSX UI producers.
 * Exits non-zero when real UI copy remains.
 *
 * Run: node scripts/i18n/check-hardcoded.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const SCAN_DIRS = ["app/components", "app", "features"];

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  "api",
  "messages",
  "bundles",
  "generated",
  "email",
]);

const IGNORE_FILE_NAMES = new Set([
  "AgxoraGlobe3D.tsx",
  "catalog.ts",
  "mock-data.ts",
  "errorMap.ts",
  "opengraph-image.tsx",
  "twitter-image.tsx",
]);

const ALLOW_EXACT = new Set([
  "AGXORA",
  "new Promise",
  "Promise",
  "API",
  "CRM",
  "HTTP",
  "HTTPS",
  "JSON",
  "UTC",
  "SSR",
  "SEO",
  "JWT",
  "RBAC",
  "IAM",
  "AI",
  "OS",
  "ID",
  "VAT",
  "EUR",
  "USD",
  "OK",
  "AGX",
  "TypeError",
  "Error",
  "true",
  "false",
  "null",
  "undefined",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const ALLOW_RE = [
  /^[a-z][a-zA-Z0-9_.-]*\.[a-zA-Z0-9_.-]+$/, // i18n keys
  /^\/[a-z0-9\-/_#[\]?=&]*$/i, // routes
  /^https?:\/\//i,
  /^[A-Z0-9_./-]+$/, // identifiers / env / codes
  /^#[0-9a-fA-F]{3,8}$/,
  /^\d/,
  /\{[a-zA-Z0-9_]+\}/, // already interpolated templates kept in catalogs
  /^(var|color-mix|linear-gradient|rgb|rgba|hsl)\(/,
  /^(flex|grid|block|none|absolute|relative|fixed|sticky)$/,
  /^(en|de|fa|nl|fr|es|it|pt|ru|tr|ar|ko|pl|uk|hi|id|vi|ja|zh)([-_][A-Z]{2})?$/,
];

const UI_ATTR =
  /(?:title|label|placeholder|aria-label|aria-description|alt|emptyTitle|emptyDescription)\s*=\s*["']([A-Za-z][^"']{2,80})["']/g;
const JSX_TEXT = />\s*([A-Za-z][A-Za-z0-9\s,'’—–.-]{2,80})\s*</g;
const DEFAULT_PROP =
  /\b(?:label|title|placeholder|message|description|emptyTitle|emptyDescription|actionLabel)\s*=\s*["']([A-Z][^"']{2,80})["']/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name)) continue;
      walk(full, out);
    } else if (
      (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) &&
      !IGNORE_FILE_NAMES.has(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".d.ts") &&
      !entry.name.endsWith("-image.tsx")
    ) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function allowed(hit) {
  const s = hit.trim();
  if (s.length < 3) return true;
  if (ALLOW_EXACT.has(s)) return true;
  if (ALLOW_RE.some((re) => re.test(s))) return true;
  if (/^t\(|useT\(|resolveMessage\(/.test(s)) return true;
  if (!/[a-z]/.test(s) && s.length < 24) return true;
  return false;
}

function looksLikeUiEnglish(s) {
  if (allowed(s)) return false;
  if (/^[a-z]+([A-Z][a-z]+)+$/.test(s)) return false; // camelCase
  if (!/\s/.test(s) && s.length < 18) return false;
  return /[A-Za-z]/.test(s);
}

function scanFile(file) {
  const rel = path.relative(ROOT, file);
  const raw = stripComments(fs.readFileSync(file, "utf8"));
  const hits = [];
  let m;
  const attr = new RegExp(UI_ATTR.source, "g");
  const jsx = new RegExp(JSX_TEXT.source, "g");
  const def = new RegExp(DEFAULT_PROP.source, "g");
  while ((m = attr.exec(raw))) hits.push(m[1].trim());
  if (file.endsWith(".tsx")) {
    while ((m = jsx.exec(raw))) hits.push(m[1].trim());
  }
  while ((m = def.exec(raw))) hits.push(m[1].trim());
  const unique = [...new Set(hits)].filter(looksLikeUiEnglish);
  return unique.length ? { rel, hits: unique.slice(0, 12) } : null;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const results = files.map(scanFile).filter(Boolean);

console.log(`Scanned ${files.length} TS/TSX files`);
console.log(`Files with hardcoded user-facing English: ${results.length}`);
for (const r of results.slice(0, 60)) {
  console.log(`\n${r.rel}`);
  for (const h of r.hits) console.log(`  - ${h}`);
}
if (results.length > 60) console.log(`\n… and ${results.length - 60} more`);

if (results.length > 0) {
  process.exit(1);
}

console.log("Hardcoded UI string audit passed.");

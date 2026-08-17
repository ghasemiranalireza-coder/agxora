#!/usr/bin/env node
/**
 * Detect likely hardcoded user-facing strings in TSX files.
 * Run: node scripts/i18n/check-hardcoded.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const SCAN_DIRS = [
  "app/components",
  "app",
  "features",
];

const IGNORE_FILES = new Set([
  "AgxoraGlobe3D.tsx",
]);

const PATTERNS = [
  /\bt\(\s*["']/,
  /useT\(/,
  /useLocale\(/,
  /resolveMessage\(/,
];

const UI_ATTR = /(?:title|label|placeholder|aria-label|aria-description|alt)=["']([A-Za-z][^"']{2,80})["']/g;
const JSX_TEXT = />\s*([A-Za-z][A-Za-z\s,'—–-]{2,60})\s*</g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "api") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".tsx") && !IGNORE_FILES.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scanFile(file) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  if (PATTERNS.some((p) => p.test(text))) {
    // file uses i18n — still scan for leftovers
  }
  const hits = [];
  let m;
  while ((m = UI_ATTR.exec(text))) hits.push(m[1]);
  while ((m = JSX_TEXT.exec(text))) {
    const s = m[1].trim();
    if (!/^\{/.test(s) && !/^AGXORA$/.test(s) && s.length > 2) hits.push(s);
  }
  return hits.length ? { rel, hits: [...new Set(hits)].slice(0, 8) } : null;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const results = files.map(scanFile).filter(Boolean);

console.log(`Scanned ${files.length} TSX files`);
console.log(`Files with potential hardcoded UI strings: ${results.length}`);
for (const r of results.slice(0, 40)) {
  console.log(`\n${r.rel}`);
  for (const h of r.hits) console.log(`  - ${h}`);
}
if (results.length > 40) console.log(`\n… and ${results.length - 40} more`);

process.exit(results.length > 0 ? 0 : 0);

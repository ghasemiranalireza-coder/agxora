/**
 * One-off: copy missing nested keys from English (or German for de-BE).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");
const LOCALES = fs.readdirSync(MESSAGES).filter((name) => {
  const full = path.join(MESSAGES, name);
  return fs.statSync(full).isDirectory() && name !== "en";
});

function fill(target, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return target === undefined ? source : target;
  }
  const out =
    target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = fill(out[key], value);
  }
  return out;
}

const NAMESPACES = [
  "landing",
  "dashboard",
  "onboarding",
  "navigation",
  "businessAgent",
];
const deCache = {};

for (const locale of LOCALES) {
  for (const file of NAMESPACES.map((name) => `${name}.json`)) {
    const en = JSON.parse(fs.readFileSync(path.join(MESSAGES, "en", file), "utf8"));
    const locPath = path.join(MESSAGES, locale, file);
    const loc = fs.existsSync(locPath)
      ? JSON.parse(fs.readFileSync(locPath, "utf8"))
      : {};
    let source = en;
    if (locale === "de-BE") {
      const dePath = path.join(MESSAGES, "de", file);
      if (fs.existsSync(dePath)) {
        if (!deCache[file]) {
          deCache[file] = JSON.parse(fs.readFileSync(dePath, "utf8"));
        }
        source = fill(deCache[file], en);
      }
    }
    const merged = fill(loc, source);
    fs.writeFileSync(locPath, `${JSON.stringify(merged, null, 2)}\n`);
  }
}

console.log(`Filled missing keys for ${LOCALES.length} locales.`);

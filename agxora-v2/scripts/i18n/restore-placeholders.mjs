#!/usr/bin/env node
/**
 * Restore English interpolation placeholder names in all locale JSON files.
 * Run: node scripts/i18n/restore-placeholders.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectLeafMap,
  mapLeaves,
  restorePlaceholders,
  samePlaceholders,
} from "./placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MESSAGES = path.join(ROOT, "app/lib/i18n/messages");

const LOCALES = fs.readdirSync(MESSAGES).filter((d) => {
  const p = path.join(MESSAGES, d);
  return fs.statSync(p).isDirectory() && d !== "en";
});

const NAMESPACES = fs
  .readdirSync(path.join(MESSAGES, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

let files = 0;
let changedLeaves = 0;

for (const locale of LOCALES) {
  for (const ns of NAMESPACES) {
    const enPath = path.join(MESSAGES, "en", `${ns}.json`);
    const locPath = path.join(MESSAGES, locale, `${ns}.json`);
    if (!fs.existsSync(locPath)) continue;
    const enTree = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const locTree = JSON.parse(fs.readFileSync(locPath, "utf8"));
    const enLeaves = collectLeafMap(enTree);
    let fileChanged = false;
    const next = mapLeaves(locTree, (leafPath, value) => {
      const en = enLeaves.get(leafPath);
      if (typeof en !== "string") return value;
      if (samePlaceholders(en, value)) return value;
      const restored = restorePlaceholders(en, value);
      if (restored !== value) {
        changedLeaves += 1;
        fileChanged = true;
      }
      return restored;
    });
    if (fileChanged) {
      fs.writeFileSync(locPath, JSON.stringify(next, null, 2) + "\n");
      files += 1;
    }
  }
}

console.log(`Restored placeholders in ${changedLeaves} leaves across ${files} files.`);

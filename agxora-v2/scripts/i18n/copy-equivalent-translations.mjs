#!/usr/bin/env node
/**
 * For missing locale keys, copy a translation of an English string that already
 * exists elsewhere (same English value). Then fail-list anything still missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectLeafMap } from "./placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "../../app/lib/i18n/messages");
const LOCALES = fs.readdirSync(MESSAGES).filter((d) => d !== "en" && fs.statSync(path.join(MESSAGES, d)).isDirectory());
const NAMESPACES = fs.readdirSync(path.join(MESSAGES, "en")).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

function load(locale) {
  const tree = {};
  for (const ns of NAMESPACES) {
    tree[ns] = JSON.parse(fs.readFileSync(path.join(MESSAGES, locale, `${ns}.json`), "utf8"));
  }
  return tree;
}

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object" || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function save(locale, tree) {
  for (const ns of NAMESPACES) {
    fs.writeFileSync(path.join(MESSAGES, locale, `${ns}.json`), JSON.stringify(tree[ns], null, 2) + "\n");
  }
}

const enLeaves = collectLeafMap(load("en"));
const enByValue = new Map();
for (const [key, val] of enLeaves) {
  if (typeof val !== "string") continue;
  const list = enByValue.get(val) ?? [];
  list.push(key);
  enByValue.set(val, list);
}

let copied = 0;
for (const locale of LOCALES) {
  const tree = load(locale);
  const locLeaves = collectLeafMap(tree);
  for (const [key, enVal] of enLeaves) {
    if (locLeaves.has(key)) continue;
    if (typeof enVal !== "string") continue;
    const siblings = enByValue.get(enVal) ?? [];
    const donor = siblings.find((k) => k !== key && locLeaves.has(k));
    if (!donor) continue;
    setPath(tree, key, locLeaves.get(donor));
    copied += 1;
  }
  save(locale, tree);
}
console.log(`Copied ${copied} equivalent translations into missing keys.`);

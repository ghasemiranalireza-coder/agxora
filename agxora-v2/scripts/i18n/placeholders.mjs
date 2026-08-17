/**
 * Shared placeholder helpers for i18n validation and restore.
 * Placeholders are `{word}` tokens. Names must match English exactly.
 */

export const PLACEHOLDER_RE = /\{(\w+)\}/g;
const ODD_TOKEN_RE = /\$\{\s*([^}]+)\s*\}|\$([A-Za-z_]\w*)|%s|%d|%\d+\$s/g;

export function extractPlaceholders(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
}

export function placeholderSet(text) {
  return extractPlaceholders(text);
}

export function samePlaceholders(en, loc) {
  const a = extractPlaceholders(en);
  const b = extractPlaceholders(loc);
  if (a.length !== b.length) return false;
  return a.every((name, i) => name === b[i]);
}

/**
 * Restore English `{name}` tokens in a translated string.
 * Surrounding words may stay translated; token names must match English order.
 */
export function restorePlaceholders(en, loc) {
  if (typeof en !== "string" || typeof loc !== "string") return loc;
  const enPh = extractPlaceholders(en);
  if (enPh.length === 0) return loc;

  let s = loc
    .replace(/\$\{\s*(\w+)\s*\}/g, "{$1}")
    .replace(/\$([A-Za-z_]\w*)/g, "{$1}")
    .replace(/\{0\}/g, "{_ord0}")
    .replace(/&#x[0-9A-Fa-f]+;/g, " ");

  const locPh = [...s.matchAll(/\{([^{}]+)\}/g)];

  if (locPh.length === enPh.length) {
    let i = 0;
    return s.replace(/\{([^{}]+)\}/g, () => `{${enPh[i++]}}`);
  }

  if (locPh.length === 0) {
    const strippedEn = en.replace(PLACEHOLDER_RE, "").replace(/\s+/g, " ").trim();
    // Structure-only strings (breadcrumb templates, short interpolations).
    if (strippedEn.length <= 16) return en;
    return `${s} ${enPh.map((p) => `{${p}}`).join(" ")}`.trim();
  }

  let i = 0;
  s = s.replace(/\{([^{}]+)\}/g, () => {
    if (i < enPh.length) return `{${enPh[i++]}}`;
    return "";
  });
  while (i < enPh.length) {
    s += ` {${enPh[i++]}}`;
  }
  return s.replace(/\s+/g, " ").trim();
}

export function walkLeaves(tree, visit, path = "") {
  if (typeof tree === "string") {
    visit(path, tree);
    return;
  }
  if (Array.isArray(tree)) {
    tree.forEach((v, i) => walkLeaves(v, visit, `${path}[${i}]`));
    return;
  }
  if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) {
      walkLeaves(v, visit, path ? `${path}.${k}` : k);
    }
  }
}

export function mapLeaves(tree, mapper, path = "") {
  if (typeof tree === "string") return mapper(path, tree);
  if (Array.isArray(tree)) {
    return tree.map((v, i) => mapLeaves(v, mapper, `${path}[${i}]`));
  }
  if (tree && typeof tree === "object") {
    const out = {};
    for (const [k, v] of Object.entries(tree)) {
      out[k] = mapLeaves(v, mapper, path ? `${path}.${k}` : k);
    }
    return out;
  }
  return tree;
}

export function collectLeafMap(tree) {
  const map = new Map();
  walkLeaves(tree, (p, v) => map.set(p, v));
  return map;
}

export function protectPlaceholders(text) {
  return text.replace(PLACEHOLDER_RE, (_, name) => `⟦${name}⟧`);
}

export function unprotectPlaceholders(text) {
  return String(text)
    .replace(/⟦(\w+)⟧/g, "{$1}")
    .replace(/\[\[(\w+)\]\]/g, "{$1}");
}

export { ODD_TOKEN_RE };

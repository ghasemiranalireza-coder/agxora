import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../app/lib/i18n/messages");
const locales = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory());
const enBa = fs.readFileSync(path.join(root, "en/businessAgent.json"), "utf8");
const navPatch = {
  de: { integrations: "Integrationen", social: "Social", email: "E-Mail" },
  fa: { integrations: "اتصال‌ها", social: "شبکه‌های اجتماعی", email: "ایمیل" },
};

for (const locale of locales) {
  if (locale !== "en") {
    fs.writeFileSync(path.join(root, locale, "businessAgent.json"), enBa);
  }
  const navPath = path.join(root, locale, "navigation.json");
  const nav = JSON.parse(fs.readFileSync(navPath, "utf8"));
  const extra = navPatch[locale] ?? {
    integrations: "Integrations",
    social: "Social",
    email: "Email",
  };
  nav.integrations = extra.integrations;
  nav.social = extra.social;
  nav.email = extra.email;
  fs.writeFileSync(navPath, JSON.stringify(nav, null, 2) + "\n");

  const dashPath = path.join(root, locale, "dashboard.json");
  const dash = JSON.parse(fs.readFileSync(dashPath, "utf8"));
  dash.routeLoading = dash.routeLoading || {};
  dash.routeLoading.social =
    locale === "de"
      ? "Social Hub wird geladen…"
      : locale === "fa"
        ? "در حال بارگذاری شبکه اجتماعی…"
        : dash.routeLoading.social || "Loading social hub…";
  dash.routeLoading.email =
    locale === "de"
      ? "E-Mail-Hub wird geladen…"
      : locale === "fa"
        ? "در حال بارگذاری ایمیل…"
        : dash.routeLoading.email || "Loading email hub…";
  fs.writeFileSync(dashPath, JSON.stringify(dash, null, 2) + "\n");
}

console.log("patched", locales.length, "locales");

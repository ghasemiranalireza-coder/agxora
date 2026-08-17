#!/usr/bin/env node
import { applyTranslations, copyRegional } from "./apply-translations.mjs";
import { ENGINE_TRANSLATIONS } from "./translations-engine.mjs";

applyTranslations(ENGINE_TRANSLATIONS);
copyRegional();
console.log("Applied engine translations.");

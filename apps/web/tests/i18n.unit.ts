#!/usr/bin/env tsx

import {
  dictionaries,
  formatMessage,
  getDictionary,
  isUiLanguage,
  languageFromAcceptLanguage,
  UI_LANGUAGES,
} from "../src/lib/i18n/dictionaries.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

// Recursively describe the key/leaf shape of a dictionary so zh and en can be
// compared structurally. Arrays compare by length; objects by sorted keys.
function shape(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(shape).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${key}:${shape((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return typeof value;
}

function main() {
  // Accept-Language resolution: any zh subtag wins, otherwise English; a missing
  // header defaults to Chinese (product default).
  assert(languageFromAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8") === "zh", "zh-* resolves to zh");
  assert(languageFromAcceptLanguage("en-US,en;q=0.9") === "en", "en-* resolves to en");
  assert(languageFromAcceptLanguage("fr-FR,fr;q=0.9") === "en", "non-zh resolves to en");
  assert(languageFromAcceptLanguage("") === "zh", "empty header defaults to zh");
  assert(languageFromAcceptLanguage(null) === "zh", "missing header defaults to zh");
  assert(languageFromAcceptLanguage("ZH-hant") === "zh", "case-insensitive zh match");

  // UI language guard.
  assert(isUiLanguage("zh") && isUiLanguage("en"), "known languages pass the guard");
  assert(!isUiLanguage("de") && !isUiLanguage(null) && !isUiLanguage(3), "unknown values fail the guard");

  // Template interpolation.
  assert(formatMessage("{count} blocks", { count: 3 }) === "3 blocks", "formatMessage substitutes values");
  assert(formatMessage("{a} / {b}", { a: 1, b: 2 }) === "1 / 2", "formatMessage substitutes multiple values");
  assert(formatMessage("no tokens", {}) === "no tokens", "formatMessage passes plain strings through");
  assert(formatMessage("{missing}", {}) === "", "formatMessage drops unknown tokens");

  // getDictionary maps each supported language to its bundle.
  for (const language of UI_LANGUAGES) {
    assert(getDictionary(language) === dictionaries[language], `getDictionary returns the ${language} bundle`);
  }

  // zh and en must share the exact same key structure so no string is missing in
  // one language once a page is wired up.
  assert(shape(dictionaries.zh) === shape(dictionaries.en), "zh and en dictionaries share the same key structure");

  process.stdout.write("[i18n.unit] ALL CHECKS PASSED\n");
}

main();

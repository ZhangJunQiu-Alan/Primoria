#!/usr/bin/env tsx

import {
  dictionaries,
  formatMessage,
  getDictionary,
  isUiLanguage,
  languageFromAcceptLanguage,
  UI_LANGUAGES,
} from "../src/lib/i18n/dictionaries.ts";
import { getTutorToolDisplay } from "../src/lib/ai/tutor-tool-display.ts";

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
  assert(dictionaries.zh.tutor.assistantThinking.includes("Primoria"), "zh tutor dictionary includes assistant thinking copy");
  assert(dictionaries.en.tutor.assistantThinking.includes("Primoria"), "en tutor dictionary includes assistant thinking copy");
  assert(dictionaries.zh.tutor.toolStatus.render_algorithm === "正在拆解步骤", "zh tutor dictionary includes algorithm status copy");
  assert(dictionaries.en.tutor.toolStatus.render_algorithm === "Breaking the steps down", "en tutor dictionary includes algorithm status copy");
  assert(dictionaries.zh.tutor.toolStatus.render_chat_quiz === "正在准备练习题", "zh tutor dictionary includes chat quiz status copy");
  assert(dictionaries.en.tutor.toolStatus.render_chat_quiz === "Preparing the quiz", "en tutor dictionary includes chat quiz status copy");
  assert(dictionaries.zh.tutor.toolCompleteStatus.render_chart === "图表已整理好", "zh tutor dictionary includes specific chart completion copy");
  assert(dictionaries.en.tutor.toolCompleteStatus.render_3d_scene === "3D scene is ready", "en tutor dictionary includes specific 3D completion copy");
  assert(getTutorToolDisplay("render_chart", "complete", dictionaries.zh).title === "图表已整理好", "complete chart status uses specific learner-facing title");
  assert(getTutorToolDisplay("render_3d_scene", "complete", dictionaries.en).title === "3D scene is ready", "complete 3D status uses specific learner-facing title");
  assert(getTutorToolDisplay("unknown_tool", "complete", dictionaries.zh).title === "学习组件已准备好", "unknown complete status falls back to specific default completion copy");
  assert(dictionaries.zh.tutor.toolFailed.length > 0 && dictionaries.en.tutor.toolFailed.length > 0, "tutor dictionaries include recoverable tool failure copy");
  assert(dictionaries.zh.tutor.courseCardReady === "课程路径已准备好", "zh tutor dictionary includes course card ready copy");
  assert(dictionaries.en.tutor.courseCardReady === "Course path is ready", "en tutor dictionary includes course card ready copy");
  assert(dictionaries.zh.tutor.visualizationPlanTitle === "可视化思路", "zh tutor dictionary includes visualization plan copy");
  assert(dictionaries.en.tutor.visualizationPlanTitle === "Visualization plan", "en tutor dictionary includes visualization plan copy");

  process.stdout.write("[i18n.unit] ALL CHECKS PASSED\n");
}

main();

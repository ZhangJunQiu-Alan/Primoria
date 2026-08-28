export const UI_LANGUAGES = ["zh", "en"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const UI_LANGUAGE_COOKIE = "primoria_ui_language";

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && (UI_LANGUAGES as readonly string[]).includes(value);
}

export function languageFromAcceptLanguage(value: string | null | undefined): UiLanguage {
  if (!value) return "zh";
  return value.toLowerCase().split(",").some((part) => part.trim().startsWith("zh")) ? "zh" : "en";
}

// Single source for the learner-selected Tutor persona ids. Web validates and
// stores the id; the persona prompt text lives in ./tutor-style-prompt.mjs so it
// never reaches browser bundles. A missing/unknown id resolves to the default,
// so every Tutor run teaches in exactly one style.

export const TUTOR_STYLES = Object.freeze(["socratic", "feynman", "euclid"]);
export const DEFAULT_TUTOR_STYLE = "feynman";

/** @param {unknown} value */
export function isTutorStyle(value) {
  return typeof value === "string" && TUTOR_STYLES.includes(value);
}

/** @param {unknown} value */
export function resolveTutorStyle(value) {
  return isTutorStyle(value) ? value : DEFAULT_TUTOR_STYLE;
}

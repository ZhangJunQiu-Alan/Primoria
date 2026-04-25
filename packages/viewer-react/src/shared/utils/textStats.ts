const MEANINGFUL_CHAR_PATTERN = /[\p{L}\p{N}]/gu;
const NON_MEANINGFUL_CHAR_PATTERN = /[^\p{L}\p{N}]+/gu;

export function extractMeaningfulChars(text: string): string {
  return text.replace(NON_MEANINGFUL_CHAR_PATTERN, '');
}

export function countMeaningfulChars(text: string): number {
  return text.match(MEANINGFUL_CHAR_PATTERN)?.length ?? 0;
}

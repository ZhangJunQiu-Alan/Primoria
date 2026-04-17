const MEANINGFUL_CHAR_PATTERN = /[A-Za-z0-9\u4E00-\u9FFF\u3400-\u4DBF]/g;

export function countMeaningfulChars(text: string): number {
  return text.match(MEANINGFUL_CHAR_PATTERN)?.length ?? 0;
}

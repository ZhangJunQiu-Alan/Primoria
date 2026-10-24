// Lecture ordering inside a subject folder (docs/product/subject-folders.md §4.1).
// Pure: a lecture number parsed from the file name decides where an upload is
// inserted; files without one are appended (an AI pass may move them later)
// and a learner's manual order always wins over both.

const CHINESE_DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** "十二" → 12, "二十" → 20, "三十五" → 35, "九" → 9 (1–99). */
export function chineseNumeral(text: string): number | null {
  if (!text) return null;
  if (text.includes("十")) {
    const [tens, ones] = text.split("十");
    const tensValue = tens ? CHINESE_DIGITS[tens] : 1;
    const onesValue = ones ? CHINESE_DIGITS[ones] : 0;
    if (tensValue === undefined || onesValue === undefined || text.split("十").length > 2) return null;
    return tensValue * 10 + onesValue;
  }
  if (text.length !== 1) return null;
  return CHINESE_DIGITS[text] ?? null;
}

const UNIT_WORDS = "lecture|lec|chapter|chap|ch|week|wk|unit|module|mod|session|class|lesson|topic|part|section|sec|slides?|l|w";

/** Lecture number from a file name, or null. Explicit units ("第3讲",
 * "Lecture 03", "Week2", "L4") win over a leading number ("03-crypto.pdf");
 * a bare year (1900–2099) is never a lecture number. */
export function parseLectureNumber(fileName: string): number | null {
  const base = fileName.normalize("NFKC").replace(/\.[a-z0-9]+$/i, "");
  const chinese = base.match(/第\s*([0-9]+(?:\.[0-9]+)?|[零〇一二两三四五六七八九十]+)\s*[讲講章节節课課周单元單元部分次]/);
  if (chinese) {
    const value = /^[0-9]/.test(chinese[1]) ? Number(chinese[1]) : chineseNumeral(chinese[1]);
    if (value !== null && Number.isFinite(value)) return value;
  }
  const unit = base.match(new RegExp(`(?:^|[^a-z])(?:${UNIT_WORDS})[\\s_\\-.#]*([0-9]{1,3}(?:\\.[0-9]{1,2})?)(?![0-9])`, "i"));
  if (unit) return Number(unit[1]);
  const leading = base.match(/^\s*([0-9]{1,3}(?:\.[0-9]{1,2})?)(?![0-9])/);
  if (leading) return Number(leading[1]);
  return null;
}

export type OrderedEntry = { position: number; lectureNumber: number | null };

/** Position for a new file among `existing` (any order). A numbered file goes
 * before the first numbered file with a larger number (ties keep upload order);
 * an unnumbered file, or one larger than every number, is appended. */
export function insertionPosition(existing: OrderedEntry[], lectureNumber: number | null): number {
  const sorted = [...existing].sort((a, b) => a.position - b.position);
  const last = sorted.length ? sorted[sorted.length - 1].position : 0;
  if (lectureNumber === null) return last + 1;
  const index = sorted.findIndex((entry) => entry.lectureNumber !== null && entry.lectureNumber > lectureNumber);
  if (index === -1) return last + 1;
  const next = sorted[index].position;
  const prev = index > 0 ? sorted[index - 1].position : next - 1;
  return (prev + next) / 2;
}

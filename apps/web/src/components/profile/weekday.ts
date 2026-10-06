// 2024-01-01 was a Monday; offsets from it give Monday-first weekday names.
const MONDAY_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export function mondayFirstWeekdays(locale: string, weekday: "short" | "narrow" = "short") {
  const format = new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(MONDAY_UTC + index * DAY_MS)));
}

/** Monday-first column (0–6) of a `YYYY-MM-DD` day key. */
export function mondayFirstColumn(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

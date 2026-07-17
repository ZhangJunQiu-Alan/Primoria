import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, DAILY_QUESTS, LEVELS, levelForXp } from "@/lib/gamification/catalog";
import { classifyQuizXp, nextStreakState } from "@/lib/gamification/store";
import { dayDistance, localDayKey, weekStartKey } from "@/lib/gamification/time";
import { isValidTimeZone } from "@/lib/settings/user-settings";

describe("gamification catalog", () => {
  it("keeps the eight fixed guild ranks and ten launch achievements", () => {
    expect(LEVELS).toHaveLength(8);
    expect(LEVELS.map((level) => level.threshold)).toEqual([0, 200, 600, 1_400, 2_800, 5_000, 8_000, 12_000]);
    expect(ACHIEVEMENTS).toHaveLength(10);
    expect(DAILY_QUESTS.map((quest) => quest.xpReward)).toEqual([20, 30, 40]);
  });

  it("derives ranks at boundaries and keeps accumulating at the top rank", () => {
    expect(levelForXp(0).current.code).toBe("novice_explorer");
    expect(levelForXp(599).current.code).toBe("seeker");
    expect(levelForXp(600).current.code).toBe("pathfinder");
    expect(levelForXp(99_999).current.code).toBe("primoria_heir");
    expect(levelForXp(99_999).next).toBeNull();
  });

  it("only effort and consistency achievements grant XP", () => {
    const noXp = new Set(["first_mastery", "ten_masteries", "perfect_trial", "cross_concept"]);
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.xpReward === 0).toBe(noXp.has(achievement.code));
    }
  });
});

describe("evidence-driven reward rules", () => {
  it("awards a first attempt, one improved best, and nothing for a non-improvement", () => {
    expect(classifyQuizXp({ priorAttempts: [], score: 2, total: 3, questionCount: 3 })).toEqual({ kind: "first", amount: 24 });
    expect(classifyQuizXp({ priorAttempts: [{ score: 1, total: 3 }], score: 2, total: 3, questionCount: 3 })).toEqual({ kind: "improvement", amount: 6 });
    expect(classifyQuizXp({ priorAttempts: [{ score: 2, total: 3 }], score: 2, total: 3, questionCount: 3 })).toEqual({ kind: "none", amount: 0 });
  });

  it("continues adjacent-day streaks and flags a seven-day return", () => {
    expect(nextStreakState({ lastQuestDate: "2026-07-16", currentStreak: 2, longestStreak: 4, localDate: "2026-07-17" })).toEqual({
      gap: 1,
      currentStreak: 3,
      longestStreak: 4,
      comeback: false,
    });
    expect(nextStreakState({ lastQuestDate: "2026-07-10", currentStreak: 5, longestStreak: 5, localDate: "2026-07-17" })).toEqual({
      gap: 7,
      currentStreak: 1,
      longestStreak: 5,
      comeback: true,
    });
  });
});

describe("learner-local calendar", () => {
  it("uses IANA timezones for day and week boundaries", () => {
    const instant = new Date("2026-07-16T16:30:00Z");
    expect(localDayKey(instant, "Asia/Singapore")).toBe("2026-07-17");
    expect(localDayKey(instant, "America/Los_Angeles")).toBe("2026-07-16");
    expect(weekStartKey("2026-07-17")).toBe("2026-07-13");
    expect(dayDistance("2026-07-10", "2026-07-17")).toBe(7);
    expect(isValidTimeZone("Asia/Singapore")).toBe(true);
    expect(isValidTimeZone("not/a-timezone")).toBe(false);
  });

  it("starts every existing player at zero without importing historical evidence", () => {
    const migration = readFileSync(join(process.cwd(), "drizzle/0047_slim_earthquake.sql"), "utf8");
    expect(migration).toContain('INSERT INTO "player_progress" ("owner_id")');
    expect(migration).toContain('SELECT "id" FROM "users"');
    expect(migration).not.toContain("learning_events\"");
    expect(migration).not.toContain("quiz_attempts\"");
  });
});

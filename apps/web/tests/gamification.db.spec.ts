import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { achievementUnlocks, dailyQuestCompletions, playerProgress, users, xpAwards } from "@/lib/db/schema";

const run = process.env.RUN_GAMIFICATION_DB === "1" && Boolean(process.env.DATABASE_URL);
const suite = run ? describe : describe.skip;
const ownerId = `gamification_test_${randomUUID()}`;

suite("gamification database invariants", () => {
  afterAll(async () => {
    await getDb().delete(users).where(eq(users.id, ownerId));
  });

  it("deduplicates XP, achievement, and daily quest writes at the database boundary", async () => {
    const now = new Date();
    await getDb().insert(users).values({ id: ownerId, displayName: "Guild Test" });
    await getDb().insert(playerProgress).values({ ownerId, startedAt: now });

    const insertAward = () => getDb().insert(xpAwards).values({
      id: `xp_${randomUUID()}`,
      ownerId,
      ruleCode: "quiz_first_attempt",
      dedupeKey: "block-1",
      sourceType: "quiz_attempt",
      sourceId: "attempt-1",
      amount: 24,
    }).onConflictDoNothing({ target: [xpAwards.ownerId, xpAwards.ruleCode, xpAwards.dedupeKey] }).returning();
    expect(await insertAward()).toHaveLength(1);
    expect(await insertAward()).toHaveLength(0);

    const insertAchievement = () => getDb().insert(achievementUnlocks).values({
      id: `achievement_${randomUUID()}`,
      ownerId,
      code: "first_expedition",
      sourceId: "lesson-1",
    }).onConflictDoNothing({ target: [achievementUnlocks.ownerId, achievementUnlocks.code] }).returning();
    expect(await insertAchievement()).toHaveLength(1);
    expect(await insertAchievement()).toHaveLength(0);

    const insertQuest = () => getDb().insert(dailyQuestCompletions).values({
      id: `quest_${randomUUID()}`,
      ownerId,
      localDate: "2026-07-17",
      questCode: "field_practice",
      sourceId: "attempt-1",
    }).onConflictDoNothing({
      target: [dailyQuestCompletions.ownerId, dailyQuestCompletions.localDate, dailyQuestCompletions.questCode],
    }).returning();
    expect(await insertQuest()).toHaveLength(1);
    expect(await insertQuest()).toHaveLength(0);
  });
});

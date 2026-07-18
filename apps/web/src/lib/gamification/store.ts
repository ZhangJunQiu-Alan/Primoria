import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db/client";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import {
  achievementUnlocks,
  dailyQuestCompletions,
  learningEvents,
  playerProgress,
  quizAttempts,
  xpAwards,
} from "@/lib/db/schema";
import { listCourses } from "@/lib/courses/store";
import type { LessonRole } from "@/lib/courses/types";
import { getUserPreferences } from "@/lib/settings/user-settings";
import {
  ACHIEVEMENTS,
  DAILY_QUESTS,
  achievementByCode,
  levelForXp,
  questByCode,
  type AchievementCategory,
  type AchievementCode,
  type AchievementRarity,
  type DailyQuestCode,
  type LevelCode,
} from "./catalog";
import { dayDistance, localDayKey, weekStartKey } from "./time";

type PlayerRow = typeof playerProgress.$inferSelect;

export function classifyQuizXp(input: {
  priorAttempts: Array<{ score: number; total: number }>;
  score: number;
  total: number;
  questionCount: number;
}) {
  if (input.priorAttempts.length === 0) return { kind: "first" as const, amount: input.questionCount * 8 };
  const priorBest = input.priorAttempts.reduce((best, attempt) => Math.max(best, attempt.score / attempt.total), -1);
  if (input.score / input.total > priorBest) return { kind: "improvement" as const, amount: input.questionCount * 2 };
  return { kind: "none" as const, amount: 0 };
}

export function nextStreakState(input: {
  lastQuestDate: string | null;
  currentStreak: number;
  longestStreak: number;
  localDate: string;
}) {
  const gap = input.lastQuestDate ? dayDistance(input.lastQuestDate, input.localDate) : null;
  const currentStreak = gap === 1 ? input.currentStreak + 1 : 1;
  return {
    gap,
    currentStreak,
    longestStreak: Math.max(input.longestStreak, currentStreak),
    comeback: gap !== null && gap >= 7,
  };
}

export type RewardSummary = {
  xpAwarded: number;
  totalXp: number;
  levelCode: LevelCode;
  levelUp: { from: LevelCode; to: LevelCode } | null;
  unlockedAchievements: AchievementCode[];
  completedQuests: DailyQuestCode[];
};

export type GamificationProfile = {
  timeZone: string;
  player: {
    totalXp: number;
    levelCode: LevelCode;
    levelName: string;
    nextLevelName: string | null;
    nextLevelXp: number | null;
    levelProgress: number;
    currentStreak: number;
    longestStreak: number;
  };
  quests: Array<{
    code: DailyQuestCode;
    name: string;
    description: string;
    progress: number;
    target: number;
    xpReward: number;
    completed: boolean;
  }>;
  questline: null | {
    courseId: string;
    title: string;
    completed: number;
    total: number;
    lessons: Array<{
      id: string;
      title: string;
      role: LessonRole;
      progress: "not_started" | "in_progress" | "completed";
      status: "planned" | "generating" | "generated";
    }>;
  };
  achievements: Array<{
    code: AchievementCode;
    name: string;
    description: string;
    category: AchievementCategory;
    rarity: AchievementRarity;
    xpReward: number;
    unlockedAt: number | null;
  }>;
  recentAchievements: AchievementCode[];
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

async function ensurePlayer(ownerId: string, db: DbOrTx, now = new Date(), lock = true): Promise<PlayerRow> {
  await db
    .insert(playerProgress)
    .values({ ownerId, startedAt: now, createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: playerProgress.ownerId });
  const query = db
    .select()
    .from(playerProgress)
    .where(eq(playerProgress.ownerId, ownerId));
  const rows = lock ? await query.for("update") : await query;
  const [row] = rows;
  if (!row) throw new Error("Player progression row could not be loaded.");
  return row;
}

async function awardXp(
  db: DbOrTx,
  input: {
    ownerId: string;
    ruleCode: string;
    dedupeKey: string;
    sourceType: string;
    sourceId?: string | null;
    amount: number;
    metadata?: Record<string, unknown>;
    now: Date;
  },
): Promise<number> {
  if (input.amount <= 0) return 0;
  const [inserted] = await db
    .insert(xpAwards)
    .values({
      id: id("xp"),
      ownerId: input.ownerId,
      ruleCode: input.ruleCode,
      dedupeKey: input.dedupeKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      amount: input.amount,
      metadata: input.metadata ?? {},
      createdAt: input.now,
    })
    .onConflictDoNothing({ target: [xpAwards.ownerId, xpAwards.ruleCode, xpAwards.dedupeKey] })
    .returning({ amount: xpAwards.amount });
  if (!inserted) return 0;
  await db
    .update(playerProgress)
    .set({ totalXp: sql`${playerProgress.totalXp} + ${inserted.amount}`, updatedAt: input.now })
    .where(eq(playerProgress.ownerId, input.ownerId));
  return inserted.amount;
}

async function unlockAchievement(
  db: DbOrTx,
  ownerId: string,
  code: AchievementCode,
  sourceId: string,
  now: Date,
  unlocked: AchievementCode[],
): Promise<number> {
  const [inserted] = await db
    .insert(achievementUnlocks)
    .values({ id: id("achievement"), ownerId, code, sourceId, unlockedAt: now })
    .onConflictDoNothing({ target: [achievementUnlocks.ownerId, achievementUnlocks.code] })
    .returning({ code: achievementUnlocks.code });
  if (!inserted) return 0;
  unlocked.push(code);
  const achievement = achievementByCode(code);
  return awardXp(db, {
    ownerId,
    ruleCode: "achievement_bonus",
    dedupeKey: code,
    sourceType: "achievement",
    sourceId,
    amount: achievement.xpReward,
    now,
  });
}

async function completeQuest(
  db: DbOrTx,
  input: {
    ownerId: string;
    player: PlayerRow;
    code: DailyQuestCode;
    localDate: string;
    sourceId: string;
    now: Date;
    unlocked: AchievementCode[];
    completed: DailyQuestCode[];
  },
): Promise<number> {
  const [inserted] = await db
    .insert(dailyQuestCompletions)
    .values({
      id: id("quest"),
      ownerId: input.ownerId,
      localDate: input.localDate,
      questCode: input.code,
      sourceId: input.sourceId,
      completedAt: input.now,
    })
    .onConflictDoNothing({
      target: [dailyQuestCompletions.ownerId, dailyQuestCompletions.localDate, dailyQuestCompletions.questCode],
    })
    .returning({ code: dailyQuestCompletions.questCode });
  if (!inserted) return 0;

  input.completed.push(input.code);
  const quest = questByCode(input.code);
  let awarded = await awardXp(db, {
    ownerId: input.ownerId,
    ruleCode: "daily_quest",
    dedupeKey: `${input.localDate}:${input.code}`,
    sourceType: "daily_quest",
    sourceId: input.sourceId,
    amount: quest.xpReward,
    now: input.now,
  });

  if (input.player.lastQuestDate !== input.localDate) {
    const next = nextStreakState({
      lastQuestDate: input.player.lastQuestDate,
      currentStreak: input.player.currentStreak,
      longestStreak: input.player.longestStreak,
      localDate: input.localDate,
    });
    await db
      .update(playerProgress)
      .set({ currentStreak: next.currentStreak, longestStreak: next.longestStreak, lastQuestDate: input.localDate, updatedAt: input.now })
      .where(eq(playerProgress.ownerId, input.ownerId));
    input.player.currentStreak = next.currentStreak;
    input.player.longestStreak = next.longestStreak;
    input.player.lastQuestDate = input.localDate;

    if (next.comeback) {
      awarded += await unlockAchievement(db, input.ownerId, "comeback", input.sourceId, input.now, input.unlocked);
    }
    if (next.currentStreak >= 3) {
      awarded += await unlockAchievement(db, input.ownerId, "streak_3", input.sourceId, input.now, input.unlocked);
    }
    if (next.currentStreak >= 7) {
      awarded += await unlockAchievement(db, input.ownerId, "streak_7", input.sourceId, input.now, input.unlocked);
    }
  }
  return awarded;
}

async function recentLearningEvents(ownerId: string, player: PlayerRow, now: Date, db: DbOrTx) {
  const recentFloor = new Date(Math.max(player.startedAt.getTime(), now.getTime() - 48 * 60 * 60 * 1000));
  return db
    .select({
      type: learningEvents.type,
      courseId: learningEvents.courseId,
      lessonId: learningEvents.lessonId,
      blockId: learningEvents.blockId,
      graphId: learningEvents.graphId,
      conceptId: learningEvents.conceptId,
      payload: learningEvents.payload,
      createdAt: learningEvents.createdAt,
    })
    .from(learningEvents)
    .where(and(eq(learningEvents.ownerId, ownerId), gte(learningEvents.createdAt, recentFloor)));
}

export async function applyQuizProgression(
  db: DbOrTx,
  input: {
    ownerId: string;
    attemptId: string;
    blockId: string;
    score: number;
    total: number;
    questionIds: string[];
    conceptIds: Array<string | null>;
    lessonId: string;
    lessonRole: LessonRole;
    lessonCompleted: boolean;
    courseId: string;
    courseCompleted: boolean;
    timeZone: string;
    now?: Date;
  },
): Promise<RewardSummary> {
  const now = input.now ?? new Date();
  const player = await ensurePlayer(input.ownerId, db, now);
  const beforeLevel = levelForXp(player.totalXp).current.code;
  const unlocked: AchievementCode[] = [];
  const completed: DailyQuestCode[] = [];
  const localDate = localDayKey(now, input.timeZone);
  let xpAwarded = 0;

  const priorAttempts = await db
    .select({ score: quizAttempts.score, total: quizAttempts.total })
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.ownerId, input.ownerId),
      eq(quizAttempts.blockId, input.blockId),
      gte(quizAttempts.createdAt, player.startedAt),
      ne(quizAttempts.id, input.attemptId),
    ));
  const quizXp = classifyQuizXp({ priorAttempts, score: input.score, total: input.total, questionCount: input.questionIds.length });
  const improved = quizXp.kind === "improvement";

  if (quizXp.kind === "first") {
    xpAwarded += await awardXp(db, {
      ownerId: input.ownerId,
      ruleCode: "quiz_first_attempt",
      dedupeKey: input.blockId,
      sourceType: "quiz_attempt",
      sourceId: input.attemptId,
      amount: quizXp.amount,
      now,
    });
  } else if (quizXp.kind === "improvement") {
    xpAwarded += await awardXp(db, {
      ownerId: input.ownerId,
      ruleCode: "quiz_improvement",
      dedupeKey: `${input.blockId}:${localDate}`,
      sourceType: "quiz_attempt",
      sourceId: input.attemptId,
      amount: quizXp.amount,
      now,
    });
  }

  if (input.lessonCompleted) {
    xpAwarded += await awardXp(db, {
      ownerId: input.ownerId,
      ruleCode: "lesson_completed",
      dedupeKey: input.lessonId,
      sourceType: "lesson",
      sourceId: input.lessonId,
      amount: 40,
      now,
    });
    xpAwarded += await unlockAchievement(db, input.ownerId, "first_expedition", input.lessonId, now, unlocked);
    if (input.lessonRole === "remediation") {
      xpAwarded += await unlockAchievement(db, input.ownerId, "remediation_complete", input.lessonId, now, unlocked);
    }
  }
  if (input.courseCompleted) {
    xpAwarded += await unlockAchievement(db, input.ownerId, "questline_complete", input.courseId, now, unlocked);
  }
  if (input.total >= 3 && input.score === input.total) {
    xpAwarded += await unlockAchievement(db, input.ownerId, "perfect_trial", input.attemptId, now, unlocked);
    const conceptCount = new Set(input.conceptIds.filter((conceptId): conceptId is string => Boolean(conceptId))).size;
    if (conceptCount >= 2) {
      xpAwarded += await unlockAchievement(db, input.ownerId, "cross_concept", input.attemptId, now, unlocked);
    }
  }

  const events = await recentLearningEvents(input.ownerId, player, now, db);
  const todayEvents = events.filter((event) => localDayKey(event.createdAt, input.timeZone) === localDate);
  const distinctQuestions = new Set(
    todayEvents
      .filter((event) => event.type === "quiz.submit")
      .map((event) => {
        const questionId = (event.payload as { question_id?: string }).question_id;
        return questionId ? `${event.courseId ?? ""}:${event.blockId ?? ""}:${questionId}` : null;
      })
      .filter((questionId): questionId is string => Boolean(questionId)),
  );
  if (distinctQuestions.size >= 5) {
    xpAwarded += await completeQuest(db, {
      ownerId: input.ownerId,
      player,
      code: "field_practice",
      localDate,
      sourceId: input.attemptId,
      now,
      unlocked,
      completed,
    });
  }
  if (input.lessonCompleted) {
    xpAwarded += await completeQuest(db, {
      ownerId: input.ownerId,
      player,
      code: "advance_quest",
      localDate,
      sourceId: input.lessonId,
      now,
      unlocked,
      completed,
    });
  }
  if (improved || (input.lessonCompleted && (input.lessonRole === "review" || input.lessonRole === "remediation"))) {
    xpAwarded += await completeQuest(db, {
      ownerId: input.ownerId,
      player,
      code: "growth_trial",
      localDate,
      sourceId: input.attemptId,
      now,
      unlocked,
      completed,
    });
  }

  const [after] = await db.select({ totalXp: playerProgress.totalXp }).from(playerProgress).where(eq(playerProgress.ownerId, input.ownerId));
  const totalXp = after?.totalXp ?? player.totalXp;
  const afterLevel = levelForXp(totalXp).current.code;
  return {
    xpAwarded,
    totalXp,
    levelCode: afterLevel,
    levelUp: beforeLevel === afterLevel ? null : { from: beforeLevel, to: afterLevel },
    unlockedAchievements: unlocked,
    completedQuests: completed,
  };
}

export async function currentRewardSnapshot(ownerId: string, db: DbOrTx = getDb()): Promise<RewardSummary> {
  const player = await ensurePlayer(ownerId, db, new Date(), false);
  return {
    xpAwarded: 0,
    totalXp: player.totalXp,
    levelCode: levelForXp(player.totalXp).current.code,
    levelUp: null,
    unlockedAchievements: [],
    completedQuests: [],
  };
}

export async function applyMasteryProgression(
  db: DbOrTx,
  input: {
    ownerId: string;
    graphId: string;
    conceptId: string;
    sourceId: string;
    previousStatus: string | undefined;
    nextStatus: string;
    timeZone: string;
    occurredAt?: Date;
  },
) {
  if (input.previousStatus === input.nextStatus) return;
  const occurredAt = input.occurredAt ?? new Date();
  const now = new Date();
  const player = await ensurePlayer(input.ownerId, db, now);
  if (occurredAt < player.startedAt) return;

  await db
    .insert(learningEvents)
    .values({
      id: `mastery_transition_${input.sourceId}_${input.conceptId}_${input.nextStatus}`,
      ownerId: input.ownerId,
      type: "mastery.transition",
      graphId: input.graphId,
      conceptId: input.conceptId,
      payload: { from: input.previousStatus ?? "untested", to: input.nextStatus },
      createdAt: now,
    })
    .onConflictDoNothing({ target: learningEvents.id });

  if (input.nextStatus !== "mastered") return;
  const unlocked: AchievementCode[] = [];
  const completed: DailyQuestCode[] = [];
  await unlockAchievement(db, input.ownerId, "first_mastery", input.sourceId, now, unlocked);
  const transitions = await db
    .select({ graphId: learningEvents.graphId, conceptId: learningEvents.conceptId, payload: learningEvents.payload })
    .from(learningEvents)
    .where(and(
      eq(learningEvents.ownerId, input.ownerId),
      eq(learningEvents.type, "mastery.transition"),
      gte(learningEvents.createdAt, player.startedAt),
    ));
  const masteredConcepts = new Set(
    transitions
      .filter((transition) => transition.graphId && transition.conceptId && (transition.payload as { to?: string }).to === "mastered")
      .map((transition) => `${transition.graphId}:${transition.conceptId}`),
  );
  if (masteredConcepts.size >= 10) {
    await unlockAchievement(db, input.ownerId, "ten_masteries", input.sourceId, now, unlocked);
  }
  await completeQuest(db, {
    ownerId: input.ownerId,
    player,
    code: "growth_trial",
    localDate: localDayKey(now, input.timeZone),
    sourceId: input.sourceId,
    now,
    unlocked,
    completed,
  });
}

export async function getXpSummary(ownerId: string | null, now = new Date()) {
  if (!ownerId || !hasDatabaseUrl()) return { total: 0, today: 0, week: 0, streak: 0 };
  const preferences = await getUserPreferences(ownerId);
  const db = getDb();
  const player = await ensurePlayer(ownerId, db, now, false);
  const floor = new Date(Math.max(player.startedAt.getTime(), now.getTime() - 8 * 24 * 60 * 60 * 1000));
  const awards = await db
    .select({ amount: xpAwards.amount, createdAt: xpAwards.createdAt })
    .from(xpAwards)
    .where(and(eq(xpAwards.ownerId, ownerId), gte(xpAwards.createdAt, floor)));
  const today = localDayKey(now, preferences.timeZone);
  const weekStart = weekStartKey(today);
  let todayXp = 0;
  let weekXp = 0;
  for (const award of awards) {
    const key = localDayKey(award.createdAt, preferences.timeZone);
    if (key === today) todayXp += award.amount;
    if (key >= weekStart) weekXp += award.amount;
  }
  const gap = player.lastQuestDate ? dayDistance(player.lastQuestDate, today) : null;
  return { total: player.totalXp, today: todayXp, week: weekXp, streak: gap !== null && gap <= 1 ? player.currentStreak : 0 };
}

export async function getGamificationProfile(
  ownerId: string | null,
  language: "zh" | "en",
  now = new Date(),
): Promise<GamificationProfile> {
  const localized = <T extends { zh: readonly [string, string]; en: readonly [string, string] }>(entry: T) => entry[language];
  if (!ownerId || !hasDatabaseUrl()) {
    const level = levelForXp(0);
    return {
      timeZone: "UTC",
      player: {
        totalXp: 0,
        levelCode: level.current.code,
        levelName: level.current[language],
        nextLevelName: level.next?.[language] ?? null,
        nextLevelXp: level.next?.threshold ?? null,
        levelProgress: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      quests: DAILY_QUESTS.map((quest) => ({
        code: quest.code,
        name: localized(quest)[0],
        description: localized(quest)[1],
        progress: 0,
        target: quest.target,
        xpReward: quest.xpReward,
        completed: false,
      })),
      questline: null,
      achievements: ACHIEVEMENTS.map((achievement) => ({
        code: achievement.code,
        name: localized(achievement)[0],
        description: localized(achievement)[1],
        category: achievement.category,
        rarity: achievement.rarity,
        xpReward: achievement.xpReward,
        unlockedAt: null,
      })),
      recentAchievements: [],
    };
  }

  const [preferences, courses] = await Promise.all([getUserPreferences(ownerId), listCourses(ownerId)]);
  const db = getDb();
  const player = await ensurePlayer(ownerId, db, now, false);
    const [unlocks, completions, events, improvementAwards] = await Promise.all([
      db.select().from(achievementUnlocks).where(eq(achievementUnlocks.ownerId, ownerId)).orderBy(desc(achievementUnlocks.unlockedAt)),
      db.select().from(dailyQuestCompletions).where(eq(dailyQuestCompletions.ownerId, ownerId)),
      recentLearningEvents(ownerId, player, now, db),
      db.select({ createdAt: xpAwards.createdAt }).from(xpAwards).where(and(
        eq(xpAwards.ownerId, ownerId),
        eq(xpAwards.ruleCode, "quiz_improvement"),
        gte(xpAwards.createdAt, player.startedAt),
      )),
    ]);
    const today = localDayKey(now, preferences.timeZone);
    const todayEvents = events.filter((event) => localDayKey(event.createdAt, preferences.timeZone) === today);
    const lessonRoles = new Map(courses.flatMap((course) => course.lessons.map((lesson) => [lesson.id, lesson.role] as const)));
    const questionCount = new Set(
      todayEvents
        .filter((event) => event.type === "quiz.submit")
        .map((event) => {
          const questionId = (event.payload as { question_id?: string }).question_id;
          return questionId ? `${event.courseId ?? ""}:${event.blockId ?? ""}:${questionId}` : null;
        })
        .filter((questionId): questionId is string => Boolean(questionId)),
    ).size;
    const lessonCount = todayEvents.filter((event) => event.type === "lesson.completed").length;
    const growthCount = todayEvents.some((event) =>
      (event.type === "mastery.transition" && (event.payload as { to?: string }).to === "mastered")
      || (event.type === "lesson.completed" && ["review", "remediation"].includes(lessonRoles.get(event.lessonId ?? "") ?? "")),
    ) || improvementAwards.some((award) => localDayKey(award.createdAt, preferences.timeZone) === today) ? 1 : 0;
    const completionCodes = new Set(
      completions.filter((completion) => completion.localDate === today).map((completion) => completion.questCode),
    );
    const rawProgress: Record<DailyQuestCode, number> = {
      field_practice: questionCount,
      advance_quest: lessonCount,
      growth_trial: growthCount,
    };
    const level = levelForXp(player.totalXp);
    const span = level.next ? level.next.threshold - level.current.threshold : 0;
    const progress = level.next ? (player.totalXp - level.current.threshold) / span : 1;
    const lastGap = player.lastQuestDate ? dayDistance(player.lastQuestDate, today) : null;
    const unlockedByCode = new Map(unlocks.map((unlock) => [unlock.code, unlock]));
    const activeCourse = courses.find((course) => course.completedLessonCount < course.lessonCount) ?? courses[0] ?? null;

  return {
      timeZone: preferences.timeZone,
      player: {
        totalXp: player.totalXp,
        levelCode: level.current.code,
        levelName: level.current[language],
        nextLevelName: level.next?.[language] ?? null,
        nextLevelXp: level.next?.threshold ?? null,
        levelProgress: Math.max(0, Math.min(1, progress)),
        currentStreak: lastGap !== null && lastGap <= 1 ? player.currentStreak : 0,
        longestStreak: player.longestStreak,
      },
      quests: DAILY_QUESTS.map((quest) => ({
        code: quest.code,
        name: localized(quest)[0],
        description: localized(quest)[1],
        progress: completionCodes.has(quest.code) ? quest.target : Math.min(rawProgress[quest.code], quest.target),
        target: quest.target,
        xpReward: quest.xpReward,
        completed: completionCodes.has(quest.code),
      })),
      questline: activeCourse ? {
        courseId: activeCourse.id,
        title: activeCourse.title,
        completed: activeCourse.completedLessonCount,
        total: activeCourse.lessonCount,
        lessons: [...activeCourse.lessons]
          .sort((left, right) => left.sortKey - right.sortKey)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            role: lesson.role,
            progress: lesson.progress,
            status: lesson.status,
          })),
      } : null,
      achievements: ACHIEVEMENTS.map((achievement) => ({
        code: achievement.code,
        name: localized(achievement)[0],
        description: localized(achievement)[1],
        category: achievement.category,
        rarity: achievement.rarity,
        xpReward: achievement.xpReward,
        unlockedAt: unlockedByCode.get(achievement.code)?.unlockedAt.getTime() ?? null,
      })),
      recentAchievements: unlocks.slice(0, 5).map((unlock) => unlock.code as AchievementCode),
  };
}

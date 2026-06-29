import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { learningEvents, quizAttempts } from "@/lib/db/schema";
import { listCourses } from "@/lib/courses/store";
import type { CourseSummary } from "@/lib/courses/types";

export type ProfileStats = {
  displayName: string;
  email: string | null;
  initial: string;
  streakDays: number;
  xp: number;
  lessonsCompleted: number;
  questionsPracticed: number;
  learningMinutes: number;
  cardsCollected: number;
  activeDaysThisWeek: number;
  weekDays: Array<{ label: string; date: number; activity: number }>;
  heatmapDays: Array<{ key: string; day: string; activity: number }>;
  coursesWorkedOn: Array<{ id: string; title: string; lessons: number; questions: number; minutes: number }>;
};

type ActivityRow = {
  createdAt: Date;
  courseId: string | null;
  type?: string;
  total?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  const local = startOfLocalDay(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const local = startOfLocalDay(date);
  const offset = (local.getDay() + 6) % 7;
  return new Date(local.getTime() - offset * DAY_MS);
}

function formatInitial(displayName: string, email: string | null) {
  return (displayName || email || "A").trim().slice(0, 1).toUpperCase() || "A";
}

function formatDisplayName(displayName: string | null | undefined, email: string | null | undefined) {
  return displayName?.trim() || email?.split("@")[0] || "Learner";
}

function sumCourseMinutes(courses: CourseSummary[]) {
  return courses.reduce((total, course) => total + (course.estimatedMinutes || 0), 0);
}

function countCurrentStreak(activeKeys: Set<string>, today = new Date()) {
  let streak = 0;
  let cursor = startOfLocalDay(today);
  while (activeKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

function buildWeekDays(activeCountByDay: Map<string, number>, today = new Date()) {
  const weekStart = startOfWeek(today);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, index) => {
    const date = new Date(weekStart.getTime() + index * DAY_MS);
    return { label, date: date.getDate(), activity: activeCountByDay.get(dayKey(date)) ?? 0 };
  });
}

function buildHeatmapDays(activeCountByDay: Map<string, number>, today = new Date()) {
  const start = new Date(startOfLocalDay(today).getTime() - 29 * DAY_MS);
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return {
      key: dayKey(date),
      day: String(date.getDate()),
      activity: activeCountByDay.get(dayKey(date)) ?? 0,
    };
  });
}

export async function getProfileStats(input: {
  ownerId: string | null;
  displayName: string | null;
  email: string | null;
}): Promise<ProfileStats> {
  const displayName = formatDisplayName(input.displayName, input.email);
  const initial = formatInitial(displayName, input.email);

  if (!input.ownerId || !hasDatabaseUrl()) {
    return {
      displayName,
      email: input.email,
      initial,
      streakDays: 0,
      xp: 0,
      lessonsCompleted: 0,
      questionsPracticed: 0,
      learningMinutes: 0,
      cardsCollected: 0,
      activeDaysThisWeek: 0,
      weekDays: buildWeekDays(new Map()),
      heatmapDays: buildHeatmapDays(new Map()),
      coursesWorkedOn: [],
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(startOfLocalDay(now).getTime() - 29 * DAY_MS);
  const [courses, attemptRows, eventRows] = await Promise.all([
    listCourses(input.ownerId),
    getDb()
      .select({
        createdAt: quizAttempts.createdAt,
        courseId: quizAttempts.courseId,
        total: quizAttempts.total,
      })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.ownerId, input.ownerId), gte(quizAttempts.createdAt, thirtyDaysAgo)))
      .orderBy(desc(quizAttempts.createdAt)),
    getDb()
      .select({
        createdAt: learningEvents.createdAt,
        courseId: learningEvents.courseId,
        type: learningEvents.type,
      })
      .from(learningEvents)
      .where(and(eq(learningEvents.ownerId, input.ownerId), gte(learningEvents.createdAt, thirtyDaysAgo)))
      .orderBy(desc(learningEvents.createdAt)),
  ]);

  const activityRows: ActivityRow[] = [...attemptRows, ...eventRows];
  const activeCountByDay = new Map<string, number>();
  for (const row of activityRows) {
    const key = dayKey(row.createdAt);
    activeCountByDay.set(key, (activeCountByDay.get(key) ?? 0) + 1);
  }

  const completedLessons = courses.reduce((total, course) => total + course.completedLessonCount, 0);
  const questionsPracticed = attemptRows.reduce((total, row) => total + (row.total ?? 0), 0);
  const learningMinutes = sumCourseMinutes(courses);
  const xp = Math.max(completedLessons * 40, questionsPracticed * 8);
  const weekStartKey = dayKey(startOfWeek(now));
  const weekActiveDays = [...activeCountByDay.keys()].filter((key) => key >= weekStartKey).length;

  const questionCountByCourse = new Map<string, number>();
  for (const attempt of attemptRows) {
    questionCountByCourse.set(attempt.courseId, (questionCountByCourse.get(attempt.courseId) ?? 0) + (attempt.total ?? 0));
  }

  return {
    displayName,
    email: input.email,
    initial,
    streakDays: countCurrentStreak(new Set(activeCountByDay.keys()), now),
    xp,
    lessonsCompleted: completedLessons,
    questionsPracticed,
    learningMinutes,
    cardsCollected: 0,
    activeDaysThisWeek: weekActiveDays,
    weekDays: buildWeekDays(activeCountByDay, now),
    heatmapDays: buildHeatmapDays(activeCountByDay, now),
    coursesWorkedOn: courses.slice(0, 4).map((course) => ({
      id: course.id,
      title: course.title,
      lessons: course.completedLessonCount || course.generatedLessonCount,
      questions: questionCountByCourse.get(course.id) ?? 0,
      minutes: course.estimatedMinutes,
    })),
  };
}

export function formatLearningTime(minutes: number) {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

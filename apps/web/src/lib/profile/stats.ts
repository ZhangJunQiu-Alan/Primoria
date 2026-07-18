import { desc, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { learningEvents, quizAttempts } from "@/lib/db/schema";
import { listCourses } from "@/lib/courses/store";
import type { CourseSummary } from "@/lib/courses/types";
import { getXpSummary } from "@/lib/gamification/store";

export type ProfileCourseActivity = {
  id: string;
  title: string;
  lessons: number;
  questions: number;
  activityEvents: number;
  lastActivityAt: number;
};

export type ProfileStats = {
  displayName: string;
  email: string | null;
  initial: string;
  streakDays: number;
  xp: number;
  todayXp: number;
  weeklyXp: number;
  courseCount: number;
  lessonsCompleted: number;
  todayLessonsCompleted: number;
  weeklyLessonsCompleted: number;
  questionsPracticed: number;
  todayQuestionsPracticed: number;
  weeklyQuestionsPracticed: number;
  plannedLessonMinutes: number;
  totalActivityEvents: number;
  todayActivityEvents: number;
  weeklyActivityEvents: number;
  activeDaysThisWeek: number;
  activeDaysLast30: number;
  weekLabel: string;
  bestWeekDay: { display: string; activity: number } | null;
  weekDays: Array<{ label: string; date: number; activity: number }>;
  heatmapDays: Array<{ key: string; day: string; activity: number }>;
  coursesWorkedOn: ProfileCourseActivity[];
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

function sumPlannedLessonMinutes(courses: CourseSummary[]) {
  return courses.reduce((total, course) => total + (course.estimatedMinutes || 0), 0);
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

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function formatWeekLabel(today = new Date()) {
  const start = startOfWeek(today);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
}

function formatWeekDayDisplay(day: { label: string; date: number }, today = new Date()) {
  const weekStart = startOfWeek(today);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const index = labels.indexOf(day.label);
  const date = new Date(weekStart.getTime() + Math.max(0, index) * DAY_MS);
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(date);
}

function selectBestWeekDay(weekDays: ProfileStats["weekDays"], today = new Date()) {
  const best = weekDays.reduce((winner, day) => (day.activity > winner.activity ? day : winner), weekDays[0]);
  if (!best || best.activity <= 0) return null;
  return { display: formatWeekDayDisplay(best, today), activity: best.activity };
}

function rowTime(row: { createdAt: Date }) {
  return row.createdAt.getTime();
}

function isOnOrAfter(row: { createdAt: Date }, date: Date) {
  return rowTime(row) >= date.getTime();
}

function isToday(row: { createdAt: Date }, today = new Date()) {
  return dayKey(row.createdAt) === dayKey(today);
}

function sumQuestions(rows: Array<{ total?: number | null }>) {
  return rows.reduce((total, row) => total + (row.total ?? 0), 0);
}

export async function getProfileStats(input: {
  ownerId: string | null;
  displayName: string | null;
  email: string | null;
}): Promise<ProfileStats> {
  const displayName = formatDisplayName(input.displayName, input.email);
  const initial = formatInitial(displayName, input.email);
  const emptyWeekDays = buildWeekDays(new Map());
  const emptyHeatmapDays = buildHeatmapDays(new Map());

  if (!input.ownerId || !hasDatabaseUrl()) {
    return {
      displayName,
      email: input.email,
      initial,
      streakDays: 0,
      xp: 0,
      todayXp: 0,
      weeklyXp: 0,
      courseCount: 0,
      lessonsCompleted: 0,
      todayLessonsCompleted: 0,
      weeklyLessonsCompleted: 0,
      questionsPracticed: 0,
      todayQuestionsPracticed: 0,
      weeklyQuestionsPracticed: 0,
      plannedLessonMinutes: 0,
      totalActivityEvents: 0,
      todayActivityEvents: 0,
      weeklyActivityEvents: 0,
      activeDaysThisWeek: 0,
      activeDaysLast30: 0,
      weekLabel: formatWeekLabel(),
      bestWeekDay: null,
      weekDays: emptyWeekDays,
      heatmapDays: emptyHeatmapDays,
      coursesWorkedOn: [],
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(startOfLocalDay(now).getTime() - 29 * DAY_MS);
  const weekStart = startOfWeek(now);
  const [courses, attemptRows, eventRows, xpSummary] = await Promise.all([
    listCourses(input.ownerId),
    getDb()
      .select({
        createdAt: quizAttempts.createdAt,
        courseId: quizAttempts.courseId,
        total: quizAttempts.total,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.ownerId, input.ownerId))
      .orderBy(desc(quizAttempts.createdAt)),
    getDb()
      .select({
        createdAt: learningEvents.createdAt,
        courseId: learningEvents.courseId,
        type: learningEvents.type,
      })
      .from(learningEvents)
      .where(eq(learningEvents.ownerId, input.ownerId))
      .orderBy(desc(learningEvents.createdAt)),
    getXpSummary(input.ownerId, now),
  ]);

  // Prefer the append-only event stream. Fall back to quiz attempts only for
  // older local data that predates learning_events writes.
  const activityRows: ActivityRow[] = eventRows.length
    ? eventRows
    : attemptRows.map((row) => ({ createdAt: row.createdAt, courseId: row.courseId, type: "quiz.attempt", total: row.total }));

  const activeCountByDay = new Map<string, number>();
  for (const row of activityRows.filter((row) => isOnOrAfter(row, thirtyDaysAgo))) {
    const key = dayKey(row.createdAt);
    activeCountByDay.set(key, (activeCountByDay.get(key) ?? 0) + 1);
  }

  const completedLessons = courses.reduce((total, course) => total + course.completedLessonCount, 0);
  const questionsPracticed = sumQuestions(attemptRows);
  const plannedLessonMinutes = sumPlannedLessonMinutes(courses);
  const lessonCompletedEvents = eventRows.filter((row) => row.type === "lesson.completed");
  const todayLessonsCompleted = lessonCompletedEvents.filter((row) => isToday(row, now)).length;
  const weeklyLessonsCompleted = lessonCompletedEvents.filter((row) => isOnOrAfter(row, weekStart)).length;
  const todayQuestionsPracticed = sumQuestions(attemptRows.filter((row) => isToday(row, now)));
  const weeklyAttemptRows = attemptRows.filter((row) => isOnOrAfter(row, weekStart));
  const weeklyActivityRows = activityRows.filter((row) => isOnOrAfter(row, weekStart));
  const weeklyLessonRows = lessonCompletedEvents.filter((row) => isOnOrAfter(row, weekStart));
  const weeklyQuestionsPracticed = sumQuestions(weeklyAttemptRows);
  const todayActivityEvents = activityRows.filter((row) => isToday(row, now)).length;
  const weeklyActivityEvents = weeklyActivityRows.length;
  const weekStartKey = dayKey(weekStart);
  const weekActiveDays = [...activeCountByDay.keys()].filter((key) => key >= weekStartKey).length;
  const weekDays = buildWeekDays(activeCountByDay, now);
  const heatmapDays = buildHeatmapDays(activeCountByDay, now);
  const xp = xpSummary.total;
  const todayXp = xpSummary.today;
  const weeklyXp = xpSummary.week;

  const questionCountByCourse = new Map<string, number>();
  const weeklyLastActivityByCourse = new Map<string, number>();
  for (const attempt of weeklyAttemptRows) {
    questionCountByCourse.set(attempt.courseId, (questionCountByCourse.get(attempt.courseId) ?? 0) + (attempt.total ?? 0));
    weeklyLastActivityByCourse.set(attempt.courseId, Math.max(weeklyLastActivityByCourse.get(attempt.courseId) ?? 0, rowTime(attempt)));
  }

  const activityCountByCourse = new Map<string, number>();
  for (const row of weeklyActivityRows) {
    if (!row.courseId) continue;
    activityCountByCourse.set(row.courseId, (activityCountByCourse.get(row.courseId) ?? 0) + 1);
    weeklyLastActivityByCourse.set(row.courseId, Math.max(weeklyLastActivityByCourse.get(row.courseId) ?? 0, rowTime(row)));
  }

  const lessonCountByCourse = new Map<string, number>();
  for (const row of weeklyLessonRows) {
    if (!row.courseId) continue;
    lessonCountByCourse.set(row.courseId, (lessonCountByCourse.get(row.courseId) ?? 0) + 1);
    weeklyLastActivityByCourse.set(row.courseId, Math.max(weeklyLastActivityByCourse.get(row.courseId) ?? 0, rowTime(row)));
  }

  return {
    displayName,
    email: input.email,
    initial,
    streakDays: xpSummary.streak,
    xp,
    todayXp,
    weeklyXp,
    courseCount: courses.length,
    lessonsCompleted: completedLessons,
    todayLessonsCompleted,
    weeklyLessonsCompleted,
    questionsPracticed,
    todayQuestionsPracticed,
    weeklyQuestionsPracticed,
    plannedLessonMinutes,
    totalActivityEvents: activityRows.length,
    todayActivityEvents,
    weeklyActivityEvents,
    activeDaysThisWeek: weekActiveDays,
    activeDaysLast30: heatmapDays.filter((day) => day.activity > 0).length,
    weekLabel: formatWeekLabel(now),
    bestWeekDay: selectBestWeekDay(weekDays, now),
    weekDays,
    heatmapDays,
    coursesWorkedOn: courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        lessons: lessonCountByCourse.get(course.id) ?? 0,
        questions: questionCountByCourse.get(course.id) ?? 0,
        activityEvents: activityCountByCourse.get(course.id) ?? 0,
        lastActivityAt: weeklyLastActivityByCourse.get(course.id) ?? 0,
      }))
      .filter((course) => course.activityEvents > 0 || course.questions > 0 || course.lessons > 0)
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      .slice(0, 4),
  };
}

export function formatLearningTime(minutes: number) {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

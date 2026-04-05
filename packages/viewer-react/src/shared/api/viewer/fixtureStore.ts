import {
  demoAchievements,
  demoCourseSnapshot,
  demoCourses,
  demoEnrollments,
  demoFollowCounts,
  getDemoCourseIdForLesson,
  getDemoCourseLessons,
  demoParentChildren,
  demoParentReports,
  demoProfile,
  demoStats,
  demoSubjects,
  demoXpHistory,
} from '@/shared/data/demoViewerData';
import type {
  CommunityConversation,
  CommunityDiscussion,
  CommunityNote,
  CommunityPerson,
  CommunityStudyRoom,
  ViewerAchievement,
  ViewerCourse,
  ViewerEnrollment,
  ViewerFollowCounts,
  ViewerParentChild,
  ViewerParentReport,
  ViewerProfile,
  ViewerStats,
  ViewerSubject,
  ViewerUserSettings,
  ViewerWebPushSubscription,
} from '@/shared/api/viewer/types';
import { getDemoRole } from '@/shared/utils/demoMode';

export const VIEWER_FIXTURE_STORAGE_KEY = 'primoria.viewer.fixture-state';

type ViewerFixtureState = {
  profile: ViewerProfile;
  subjects: ViewerSubject[];
  courses: ViewerCourse[];
  enrollments: ViewerEnrollment[];
  completedLessonIds: string[];
  achievements: ViewerAchievement[];
  stats: ViewerStats;
  followCounts: ViewerFollowCounts;
  xpHistory: Array<{ date: string; xp: number }>;
  parentChildren: ViewerParentChild[];
  parentReports: Record<string, ViewerParentReport>;
  bindingCode: { code: string; expires_at: string } | null;
  userSettings: ViewerUserSettings;
  webPushSubscription: ViewerWebPushSubscription | null;
  community: {
    people: CommunityPerson[];
    conversations: CommunityConversation[];
    studyRooms: CommunityStudyRoom[];
    discussions: CommunityDiscussion[];
    notes: CommunityNote[];
  };
};

function nowIso() {
  return new Date().toISOString();
}

function todayKey() {
  return nowIso().slice(0, 10);
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildInitialState(): ViewerFixtureState {
  const people: CommunityPerson[] = [
    {
      id: 'demo-user',
      username: 'demo-learner',
      display_name: 'Demo Learner',
      email: 'learner@demo.primoria.dev',
      status: 'online',
    },
    {
      id: 'community-mia',
      username: 'mia',
      display_name: 'Mia',
      email: 'mia@primoria.community',
      status: 'online',
    },
    {
      id: 'community-noah',
      username: 'noah',
      display_name: 'Noah',
      email: 'noah@primoria.community',
      status: 'offline',
    },
    {
      id: 'community-ava',
      username: 'ava',
      display_name: 'Ava',
      email: 'ava@primoria.community',
      status: 'online',
    },
  ];

  const studyRooms: CommunityStudyRoom[] = [
    {
      id: 'room-1',
      name: 'Weekly build review',
      description: 'Share migration blockers and unblock each other.',
      created_by: 'community-mia',
      member_ids: ['demo-user', 'community-mia', 'community-noah'],
      members: 3,
      status: 'Open now',
      conversation_id: 'conv-room-1',
    },
    {
      id: 'room-2',
      name: 'Physics sprint',
      description: 'Short focused session for quiz practice.',
      created_by: 'community-ava',
      member_ids: ['community-ava', 'demo-user'],
      members: 2,
      status: 'Starts in 20m',
      conversation_id: 'conv-room-2',
    },
  ];

  const conversations: CommunityConversation[] = [
    {
      id: 'conv-1',
      title: 'Mia',
      kind: 'direct',
      preview: 'Did everyone finish the lesson runtime task?',
      participant_ids: ['demo-user', 'community-mia'],
      unread_count: 1,
      updated_at: '2026-03-30T10:00:00Z',
      study_room_id: null,
      messages: [
        {
          id: 'message-1',
          author_id: 'community-mia',
          author_name: 'Mia',
          body: 'Did everyone finish the lesson runtime task?',
          created_at: '2026-03-30T09:50:00Z',
        },
        {
          id: 'message-2',
          author_id: 'demo-user',
          author_name: 'You',
          body: 'I am on the result screen now.',
          created_at: '2026-03-30T09:55:00Z',
        },
      ],
    },
    {
      id: 'conv-room-1',
      title: 'Weekly build review',
      kind: 'group',
      preview: 'Let us compare our rollout checklists tonight.',
      participant_ids: ['demo-user', 'community-mia', 'community-noah'],
      unread_count: 0,
      updated_at: '2026-03-30T11:00:00Z',
      study_room_id: 'room-1',
      messages: [
        {
          id: 'message-3',
          author_id: 'community-noah',
          author_name: 'Noah',
          body: 'Let us compare our rollout checklists tonight.',
          created_at: '2026-03-30T11:00:00Z',
        },
      ],
    },
    {
      id: 'conv-room-2',
      title: 'Physics sprint',
      kind: 'group',
      preview: 'Meet in 20 minutes for the quiz review.',
      participant_ids: ['demo-user', 'community-ava'],
      unread_count: 0,
      updated_at: '2026-03-30T12:10:00Z',
      study_room_id: 'room-2',
      messages: [
        {
          id: 'message-4',
          author_id: 'community-ava',
          author_name: 'Ava',
          body: 'Meet in 20 minutes for the quiz review.',
          created_at: '2026-03-30T12:10:00Z',
        },
      ],
    },
  ];

  const discussions: CommunityDiscussion[] = [
    {
      id: 'discussion-1',
      title: 'How should the viewer shell handle role redirects?',
      body: 'I want the learner shell and parent dashboard to stay unambiguous after sign-in.',
      category: 'Engineering',
      author_id: 'community-mia',
      author_name: 'Mia',
      created_at: '2026-03-30T13:00:00Z',
      likes: 14,
      liked_by_me: false,
      comments: [
        {
          id: 'comment-1',
          author_id: 'community-noah',
          author_name: 'Noah',
          body: 'I prefer hard redirects over hidden tabs.',
          created_at: '2026-03-30T13:10:00Z',
        },
      ],
    },
    {
      id: 'discussion-2',
      title: 'Best way to keep the community workspace mock-first?',
      body: 'We should stop pretending local state is enough once we cut over.',
      category: 'Technology',
      author_id: 'community-ava',
      author_name: 'Ava',
      created_at: '2026-03-30T14:00:00Z',
      likes: 9,
      liked_by_me: true,
      comments: [],
    },
  ];

  const notes: CommunityNote[] = [
    {
      id: 'note-1',
      title: 'Lesson runtime notes',
      body: 'Track gating, page reset, and completion summary.',
      room_id: null,
      updated_at: '2026-03-30T15:00:00Z',
    },
    {
      id: 'note-2',
      title: 'Parent flow',
      body: 'Child binding code remains powered by the current RPCs.',
      room_id: 'room-1',
      updated_at: '2026-03-30T16:00:00Z',
    },
  ];

  const parentChildren: ViewerParentChild[] = demoParentChildren.map((child) => ({
    child_id: child.child_id,
    child_name: child.child_name,
    avatar_url: '',
    total_xp: child.total_xp,
    current_streak: child.current_streak,
    lessons_completed: child.lessons_completed,
    courses_completed: 0,
    last_active_at: nowIso(),
  }));

  const parentReports: Record<string, ViewerParentReport> = Object.fromEntries(
    Object.entries(demoParentReports).map(([childId, report]) => {
      const child = parentChildren.find((entry) => entry.child_id === childId);
      const summary = (report.summary ?? {}) as Record<string, unknown>;
      const dailyBreakdown = Array.isArray(report.daily_breakdown)
        ? (report.daily_breakdown as Array<Record<string, unknown>>).map((entry) => ({
            date: String(entry.date ?? ''),
            minutes: Number(entry.minutes ?? 0),
            xp: Number(entry.xp ?? 0),
          }))
        : [];

      return [
        childId,
        {
          child_id: childId,
          summary: {
            study_minutes: Number(summary.study_minutes ?? 0),
            lessons_completed: Number(summary.lessons_completed ?? 0),
            courses_completed: 0,
            streak: Number(summary.streak ?? 0),
            total_xp: child?.total_xp ?? 0,
          },
          daily_breakdown: dailyBreakdown,
          courses: [],
          recent_lessons: [],
        } satisfies ViewerParentReport,
      ];
    }),
  );

  return {
    profile: {
      ...demoProfile,
      pinned_achievement_ids: [...demoProfile.pinned_achievement_ids],
      role: getDemoRole() ?? demoProfile.role,
    },
    subjects: cloneState(demoSubjects),
    courses: cloneState(demoCourses),
    enrollments: cloneState(demoEnrollments),
    completedLessonIds: [],
    achievements: cloneState(demoAchievements),
    stats: cloneState(demoStats),
    followCounts: cloneState(demoFollowCounts),
    xpHistory: Array.from(demoXpHistory.entries()).map(([date, xp]) => ({ date, xp })),
    parentChildren,
    parentReports,
    bindingCode: { code: 'DEMO-2419', expires_at: '2026-03-30T21:30:00Z' },
    userSettings: {
      theme_mode: 'system',
      language: 'zh-CN',
      notification_daily_reminder: false,
      notification_reminder_time: '20:00',
      marketing_emails: false,
      accessibility_mode: false,
    },
    webPushSubscription: null,
    community: {
      people,
      conversations,
      studyRooms,
      discussions,
      notes,
    },
  };
}

export function readFixtureState() {
  const baseState = buildInitialState();
  const role = getDemoRole();

  if (typeof window === 'undefined') {
    return role ? { ...baseState, profile: { ...baseState.profile, role } } : baseState;
  }

  try {
    const raw = window.localStorage.getItem(VIEWER_FIXTURE_STORAGE_KEY);
    if (!raw) {
      return role ? { ...baseState, profile: { ...baseState.profile, role } } : baseState;
    }
    const parsed = JSON.parse(raw) as Partial<ViewerFixtureState>;
    const next = {
      ...baseState,
      ...parsed,
      profile: {
        ...baseState.profile,
        ...parsed.profile,
        role: role ?? parsed.profile?.role ?? baseState.profile.role,
        pinned_achievement_ids: Array.isArray(parsed.profile?.pinned_achievement_ids)
          ? parsed.profile.pinned_achievement_ids.filter((value): value is string => typeof value === 'string')
          : baseState.profile.pinned_achievement_ids,
      },
      userSettings: {
        ...baseState.userSettings,
        ...parsed.userSettings,
      },
      webPushSubscription: parsed.webPushSubscription ?? baseState.webPushSubscription,
      community: {
        ...baseState.community,
        ...parsed.community,
        people: parsed.community?.people ?? baseState.community.people,
        conversations: parsed.community?.conversations ?? baseState.community.conversations,
        studyRooms: parsed.community?.studyRooms ?? baseState.community.studyRooms,
        discussions: parsed.community?.discussions ?? baseState.community.discussions,
        notes: parsed.community?.notes ?? baseState.community.notes,
      },
    } satisfies ViewerFixtureState;
    return next;
  } catch {
    return role ? { ...baseState, profile: { ...baseState.profile, role } } : baseState;
  }
}

export function writeFixtureState(next: ViewerFixtureState) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(VIEWER_FIXTURE_STORAGE_KEY, JSON.stringify(next));
}

export function patchFixtureState(mutator: (state: ViewerFixtureState) => ViewerFixtureState) {
  const next = mutator(readFixtureState());
  writeFixtureState(next);
  return next;
}

export function getFixtureSuggestedCourse() {
  return readFixtureState().courses[0] ?? demoCourses[0];
}

export function getFixtureCourseDetail(courseId: string) {
  const state = readFixtureState();
  const course = state.courses.find((entry) => entry.id === courseId) ?? state.courses[0] ?? demoCourses[0];
  const lessons = getDemoCourseLessons(courseId) ?? getDemoCourseLessons(demoCourseSnapshot.course_id) ?? [];
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  return {
    course,
    lessons,
    completed_lesson_ids: state.completedLessonIds.filter((lessonId) => lessonIds.has(lessonId)),
    enrollment: state.enrollments.find((entry) => entry.course_id === course.id) ?? null,
  };
}

function unlockFixtureAchievement(state: ViewerFixtureState, slug: string) {
  const target = state.achievements.find((achievement) => achievement.slug === slug || achievement.id === slug);
  if (!target || target.earned_at) {
    return null;
  }
  target.earned_at = nowIso();
  return { ...target };
}

export function completeFixtureLesson(lessonId: string, correctCount: number, totalCount: number, timeSpentSeconds: number) {
  const state = readFixtureState();
  const unlocked: ViewerAchievement[] = [];
  const targetCourseId = getDemoCourseIdForLesson(lessonId) ?? demoCourseSnapshot.course_id;
  const targetLessons = getDemoCourseLessons(targetCourseId) ?? getDemoCourseLessons(demoCourseSnapshot.course_id) ?? [];
  const targetLessonIds = new Set(targetLessons.map((lesson) => lesson.id));

  if (!state.completedLessonIds.includes(lessonId)) {
    state.completedLessonIds.push(lessonId);
  }

  const earnedXp = targetLessons.find((lesson) => lesson.id === lessonId)?.xp_reward ?? 120;

  state.stats.lessons_completed += 1;
  state.stats.total_xp += earnedXp;
  state.stats.total_study_minutes += Math.round(timeSpentSeconds / 60);

  const xpEntry = state.xpHistory.find((entry) => entry.date === todayKey());
  if (xpEntry) {
    xpEntry.xp += earnedXp;
  } else {
    state.xpHistory.push({ date: todayKey(), xp: earnedXp });
  }

  const firstLesson = unlockFixtureAchievement(state, 'first_lesson');
  if (firstLesson) {
    unlocked.push(firstLesson);
  }

  const targetCourse = state.courses.find((entry) => entry.id === targetCourseId);
  if (targetCourse && !state.enrollments.some((entry) => entry.course_id === targetCourseId)) {
    state.enrollments.unshift({
      course_id: targetCourseId,
      status: 'in_progress',
      progress_bp: 0,
      started_at: nowIso(),
      last_accessed_at: nowIso(),
      courses: targetCourse,
    });
  }

  const wasCourseAlreadyCompleted = state.enrollments.some(
    (entry) => entry.course_id === targetCourseId && entry.status === 'completed',
  );
  const completedTargetLessons = state.completedLessonIds.filter((candidate) => targetLessonIds.has(candidate)).length;
  const nextProgressBp =
    targetLessons.length > 0 ? Math.round((completedTargetLessons / targetLessons.length) * 10000) : 0;
  const courseCompleted = targetLessons.length > 0 && completedTargetLessons >= targetLessons.length;

  if (courseCompleted) {
    if (!wasCourseAlreadyCompleted) {
      state.stats.courses_completed += 1;
    }
    state.enrollments = state.enrollments.map((entry) => ({
      ...entry,
      status: entry.course_id === targetCourseId ? 'completed' : entry.status,
      progress_bp: entry.course_id === targetCourseId ? 10000 : entry.progress_bp,
      completed_at: entry.course_id === targetCourseId ? nowIso() : entry.completed_at,
      last_accessed_at: entry.course_id === targetCourseId ? nowIso() : entry.last_accessed_at,
    }));
    const firstCourse = unlockFixtureAchievement(state, 'first_course');
    if (firstCourse) {
      unlocked.push(firstCourse);
    }
  } else {
    state.enrollments = state.enrollments.map((entry) => ({
      ...entry,
      progress_bp: entry.course_id === targetCourseId ? nextProgressBp : entry.progress_bp,
      last_accessed_at: entry.course_id === targetCourseId ? nowIso() : entry.last_accessed_at,
    }));
  }

  writeFixtureState(state);

  return {
    xp_earned: earnedXp,
    total_xp: state.stats.total_xp,
    base_xp: 50,
    accuracy_xp: correctCount > 0 && correctCount === totalCount ? 35 : 20,
    streak_xp: state.stats.current_streak >= 7 ? 10 : 0,
    first_today_xp: 5,
    accuracy_pct: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100,
    already_completed: false,
    course_completed: courseCompleted,
    unlocked_achievements: unlocked,
  };
}

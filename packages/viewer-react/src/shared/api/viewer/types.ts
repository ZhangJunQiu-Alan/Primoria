import type { ViewerLanguage } from '@/shared/i18n/locale';

export type ViewerSubject = {
  id: string;
  name: string;
  color_hex: string;
};

export type ViewerThemeMode = 'system' | 'light' | 'dark';
export type ViewerAiTutorPersona = 'gentle' | 'socratic' | 'coach';

export type ViewerCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  content_language?: ViewerLanguage | null;
  difficulty_level: string;
  estimated_minutes: number;
  tags: string[];
  subject_id: string;
  subjects: ViewerSubject;
  published_at: string | null;
};

export type ViewerOwnedCourse = ViewerCourse & {
  status: string;
  updated_at: string | null;
};

export type TutorDocument = {
  id: string;
  filename: string;
  display_title: string | null;
  mime_type: string;
  extracted_chars: number;
  created_at: string;
  updated_at: string;
};

export type LegacyMindMapNode = {
  id: string;
  label: string;
  children?: LegacyMindMapNode[];
};

export type MindMapLink = {
  id: string;
  label: string;
  url: string;
};

export type MindMapThemePreset = 'sage' | 'amber' | 'stone';
export type MindMapLayoutMode = 'balanced';
export type MindMapConnectionStyle = 'curve';
export type MindMapNodeShape = 'capsule' | 'rounded' | 'underline';
export type MindMapNodeFill = 'auto' | 'sage' | 'amber' | 'stone' | 'slate';
export type MindMapBranchColor = 'auto' | 'sage' | 'amber' | 'stone' | 'rose' | 'slate';
export type MindMapMarker =
  | 'priority-high'
  | 'priority-medium'
  | 'status-active'
  | 'status-done'
  | 'star';

export type MindMapTheme = {
  preset: MindMapThemePreset;
};

export type MindMapLayout = {
  mode: MindMapLayoutMode;
  connectionStyle: MindMapConnectionStyle;
};

export type MindMapNodeStyle = {
  shape: MindMapNodeShape;
  fill: MindMapNodeFill;
  emphasis: 'normal' | 'strong';
  branchColor: MindMapBranchColor;
};

export type MindMapNode = {
  id: string;
  parentId: string | null;
  childIds: string[];
  label: string;
  collapsed: boolean;
  icon: string | null;
  tags: string[];
  markers: MindMapMarker[];
  style: MindMapNodeStyle;
  noteHtml: string;
  imageUrl: string | null;
  links: MindMapLink[];
  documentRefs: string[];
};

export type MindMapDocument = {
  id: string;
  title: string;
  sourceDocumentIds: string[];
  userPrompt: string;
  theme: MindMapTheme;
  layout: MindMapLayout;
  rootNodeId: string;
  nodes: Record<string, MindMapNode>;
  createdAt: string;
  updatedAt: string;
};

export type MindMapSummary = {
  id: string;
  title: string;
  sourceDocumentIds: string[];
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMindMapFromDocsRequest = {
  documentIds: string[];
  prompt?: string;
};

export type CreateMindMapFromDocsResponse = {
  title: string;
  mindMapId: string;
  root: LegacyMindMapNode;
};

export type QuizOutputLanguage = 'en' | 'zh-CN';

export type CreateQuizFromDocsRequest = {
  documentIds: string[];
  questionCount: number;
  language: QuizOutputLanguage;
};

export type CreateQuizFromDocsResponse = {
  courseId: string;
  courseTitle: string;
};

export type ViewerEnrollment = {
  id?: string;
  course_id: string;
  status: string;
  progress_bp: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_accessed_at?: string | null;
  courses: ViewerCourse;
};

export type ViewerHomeLesson = {
  id: string;
  title: string;
  sort_key: number;
  xp_reward: number;
  duration_seconds: number;
  is_locked: boolean;
  unlock_type: string;
};

export type ViewerHomeCourseDetail = {
  course: ViewerCourse;
  lessons: ViewerHomeLesson[];
  completed_lesson_ids: string[];
  enrollment: ViewerEnrollment | null;
};

export type ViewerHomePayload = {
  stats: ViewerStats;
  in_progress_enrollments: ViewerEnrollment[];
  resolved_selected_course_id: string | null;
  selected_course_detail: ViewerHomeCourseDetail | null;
};

export type ViewerProfile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  cover_image_url: string;
  role: string;
  created_at: string;
  pinned_achievement_ids: string[];
};

export type ViewerUserSettings = {
  theme_mode: ViewerThemeMode;
  language: ViewerLanguage;
  notification_daily_reminder: boolean;
  notification_reminder_time: string;
  marketing_emails: boolean;
  accessibility_mode: boolean;
  ai_tutor_persona: ViewerAiTutorPersona;
  home_companion_enabled: boolean;
};

export type ViewerSettingsBundle = {
  profile: ViewerProfile;
  userSettings: ViewerUserSettings;
};

export type ViewerWebPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  permission_state: 'default' | 'granted' | 'denied' | 'unsupported';
  active: boolean;
  created_at?: string;
  updated_at?: string;
  last_sent_at?: string | null;
};

export type ViewerAchievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  earned_at: string | null;
};

export type ViewerStats = {
  current_streak: number;
  longest_streak: number;
  courses_completed: number;
  lessons_completed: number;
  total_xp: number;
  total_study_minutes: number;
  last_activity_date?: string | null;
};

export type ViewerFollowCounts = {
  following: number;
  followers: number;
};

export type ViewerParentChild = {
  child_id: string;
  child_name: string;
  avatar_url: string;
  total_xp: number;
  current_streak: number;
  lessons_completed: number;
  courses_completed: number;
  last_active_at: string | null;
};

export type ViewerParentCourseProgress = {
  course_id: string;
  title: string;
  status: string;
  progress_percentage: number;
  completed_lessons: number;
  last_accessed_at: string | null;
};

export type ViewerParentLessonActivity = {
  lesson_id: string;
  lesson_title: string;
  score: number;
  correct_count: number;
  total_count: number;
  completed_at: string | null;
};

export type ViewerParentReport = {
  child_id: string;
  summary: {
    study_minutes: number;
    lessons_completed: number;
    courses_completed: number;
    streak: number;
    total_xp: number;
  };
  daily_breakdown: Array<{ date: string; minutes: number; xp: number }>;
  courses: ViewerParentCourseProgress[];
  recent_lessons: ViewerParentLessonActivity[];
};

export type ViewerLessonCompletion = {
  xp_earned: number;
  total_xp: number;
  base_xp: number;
  accuracy_xp: number;
  streak_xp: number;
  first_today_xp: number;
  accuracy_pct: number;
  already_completed: boolean;
  course_completed: boolean;
  unlocked_achievements: ViewerAchievement[];
};

export type CommunityPerson = {
  id: string;
  username: string;
  display_name: string;
  email: string;
  status: 'online' | 'offline';
};

export type CommunityMessage = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  content_language?: string | null;
  created_at: string;
};

export type CommunityConversation = {
  id: string;
  title: string;
  kind: 'direct' | 'group';
  preview: string;
  participant_ids: string[];
  unread_count: number;
  updated_at: string;
  study_room_id: string | null;
  messages: CommunityMessage[];
};

export type CommunityStudyRoom = {
  id: string;
  name: string;
  description: string;
  created_by: string;
  member_ids: string[];
  members: number;
  status: string;
  conversation_id: string | null;
};

export type CommunityDiscussionComment = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  content_language?: string | null;
  created_at: string;
};

export type CommunityDiscussion = {
  id: string;
  title: string;
  body: string;
  content_language?: string | null;
  category: string;
  author_id: string;
  author_name: string;
  created_at: string;
  likes: number;
  liked_by_me: boolean;
  comments: CommunityDiscussionComment[];
};

export type CommunityNote = {
  id: string;
  title: string;
  body: string;
  content_language?: string | null;
  room_id: string | null;
  lesson_id: string | null;
  updated_at: string;
};

export type CommunityNoteInput = {
  id?: string;
  title: string;
  body: string;
  room_id?: string | null;
  lesson_id?: string | null;
};

export type CommunityWorkspace = {
  conversations: CommunityConversation[];
  studyRooms: CommunityStudyRoom[];
  discussions: CommunityDiscussion[];
  notes: CommunityNote[];
  people: CommunityPerson[];
};

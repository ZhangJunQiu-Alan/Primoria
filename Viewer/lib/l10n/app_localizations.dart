/// All UI strings for English and Chinese.
/// Access via: context.watch[LanguageProvider]().t
class AppLocalizations {
  final String languageCode;
  const AppLocalizations(this.languageCode);

  bool get isZh => languageCode == 'zh';

  String get langDisplayName => isZh ? '中文' : 'English';

  // ── Bottom Nav ──────────────────────────────────────────────
  String get navHome => isZh ? '主页' : 'Home';
  String get navLibrary => isZh ? '课程库' : 'Library';
  String get navCommunity => isZh ? '社区' : 'Community';
  String get navProfile => isZh ? '我的' : 'Profile';

  // ── Common ──────────────────────────────────────────────────
  String get cancel => isZh ? '取消' : 'Cancel';
  String get completed => isZh ? '已完成' : 'Completed';

  // ── Home Screen ─────────────────────────────────────────────
  String get homeStartLearning => isZh ? '开始学习' : 'Start Learning';
  String get homeExploreCourses => isZh ? '探索课程' : 'EXPLORE COURSES';
  String homeLessonProgress(int done, int total) =>
      isZh ? '第 $done / $total 课' : 'LESSON $done / $total';
  String get homeEnrollPrompt =>
      isZh ? '报名一门课程开始学习！' : 'Enroll in a course to start learning!';
  String get homeContinueLearning => isZh ? '继续学习' : 'Continue Learning';
  String get homeBrowseCourses => isZh ? '浏览课程' : 'Browse Courses';
  String get homeNoLessons => isZh ? '暂无课程' : 'No lessons';
  String homeLessonCount(int count) => isZh ? '$count 节课' : '$count lessons';

  // ── Search Screen ───────────────────────────────────────────
  String get searchAllCourses => isZh ? '全部课程' : 'All Courses';
  String get searchPlaceholder => isZh ? '搜索课程...' : 'Search courses...';
  String get searchAllTab => isZh ? '全部' : 'All';
  String get searchResults => isZh ? '搜索结果' : 'Search Results';
  String get searchNoResults => isZh ? '未找到课程。' : 'No courses found.';

  // ── Course Screen ───────────────────────────────────────────
  String get courseDefaultTitle => isZh ? '课程' : 'Course';
  String get courseEnrolling => isZh ? '报名中…' : 'Enrolling…';
  String get courseEnroll => isZh ? '报名课程' : 'Enroll in Course';
  String get courseLearningPath => isZh ? '学习路径' : 'Learning Path';
  String get courseNoChapters => isZh ? '暂无章节。' : 'No chapters available yet.';
  String get courseNoLessons => isZh ? '暂无课程内容。' : 'No lessons available yet.';
  String get courseUpNext => isZh ? '接下来' : 'Up Next';

  // ── Lesson Screen ───────────────────────────────────────────
  String get lessonDefaultTitle => isZh ? '互动学习' : 'Interactive Learning';
  String get lessonEnterAnswer => isZh ? '输入答案' : 'Enter answer';
  String get lessonBack => isZh ? '返回' : 'Back';
  String get lessonContinue => isZh ? '继续' : 'Continue';
  String get lessonSubmit => isZh ? '提交答案' : 'Submit Answer';
  String get lessonComplete => isZh ? '完成课程' : 'Complete Lesson';
  String get lessonExitTitle => isZh ? '退出？' : 'Exit?';
  String get lessonExitBody =>
      isZh ? '当前进度不会被保存。' : 'Your current progress will not be saved.';
  String get lessonExit => isZh ? '退出' : 'Exit';
  String get lessonContentUnavailableTitle =>
      isZh ? '内容暂不可用' : 'Content unavailable';

  // ── Profile Screen ──────────────────────────────────────────
  String profileJoined(int year) => isZh ? '加入于 $year' : 'Joined $year';
  String get profileCourses => isZh ? '课程' : 'COURSES';
  String get profileTotalXp => isZh ? '总经验值' : 'TOTAL XP';
  String get profileFollowing => isZh ? '关注' : 'FOLLOWING';
  String get profileFans => isZh ? '粉丝' : 'FANS';
  String get profileDailyBadge => isZh ? '每日专属徽章' : 'Daily Exclusive Badge';
  String get profileBadgeSubtitle =>
      isZh ? '坚持学习保持你的徽章！' : 'Keep learning to maintain your badge!';
  String profileStreakDays(int days) =>
      isZh ? '$days 天连续学习' : '$days-Day Streak';
  String get profileAchievements => isZh ? '成就' : 'Achievements';
  String get profileViewAll => isZh ? '查看全部' : 'View All';
  String get profileSettings => isZh ? '设置' : 'Settings';
  String get profileNotifications => isZh ? '通知' : 'Notifications';
  String get profileLanguage => isZh ? '语言' : 'Language';
  String get profileDarkMode => isZh ? '深色模式' : 'Dark Mode';
  String get profileHelpFeedback => isZh ? '帮助与反馈' : 'Help & Feedback';
  String get profileAbout => isZh ? '关于' : 'About';
  String get profileLogout => isZh ? '退出登录' : 'Logout';
  String get profileLogoutTitle => isZh ? '退出登录' : 'Log Out';
  String get profileLogoutBody => isZh
      ? '确定要退出登录吗？\n您需要重新登录才能访问您的账户。'
      : "Are you sure you want to log out?\nYou'll need to sign in again to access your account.";
  String get profileLogoutConfirm => isZh ? '退出' : 'Log Out';

  // ── Theme Picker ────────────────────────────────────────────
  String get themeSelectTitle => isZh ? '选择主题' : 'Select Theme';
  String get themeFollowSystem => isZh ? '跟随系统' : 'Follow System';
  String get themeLightMode => isZh ? '浅色模式' : 'Light Mode';
  String get themeDarkMode => isZh ? '深色模式' : 'Dark Mode';

  // ── Language Picker ─────────────────────────────────────────
  String get langSelectTitle => isZh ? '选择语言' : 'Select Language';
  static const String langEnglish = 'English';
  static const String langChinese = '中文';

  // ── Community Screen ────────────────────────────────────────
  String get communityFind => isZh ? '发现' : 'find';
  String get communityMessage => isZh ? '消息' : 'message';
  String get communitySearch => isZh ? '搜索' : 'search';
  String get communityFindButton => isZh ? '寻找' : 'Find';
}

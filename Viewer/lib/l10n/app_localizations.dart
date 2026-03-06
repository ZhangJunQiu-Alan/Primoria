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
  String get courseLocked => isZh ? '已锁定' : 'Locked';
  String get courseLockedPrerequisite =>
      isZh ? '完成前置课后解锁' : 'Complete the prerequisite lesson to unlock.';
  String get courseLockedPaid => isZh ? '需要付费解锁' : 'Paid unlock required.';
  String get courseLockedPrerequisiteOrPaid =>
      isZh ? '完成前置课或付费后解锁' : 'Complete prerequisite or pay to unlock.';
  String get courseLockedPrerequisiteAndPaid =>
      isZh ? '完成前置课并付费后解锁' : 'Complete prerequisite and pay to unlock.';

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
  String profileMonthYear(DateTime date) {
    if (isZh) return '${date.year}年${date.month}月';
    const months = <String>[
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    final monthIndex = (date.month >= 1 && date.month <= 12)
        ? date.month - 1
        : 0;
    final month = months[monthIndex];
    return '$month ${date.year}';
  }

  String profileJoinedAtMonthYear(DateTime date) {
    final formatted = profileMonthYear(date);
    return isZh ? '加入于 $formatted' : 'Joined at $formatted';
  }

  String get profilePersonalInfo => isZh ? '个人信息' : 'Personal Info';
  String get profileUsername => isZh ? '用户名' : 'Username';
  String get profileBio => isZh ? '个人简介' : 'Bio';
  String get profileRole => isZh ? '角色' : 'Role';
  String get profileJoinedAt => isZh ? '加入时间' : 'Joined at';
  String get profileUploadAvatar => isZh ? '上传头像' : 'Upload Avatar';
  String get profileSaving => isZh ? '保存中…' : 'Saving…';
  String get profileSave => isZh ? '保存' : 'Save';
  String get profileSaveSuccess => isZh ? '个人信息已更新' : 'Profile updated';
  String get profileSaveFailed =>
      isZh ? '更新失败，请重试' : 'Failed to update profile';
  String get profileAvatarUploadFailed =>
      isZh ? '头像上传失败，请重试' : 'Avatar upload failed. Please retry.';
  String get profileFieldRequired =>
      isZh ? '此字段不能为空' : 'This field is required';
  String get profileUsernameLengthHint =>
      isZh ? '用户名需为 3-32 个字符' : 'Username must be 3-32 characters';
  String get profileHelp => isZh ? '帮助' : 'Help';
  String get profileHelpBody => isZh
      ? '如需帮助，请通过产品内反馈联系我们。'
      : 'Need help? Contact us via in-app feedback.';
  String get profileAboutBody => isZh
      ? 'Primoria 是一个交互式学习平台，帮助你高效掌握知识。'
      : 'Primoria is an interactive learning platform designed for effective learning.';
  String profileRoleLabel(String role) {
    switch (role.trim().toLowerCase()) {
      case 'parent':
        return isZh ? '家长' : 'Parent';
      case 'subscriber':
        return isZh ? '订阅用户' : 'Subscriber';
      case 'author':
        return isZh ? '创作者' : 'Author';
      case 'admin':
        return isZh ? '管理员' : 'Admin';
      case 'user':
      default:
        return isZh ? '普通用户' : 'User';
    }
  }

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
  String get parentDashboardTitle => isZh ? '家长看板' : 'Parent Dashboard';
  String get parentDashboardOpen => isZh ? '打开家长看板' : 'Open Parent Dashboard';
  String get parentModeSectionTitle => isZh ? '家长模式' : 'Parent Mode';
  String get parentModeCurrentRole => isZh ? '当前模式' : 'Current Mode';
  String get parentModeLearnerBody => isZh
      ? '生成绑定码后，家长账号即可关联并查看你的学习报告。'
      : 'Generate a binding code so a parent account can link and view your learning report.';
  String get parentModeParentBody => isZh
      ? '你当前是家长账号，可以在家长看板中绑定孩子并查看学习报告。'
      : 'You are using a parent account. Open the dashboard to bind children and review reports.';
  String get parentSwitchToParent => isZh ? '切换为家长模式' : 'Switch to Parent Mode';
  String get parentSwitchToLearner =>
      isZh ? '切换为学习者模式' : 'Switch to Learner Mode';
  String get parentSwitching => isZh ? '切换中…' : 'Switching…';
  String get parentSwitchToParentSuccess =>
      isZh ? '已切换为家长模式' : 'Switched to parent mode';
  String get parentSwitchToLearnerSuccess =>
      isZh ? '已切换为学习者模式' : 'Switched to learner mode';
  String get parentBindingCodeTitle => isZh ? '孩子绑定码' : 'Child Binding Code';
  String get parentBindingCodeGenerate => isZh ? '生成绑定码' : 'Generate Code';
  String get parentBindingCodeRefresh => isZh ? '刷新绑定码' : 'Refresh Code';
  String get parentBindingCodeCopied => isZh ? '绑定码已复制' : 'Binding code copied';
  String parentBindingCodeExpiresAt(DateTime time) {
    if (isZh) {
      return '有效期至 ${time.month}月${time.day}日 ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    }
    return 'Expires at ${time.month}/${time.day} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  String get parentBindSectionTitle => isZh ? '绑定孩子' : 'Bind a Child';
  String get parentBindSectionBody => isZh
      ? '输入孩子设备上生成的绑定码，建立家长与孩子的只读关联。'
      : 'Enter the binding code generated on the child device to create a read-only parent link.';
  String get parentBindCodeLabel => isZh ? '绑定码' : 'Binding Code';
  String get parentBindCodeHint =>
      isZh ? '输入 8 位绑定码' : 'Enter 8-character code';
  String get parentBindSubmit => isZh ? '确认绑定' : 'Bind Child';
  String get parentBindSuccess => isZh ? '绑定成功' : 'Child linked successfully';
  String get parentUnbind => isZh ? '解绑' : 'Unbind';
  String get parentUnbindSuccess => isZh ? '已解绑' : 'Child unbound';
  String get parentChildrenTitle => isZh ? '已绑定孩子' : 'Linked Children';
  String parentChildrenCount(int count) =>
      isZh ? '共 $count 位孩子' : '$count children linked';
  String get parentChildrenEmpty => isZh
      ? '还没有绑定任何孩子，先输入绑定码开始。'
      : 'No linked children yet. Start by entering a binding code.';
  String parentReportTitle(String childName) =>
      isZh ? '$childName 的学习报告' : "$childName's report";
  String get parentReportEmpty =>
      isZh ? '选择一个孩子后查看学习数据。' : 'Select a child to view learning data.';
  String get parentReportLoading => isZh ? '加载报告中…' : 'Loading report…';
  String get parentReportStatsTitle => isZh ? '核心数据' : 'Key Stats';
  String get parentReportTrendTitle =>
      isZh ? '近 7 天活跃趋势' : '7-Day Activity Trend';
  String get parentReportCoursesTitle => isZh ? '课程进度' : 'Course Progress';
  String get parentReportLessonsTitle => isZh ? '最近完成课时' : 'Recent Lessons';
  String get parentReportNoCourses => isZh ? '暂无课程数据' : 'No course data yet';
  String get parentReportNoLessons => isZh ? '暂无课时记录' : 'No lesson records yet';
  String get parentReportNoTrend => isZh ? '暂无趋势数据' : 'No trend data yet';
  String get parentStatXp => isZh ? '总 XP' : 'Total XP';
  String get parentStatStreak => isZh ? '连续天数' : 'Streak';
  String get parentStatLessons => isZh ? '完成课时' : 'Lessons';
  String get parentStatCourses => isZh ? '完成课程' : 'Courses';
  String get parentStatAccuracy => isZh ? '正确率' : 'Accuracy';

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

  // ── Lesson Result Screen ─────────────────────────────────────
  String get resultTitle => isZh ? '课程完成！' : 'Lesson Complete!';
  String get resultAccuracy => isZh ? '正确率' : 'Accuracy';
  String get resultTimeSpent => isZh ? '用时' : 'Time';
  String get resultStreakLabel => isZh ? '天连击' : 'Day Streak';
  String get resultTodayStar => isZh ? '今日星星' : "Today's Star";
  String get resultStarLit => isZh ? '刚刚点亮！' : 'Just lit!';
  String get resultTaskProgress => isZh ? '任务进度更新' : 'Task Progress';
  String get resultContinue => isZh ? '继续学习' : 'Continue Learning';
  String get resultGoHome => isZh ? '返回主页' : 'Back to Home';
  String get resultAchievementHint =>
      isZh ? '🏆 有新成就解锁！点击继续查看' : '🏆 New achievement! Tap continue to view';
  String get resultCompleted => isZh ? '已完成' : 'Completed';
  String get resultInProgress => isZh ? '进行中' : 'In Progress';
  String resultXpEarned(int xp) => '+$xp XP';

  // ── Star Chain ───────────────────────────────────────────────
  String get starChainTitle => isZh ? '今日星星' : "Today's Star";
  String get starChainComplete => isZh ? '本周全勤！' : 'Perfect Week!';
  List<String> get weekDayLabels => isZh
      ? ['一', '二', '三', '四', '五', '六', '日']
      : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // ── Daily Tasks ──────────────────────────────────────────────
  String get dailyTaskTitle => isZh ? '每日任务' : 'Daily Quests';
  String get dailyTaskAllDone => isZh ? '今日圆满 🎉' : 'All Done! 🎉';
  String dailyTaskRewardHint(int xp) =>
      isZh ? '完成全部解锁 +${xp}XP' : 'Complete all to unlock +${xp}XP';
  String dailyTaskProgress(int current, int total) => '$current/$total';
  String get dailyTaskLoading => isZh ? '加载任务中…' : 'Loading quests…';

  // ── Achievement Popup ────────────────────────────────────────
  String get achievementUnlocked => isZh ? '成就解锁！' : 'Achievement Unlocked!';
  String get achievementPin => isZh ? '置顶此成就' : 'Pin Achievement';
  String get achievementPinned => isZh ? '已置顶 ✓' : 'Pinned ✓';
  String get achievementPinReplace => isZh ? '替换置顶成就' : 'Replace Pinned';
  String get achievementContinue => isZh ? '继续' : 'Continue';

  // ── Achievement Rarity ───────────────────────────────────────
  String get rarityCommon => isZh ? '普通' : 'Common';
  String get rarityRare => isZh ? '稀有' : 'Rare';
  String get rarityEpic => isZh ? '史诗' : 'Epic';
  String get rarityLegendary => isZh ? '传说' : 'Legendary';

  // ── Achievement Wall ─────────────────────────────────────────
  String get achievementWallTitle => isZh ? '我的成就' : 'My Achievements';
  String achievementWallCount(int n, int total) =>
      isZh ? '已解锁 $n/$total' : 'Unlocked $n/$total';
  String get achievementManage => isZh ? '管理' : 'Manage';
  String get achievementManageTitle => isZh ? '管理置顶成就' : 'Manage Pinned';
  String get achievementManageHint =>
      isZh ? '最多选择3个显示在个人资料页' : 'Select up to 3 to show on profile';
  String get achievementCategoryAll => isZh ? '全部' : 'All';
  String get achievementCategoryStreak => isZh ? '坚持' : 'Streak';
  String get achievementCategoryLearning => isZh ? '学习' : 'Learning';
  String get achievementCategoryChallenge => isZh ? '挑战' : 'Challenge';
  String get achievementCategorySocial => isZh ? '社交' : 'Social';

  // ── Profile gamification ─────────────────────────────────────
  String get profileMyAchievements => isZh ? '我的成就' : 'My Achievements';
  String get profileViewAllAchievements =>
      isZh ? '查看全部成就 →' : 'View All Achievements →';
  String get profileStarThisWeek => isZh ? '本周星星' : 'This Week';
  String get profileStarLastWeek => isZh ? '上周' : 'Last Week';
  String get profileWeekPerfect => isZh ? '🌈 全勤' : '🌈 Perfect';
  String get profileNoPinnedAchievements =>
      isZh ? '暂无置顶成就' : 'No pinned achievements yet';

  // ── Profile XP Heatmap ───────────────────────────────────────
  String get profileXpHeatmapTitle => isZh ? '学习热力图' : 'Learning Activity';
  String profileXpHeatmapTotal(int n) => isZh ? '今年 $n XP' : '$n XP this year';
  String profileXpHeatmapDay(DateTime d, int xp) {
    if (isZh) {
      return '${d.year}年${d.month}月${d.day}日 · $xp XP';
    }
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}, ${d.year} · $xp XP';
  }

  // ── Profile cover image ───────────────────────────────────────
  String get profileCoverImage => isZh ? '封面图' : 'Cover Image';
  String get profileChangeCover => isZh ? '更换封面' : 'Change Cover';
  String get profileCoverUploadFailed =>
      isZh ? '封面上传失败' : 'Cover upload failed';
  String get profileCoverUploadSuccess => isZh ? '封面已更新' : 'Cover updated';
  String profileImageTooLarge(int maxMb) => isZh
      ? '图片过大，请选择不超过 ${maxMb}MB 的图片'
      : 'Image is too large. Please choose an image up to ${maxMb}MB.';
}

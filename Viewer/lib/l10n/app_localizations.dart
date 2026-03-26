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
  String get navAiTutor => isZh ? 'AI导师' : 'AI Tutor';
  String get navProfile => isZh ? '我的' : 'Profile';

  // ── Common ──────────────────────────────────────────────────
  String get cancel => isZh ? '取消' : 'Cancel';
  String get completed => isZh ? '已完成' : 'Completed';

  // ── Auth Screens ────────────────────────────────────────────
  String get authBackToHome => isZh ? '返回首页' : 'Back to Home';
  String get authBackShort => isZh ? '← 返回' : '← Back';
  String get authWelcomeBackTitle => isZh ? '欢迎回来' : 'Welcome Back';
  String get authWelcomeBackSubtitle =>
      isZh ? '登录后继续你的学习旅程。' : 'Sign in to continue your learning journey.';
  String get authEmailLabel => isZh ? '邮箱' : 'Email';
  String get authPasswordLabel => isZh ? '密码' : 'Password';
  String get authPlaceholderEmail =>
      isZh ? 'you@example.com' : 'you@example.com';
  String get authPlaceholderPasswordMin6 =>
      isZh ? '至少 6 个字符' : 'At least 6 characters';
  String get authRememberMe => isZh ? '记住我' : 'Remember me';
  String get authForgotPassword => isZh ? '忘记密码？' : 'Forgot password?';
  String get authSignInButton => isZh ? '登录' : 'Sign In';
  String get authOrContinueWith => isZh ? '或使用以下方式继续' : 'or continue with';
  String get authContinueWithGoogle =>
      isZh ? '使用 Google 继续' : 'Continue with Google';
  String get authContinueWithApple =>
      isZh ? '使用 Apple 继续' : 'Continue with Apple';
  String get authContinueWithWeChat => isZh ? '使用微信继续' : 'Continue with WeChat';
  String get authNoAccountPrompt => isZh ? '还没有账号？' : 'Don’t have an account? ';
  String get authSignUpLink => isZh ? '注册' : 'Sign Up';

  String get authValidationEmailOrPhoneRequired =>
      isZh ? '请输入邮箱或手机号。' : 'Please enter your email or phone.';
  String get authValidationEmailOrPhoneInvalid =>
      isZh ? '请输入有效的邮箱或手机号。' : 'Please enter a valid email or phone number.';
  String get authValidationPasswordRequired =>
      isZh ? '请输入密码。' : 'Please enter your password.';
  String get authValidationPasswordMin6 =>
      isZh ? '密码至少需要 6 个字符。' : 'Password must be at least 6 characters.';

  String get authStatusSigningIn => isZh ? '登录中…' : 'Signing in…';
  String get authStatusWelcomeBack => isZh ? '欢迎回来！' : 'Welcome back!';
  String get authStatusRedirectGoogle =>
      isZh ? '正在跳转到 Google…' : 'Redirecting to Google…';
  String get authStatusRedirectApple =>
      isZh ? '正在跳转到 Apple…' : 'Redirecting to Apple…';

  String get authResetPasswordTitle => isZh ? '重置密码' : 'Reset Password';
  String get authResetPasswordBody => isZh
      ? '请输入你的邮箱地址，我们会发送重置链接。'
      : 'Enter your email address and we’ll send a reset link.';
  String get authResetPasswordSend => isZh ? '发送链接' : 'Send Link';
  String get authResetPasswordSent =>
      isZh ? '重置链接已发送，请检查邮箱。' : 'Reset link sent! Check your email.';

  String get authBrandHeadline =>
      isZh ? '你的学习旅程\n从这里开始。' : 'Your Learning Journey\nStarts Here.';
  String get authBrandSubtitle => isZh
      ? '加入 10000+ 位学生，用 AI 驱动的互动课程\n掌握 STEM。'
      : 'Join 10000+ students mastering STEM\nwith AI-powered interactive lessons.';
  String get authFeatureInteractiveLessons =>
      isZh ? '互动课程' : 'Interactive Lessons';
  String get authFeatureAiTutor => isZh ? 'AI 个性导师' : 'AI Personal Tutor';
  String get authFeatureXpAchievements => isZh ? 'XP 与成就' : 'XP & Achievements';
  String get authFeatureStudyBuddy => isZh ? '学习伙伴匹配' : 'Study Buddy Match';
  String get authTestimonialQuote => isZh
      ? '“我已经连续学习 47 天了！AI 导师讲解非常清晰，我现在每天都很期待学习。”'
      : '“47-day streak and counting! The AI tutor explains everything so clearly. I actually look forward to studying now.”';
  String get authTestimonialRole => isZh ? '自学学习者' : 'Self-taught learner';

  String get registerBrandHeadline =>
      isZh ? '今天就免费\n开始学习。' : 'Start learning\nfor free today.';
  String get registerBrandSubtitle =>
      isZh ? '无需信用卡。\n可随时取消。' : 'No credit card required.\nCancel anytime.';
  String get registerCreateTitle => isZh ? '创建你的账号' : 'Create your account';
  String get registerCreateSubtitle =>
      isZh ? '免费开启你的学习旅程。' : 'Start your learning journey for free today.';
  String get registerUsernameLabel => isZh ? '用户名' : 'Username';
  String get registerUsernameHint => isZh ? '输入用户名' : 'Choose a username';
  String get registerConfirmPasswordLabel => isZh ? '确认密码' : 'Confirm Password';
  String get registerConfirmPasswordHint =>
      isZh ? '再次输入密码' : 'Repeat your password';
  String get registerCreateButton => isZh ? '创建账号' : 'Create Account';
  String get registerOrSignUpWith => isZh ? '或使用以下方式注册' : 'or sign up with';
  String get registerAlreadyHaveAccount =>
      isZh ? '已有账号？' : 'Already have an account? ';
  String get registerTermsPrefix => isZh ? '我同意 ' : 'I agree to the ';
  String get registerTermsOfService => isZh ? '服务条款' : 'Terms of Service';
  String get registerTermsAnd => isZh ? ' 和 ' : ' and ';
  String get registerPrivacyPolicy => isZh ? '隐私政策' : 'Privacy Policy';
  String get registerStatusCreatingAccount =>
      isZh ? '正在创建账号…' : 'Creating your account…';
  String get registerStatusCreatedWelcome =>
      isZh ? '账号已创建，欢迎来到 Primoria。' : 'Account created! Welcome to Primoria.';
  String get registerStatLearners => isZh ? '学习者' : 'Learners';
  String get registerStatCourses => isZh ? '课程' : 'Courses';
  String get registerStatRating => isZh ? '评分' : 'Rating';
  String get registerPasswordTooShort => isZh ? '过短' : 'Too Short';
  String get registerPasswordWeak => isZh ? '较弱' : 'Weak';
  String get registerPasswordGood => isZh ? '良好' : 'Good';
  String get registerPasswordStrong => isZh ? '很强' : 'Strong';
  String get registerValidationUsernameRequired =>
      isZh ? '请输入用户名。' : 'Please enter a username.';
  String get registerValidationUsernameMin3 =>
      isZh ? '用户名至少需要 3 个字符。' : 'Username must be at least 3 characters.';
  String get registerValidationEmailRequired =>
      isZh ? '请输入邮箱。' : 'Please enter your email.';
  String get registerValidationEmailInvalid =>
      isZh ? '请输入有效的邮箱地址。' : 'Please enter a valid email address.';
  String get registerValidationPasswordRequired =>
      isZh ? '请输入密码。' : 'Please enter a password.';
  String get registerValidationConfirmPasswordRequired =>
      isZh ? '请确认密码。' : 'Please confirm your password.';
  String get registerValidationPasswordsMismatch =>
      isZh ? '两次输入的密码不一致。' : 'Passwords do not match.';
  String get registerValidationAcceptTerms =>
      isZh ? '请先同意《服务条款》和《隐私政策》。' : 'Please accept the Terms & Privacy Policy.';

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
  String get langEnglishOption => 'English';
  String get langChineseOption => isZh ? '中文' : 'Chinese';

  // ── Community Screen ────────────────────────────────────────
  String get communityFind => isZh ? '发现' : 'Find';
  String get communityMessage => isZh ? '消息' : 'Messages';
  String get communitySearch => isZh ? '搜索' : 'Search';
  String get communityFindButton => isZh ? '寻找' : 'Find';
  String communityConnected(int count) =>
      isZh ? '已连接 $count' : 'Connected $count';
  String communityOnline(int count) => isZh ? '在线 $count' : 'Online $count';
  String get communityCategories => isZh ? '分类' : 'Categories';
  String get communityCategoryAll => isZh ? '全部' : 'All';
  String get communityCategoryFinance => isZh ? '金融' : 'Finance';
  String get communityCategoryTechnology => isZh ? '科技' : 'Technology';
  String get communityCategoryMathematics => isZh ? '数学' : 'Mathematics';
  String get communityCategoryEngineering => isZh ? '工程' : 'Engineering';
  String get communityCategoryScience => isZh ? '科学' : 'Science';
  String get communityCategoryMultilingual => isZh ? '多语言' : 'Multilingual';
  String get communityCategoryLabel => isZh ? '分类' : 'Category';
  String communityUserHeadline(String category) => isZh
      ? '$category 爱好者，正在寻找社区协作伙伴。'
      : '$category enthusiast looking to collaborate with the community.';
  String get communityStatusLabel => isZh ? '状态' : 'Status';
  String get communityEmailLabel => isZh ? '邮箱' : 'Email';
  String get communityUsernameLabel => isZh ? '用户名' : 'Username';
  String get communityStatusOnlineNow => isZh ? '在线' : 'Online now';
  String get communityStatusOffline => isZh ? '离线' : 'Offline';
  String get communityButtonMessage => isZh ? '消息' : 'Message';
  String get communityButtonCall => isZh ? '通话' : 'Call';
  String communityCallingUser(String name) =>
      isZh ? '正在呼叫 $name…' : 'Calling $name...';
  String get communityAddUserTitle => isZh ? '添加用户' : 'Add user';
  String get communityAddUserHint =>
      isZh ? '输入邮箱或用户名。' : 'Enter an email or username.';
  String get communityAddUserInputHint =>
      isZh ? 'name@example.com 或用户名' : 'name@example.com or username';
  String get communityAddButton => isZh ? '添加' : 'Add';
  String communityAddedUser(String name) => isZh ? '已添加 $name' : 'Added $name';
  String get communityValidationInputRequired =>
      isZh ? '请输入邮箱或用户名。' : 'Please enter an email or username.';
  String get communityValidationInputInvalid => isZh
      ? '请输入有效的邮箱或用户名（3-32 位字母、数字、._-）。'
      : 'Use a valid email or username (3-32 letters, numbers, ._-).';
  String get communityValidationUserExists =>
      isZh ? '用户已添加。' : 'User already added.';
  String get communityRemoveUserTitle => isZh ? '移除用户' : 'Remove user';
  String get communityNoUsers => isZh ? '暂无用户。' : 'No users available.';
  String get communityUsernameOnly => isZh ? '仅用户名' : 'Username only';
  String communityRemovedUser(String name) =>
      isZh ? '已移除 $name' : 'Removed $name';
  String get communityRemoveButton => isZh ? '移除' : 'Remove';
  String get communityDoneButton => isZh ? '完成' : 'Done';
  String get communitySearchUserHint => isZh ? '搜索用户' : 'Search user';
  String get communityNoUserFound => isZh ? '未找到用户' : 'No user found';
  String get communityTypeMessageHint => isZh ? '输入消息' : 'Type a message';
  String get communitySearchBoxHint => isZh ? '搜索' : 'Search Box';
  String get communityNoConversationFound =>
      isZh ? '未找到会话' : 'No conversation found';
  String communityDeletedChatWith(String name) =>
      isZh ? '已删除与 $name 的聊天' : 'Deleted chat with $name';
  String get communityDeleteChatTooltip => isZh ? '删除聊天' : 'Delete chat';
  String get communityNewConnectionRequest =>
      isZh ? '新的连接请求' : 'New connection request';
  String communityGreetingUser(String name) =>
      isZh ? '你好 $name，很高兴在这里认识你。' : 'Hi $name, great to connect here.';

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

  // ── Settings Center ───────────────────────────────────────────
  String get profileSettingsSubtitle => isZh
      ? '管理你的账号、学习偏好与隐私选项'
      : 'Manage your account, learning preferences, and privacy controls';
  String get settingsQuickAccess => isZh ? '快速导航' : 'Quick Access';
  String get settingsSaved => isZh ? '设置已更新' : 'Settings updated';

  String get settingsSectionAccount => isZh ? '账号与资料' : 'Account & Profile';
  String get settingsSectionAccountDesc => isZh
      ? '管理头像、封面、用户名和个人简介。'
      : 'Manage avatar, cover image, username, and bio.';

  String get settingsSectionAppearance =>
      isZh ? '显示与语言' : 'Appearance & Language';
  String get settingsSectionAppearanceDesc =>
      isZh ? '选择主题模式与界面语言。' : 'Choose theme mode and app language.';

  String get settingsSectionLearning => isZh ? '学习偏好' : 'Learning Preferences';
  String get settingsSectionLearningDesc => isZh
      ? '调整学习流程中的体验开关与目标。'
      : 'Tune learning flow behavior and daily goals.';

  String get settingsSectionNotifications =>
      isZh ? '通知与提醒' : 'Notifications & Reminders';
  String get settingsSectionNotificationsDesc => isZh
      ? '控制推送权限、提醒开关和时间。'
      : 'Control push permission, reminder toggles, and schedule.';

  String get settingsSectionPrivacy => isZh ? '隐私与数据' : 'Privacy & Data';
  String get settingsSectionPrivacyDesc => isZh
      ? '管理可见性、社交权限与本地数据行为。'
      : 'Manage visibility, social permissions, and local data behavior.';

  String get settingsSectionSupport => isZh ? '支持与关于' : 'Support & About';
  String get settingsSectionSupportDesc =>
      isZh ? '帮助、反馈与产品信息。' : 'Help, feedback, and product information.';

  String get settingsThemeModeLabel => isZh ? '主题模式' : 'Theme Mode';
  String get settingsThemeSystem => isZh ? '跟随系统' : 'System';
  String get settingsThemeLight => isZh ? '浅色' : 'Light';
  String get settingsThemeDark => isZh ? '深色' : 'Dark';
  String get settingsLanguageLabel => isZh ? '界面语言' : 'App Language';

  String get settingsSoundEffects => isZh ? '声音反馈' : 'Sound Effects';
  String get settingsSoundEffectsHint =>
      isZh ? '答题与操作时播放音效。' : 'Play sounds during answers and key interactions.';
  String get settingsHaptics => isZh ? '震动反馈' : 'Haptic Feedback';
  String get settingsHapticsHint =>
      isZh ? '在支持设备上启用触觉反馈。' : 'Enable tactile feedback on supported devices.';
  String get settingsAutoplayAudio =>
      isZh ? '自动播放讲解音频' : 'Auto-play Lesson Audio';
  String get settingsAutoplayAudioHint => isZh
      ? '进入支持音频的内容时自动播放。'
      : 'Automatically start audio on supported content.';
  String get settingsLearningHints => isZh ? '显示学习提示' : 'Show Learning Hints';
  String get settingsLearningHintsHint =>
      isZh ? '在关键步骤展示引导提示。' : 'Display guidance hints at key steps.';
  String get settingsDailyGoal => isZh ? '每日学习目标（分钟）' : 'Daily Goal (minutes)';
  String settingsDailyGoalValue(int minutes) =>
      isZh ? '$minutes 分钟/天' : '$minutes min/day';

  String get settingsNotificationsMaster =>
      isZh ? '启用通知' : 'Enable Notifications';
  String get settingsNotificationsMasterHint => isZh
      ? '关闭后将停止应用内所有学习提醒。'
      : 'Turn off all learning reminders from the app.';
  String get settingsDailyReminder => isZh ? '每日学习提醒' : 'Daily Study Reminder';
  String get settingsDailyReminderHint =>
      isZh ? '每天在固定时间提醒你继续学习。' : 'Get a reminder at a fixed time every day.';
  String get settingsStreakReminder => isZh ? '连击中断提醒' : 'Streak Reminder';
  String get settingsStreakReminderHint =>
      isZh ? '快要断连击时发送提醒。' : 'Get reminded before your streak expires.';
  String get settingsAchievementReminder =>
      isZh ? '成就解锁通知' : 'Achievement Alerts';
  String get settingsAchievementReminderHint =>
      isZh ? '解锁成就时显示通知。' : 'Notify when new achievements are unlocked.';
  String get settingsReminderTime => isZh ? '提醒时间' : 'Reminder Time';
  String get settingsReminderPickTime => isZh ? '选择时间' : 'Choose Time';
  String get settingsReminderDisabledHint =>
      isZh ? '请先开启“每日学习提醒”。' : 'Turn on daily reminder first.';
  String get settingsNotificationPermissionDenied => isZh
      ? '通知权限未开启，请在系统设置中允许通知。'
      : 'Notification permission is disabled. Enable it in system settings.';

  String get settingsPrivacyProfilePrivate =>
      isZh ? '私密资料页' : 'Private Profile';
  String get settingsPrivacyProfilePrivateHint =>
      isZh ? '仅允许你授权的用户查看资料。' : 'Only approved users can view your profile.';
  String get settingsPrivacyShareActivity =>
      isZh ? '公开学习动态' : 'Share Learning Activity';
  String get settingsPrivacyShareActivityHint =>
      isZh ? '允许他人看到你的学习进度变化。' : 'Let others see your progress updates.';
  String get settingsPrivacyAllowFollowers =>
      isZh ? '允许被关注' : 'Allow Followers';
  String get settingsPrivacyAllowFollowersHint =>
      isZh ? '关闭后他人将无法关注你。' : 'If off, new users cannot follow you.';
  String get settingsPrivacyWifiOnly =>
      isZh ? '仅 Wi-Fi 下载资源' : 'Wi-Fi Only Downloads';
  String get settingsPrivacyWifiOnlyHint => isZh
      ? '节省流量，避免在移动网络下载。'
      : 'Avoid downloading assets on cellular network.';
  String get settingsClearLocalCache => isZh ? '清理本地缓存' : 'Clear Local Cache';
  String get settingsClearLocalCacheHint => isZh
      ? '清除图片与临时数据，不影响账号信息。'
      : 'Remove images and temporary data without deleting your account.';
  String get settingsClearLocalCacheDone =>
      isZh ? '已清理本地缓存（示例行为）' : 'Local cache cleared (demo behavior)';

  String get settingsSupportHelpCenter => isZh ? '帮助中心' : 'Help Center';
  String get settingsSupportFeedback => isZh ? '提交反馈' : 'Send Feedback';
  String get settingsSupportPrivacyPolicy => isZh ? '隐私政策' : 'Privacy Policy';
  String get settingsSupportTerms => isZh ? '服务条款' : 'Terms of Service';
  String settingsSupportVersion(String version) =>
      isZh ? '版本 $version' : 'Version $version';
  String get settingsComingSoon =>
      isZh ? '该入口稍后接入' : 'This entry will be wired soon';

  String get settingsSignOut => isZh ? '退出当前账号' : 'Sign Out';
  String get settingsSignOutHint => isZh
      ? '退出后需要重新登录才能继续学习。'
      : 'You will need to sign in again to continue learning.';
  String get settingsSignOutConfirmTitle => isZh ? '确认退出？' : 'Sign out now?';
  String get settingsSignOutConfirmBody => isZh
      ? '退出后当前设备的登录状态会被清除。'
      : 'This will clear the current login session on this device.';
  String get settingsSessionExpired =>
      isZh ? '登录已过期，请重新登录' : 'Session expired. Please sign in again.';
}

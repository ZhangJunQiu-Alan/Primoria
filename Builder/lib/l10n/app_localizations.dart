/// Builder app localizations — English / Chinese
class BuilderLocalizations {
  final String languageCode;
  const BuilderLocalizations(this.languageCode);

  bool get isZh => languageCode == 'zh';

  // ── Language names ────────────────────────────────────────────
  static const String langEnglish = 'English';
  static const String langChinese = '中文';
  String get langDisplayName => isZh ? langChinese : langEnglish;

  // ── Sidebar / Nav ─────────────────────────────────────────────
  String get sidebarBuildCourse => isZh ? '创建课程' : 'Build Course';
  String get navHomePage => isZh ? '首页' : 'Home Page';
  String get navCourseManage => isZh ? '课程管理' : 'Course Manage';
  String get navDataCenter => isZh ? '数据中心' : 'Data Center';
  String get navFansManage => isZh ? '粉丝管理' : 'Fans Manage';

  // ── Dashboard — Course Data card ──────────────────────────────
  String get dashCourseData => isZh ? '课程数据' : 'Course Data';
  String get dashFans => isZh ? '粉丝:' : 'fans:';
  String get dashLikes => isZh ? '点赞:' : 'likes:';
  String get dashShares => isZh ? '分享:' : 'shares:';

  // ── Dashboard — Income card ───────────────────────────────────
  String get dashIncomeOverview => isZh ? '收入概览' : 'Income overview';
  String get dashHoldMoney => isZh ? '账户余额:' : 'Hold The money:';

  // ── Dashboard — Comments card ─────────────────────────────────
  String get dashComments => isZh ? '评论' : 'Comments';
  String get dashMore => isZh ? '更多' : 'more';
  String get dashNoComments => isZh ? '暂无评论' : 'No comments yet';

  // ── Dashboard — Course Manage ─────────────────────────────────
  String get sortByTime => isZh ? '按时间排序' : 'Sort By time';
  String get sortByStudent => isZh ? '按学员排序' : 'Sort By student';
  String get sortByComments => isZh ? '按评论排序' : 'Sort By comments';
  String get createCourse => isZh ? '创建课程' : 'Create Course';

  // Course Manage — AI one-sentence generation (Beta)
  String get aiGenerateBeta => isZh ? 'AI 生成 (Beta)' : 'AI Generate (Beta)';
  String get aiGenerateDialogTitle =>
      isZh ? '一句话生成课程' : 'Generate Course with AI';
  String get aiGenerateDialogSubtitle =>
      isZh
          ? '用一句话描述课程，AI 自动生成结构化内容'
          : 'Describe your course in one sentence — AI builds the rest';
  String get aiGeneratePlaceholder =>
      isZh
          ? "用一句话描述你想要的课程，例如'教 Python 基础编程，适合初学者，带互动练习'"
          : "e.g. 'Teach Python basics for beginners with interactive exercises'";
  String get aiGenerateOptionsLabel => isZh ? '高级选项' : 'Options';
  String get aiGenerateDifficulty => isZh ? '难度' : 'Difficulty';
  String get aiGenerateDiffBeginner => isZh ? '入门' : 'Beginner';
  String get aiGenerateDiffIntermediate => isZh ? '进阶' : 'Intermediate';
  String get aiGenerateDiffAdvanced => isZh ? '高级' : 'Advanced';
  String get aiGenerateStyle => isZh ? '动画风格' : 'Animation Style';
  String get aiGenerateStyleCartoon => isZh ? '卡通' : 'Cartoon';
  String get aiGenerateStyleMinimal => isZh ? '简约' : 'Minimal';
  String get aiGenerateStyleRealistic => isZh ? '写实' : 'Realistic';
  String get aiGenerateAudience => isZh ? '目标受众' : 'Target Audience';
  String get aiGenerateAudienceBeginner => isZh ? '初学者' : 'Beginners';
  String get aiGenerateAudienceIntermediate =>
      isZh ? '中级用户' : 'Intermediate';
  String get aiGenerateAudienceAdvanced => isZh ? '高级用户' : 'Advanced';
  String get aiGenerateBtn => isZh ? '生成课程' : 'Generate Course';
  String get aiGenerating => isZh ? '正在生成...' : 'Generating...';
  String get aiGenerateSuccess =>
      isZh ? '课程已生成，正在跳转…' : 'Course generated! Opening builder…';
  String get aiGenerateFailed =>
      isZh ? '生成失败，请重试' : 'Generation failed, please try again';
  String get aiGenerateEmptyHint =>
      isZh ? '请先输入课程描述' : 'Please describe your course first';

  // Course Manage — AI Agentic generation progress stages
  String get aiAgentStagePlan =>
      isZh ? '正在规划课程结构...' : 'Planning course structure...';
  String get aiAgentStageGenerate =>
      isZh ? '正在生成课程内容...' : 'Generating lesson content...';
  String get aiAgentStageValidate =>
      isZh ? '正在校验课程结构...' : 'Validating course structure...';
  String aiAgentSuccessN(int n) =>
      isZh ? '课程已生成，共 $n 课' : 'Course generated with $n lessons';

  // Quality report dialog
  String get qualityDialogTitle =>
      isZh ? 'AI 质量反馈' : 'AI Quality Report';
  String qualityDialogBody(int score) => isZh
      ? '课程质量评分：$score / 100。AI 检测到一些可以改进的地方。'
      : 'Quality score: $score / 100. AI found areas to improve.';
  String get qualityActionAddInteractive =>
      isZh ? '自动补充互动练习' : 'Add Interactive Exercises';
  String get qualityActionAddQuiz =>
      isZh ? '添加期末测验页' : 'Add Final Quiz';
  String get qualityActionIgnore =>
      isZh ? '忽略，查看课程' : 'Skip & View Course';
  String get qualityEnhancing =>
      isZh ? '正在优化课程...' : 'Enhancing course...';
  String get qualityEnhanceDone =>
      isZh ? '课程已优化' : 'Course enhanced';
  String get qualityEnhanceFailed =>
      isZh ? '优化失败，请稍后重试' : 'Enhancement failed, please try again';

  // Course Manage — sign-in prompt
  String get signInToManage =>
      isZh ? '登录以管理您的课程' : 'Sign in to manage your courses';
  String get signIn => isZh ? '登录' : 'Sign In';

  // Course Manage — empty state
  String get noCoursesYet => isZh ? '暂无课程' : 'No courses yet';
  String get createFirstCourse =>
      isZh ? '创建您的第一个课程以开始' : 'Create your first course to get started';

  // Course card
  String get courseEdit => isZh ? '编辑' : 'Edit';
  String get courseDelete => isZh ? '删除' : 'Delete';
  String get addLesson => isZh ? '添加课时' : 'Add Lesson';
  String lessonN(int n) => isZh ? '第 $n 课' : 'Lesson $n';
  String learnedTimes(int n) => isZh ? '已学习 $n 次' : 'Learned $n times';

  // ── Time format ───────────────────────────────────────────────
  String updatedDaysAgo(int n) =>
      isZh ? '$n 天前更新' : 'Updated $n day${n > 1 ? 's' : ''} ago';
  String updatedHoursAgo(int n) =>
      isZh ? '$n 小时前更新' : 'Updated $n hour${n > 1 ? 's' : ''} ago';
  String get updatedJustNow => isZh ? '刚刚更新' : 'Updated just now';
  String get updatedRecently => isZh ? '最近更新' : 'Updated recently';

  // ── Dialogs — Create Course ───────────────────────────────────
  String get createCourseDialogTitle => isZh ? '创建课程' : 'Create Course';
  String get courseName => isZh ? '课程名称' : 'Course Name';
  String get courseNameHint => isZh ? '例如: Python入门' : 'e.g. Intro to Python';
  String get cancel => isZh ? '取消' : 'Cancel';
  String get create => isZh ? '创建' : 'Create';

  // Dialogs — Edit Course (all fields)
  String get editCourseDialogTitle => isZh ? '编辑课程信息' : 'Edit Course Info';
  String get editCourseNameTitle => isZh ? '编辑课程名称' : 'Edit Course Name';
  String get save => isZh ? '保存' : 'Save';

  // Course form fields
  String get courseDescription => isZh ? '课程简介' : 'Course Description';
  String get courseDescriptionHint =>
      isZh ? '简短介绍课程内容（选填）' : 'Brief intro to the course (optional)';
  String get courseThumbnailUrl => isZh ? '封面图 URL' : 'Cover Image URL';
  String get courseThumbnailUrlHint =>
      isZh ? 'https://... (选填)' : 'https://... (optional)';
  String get uploadImage => isZh ? '上传图片' : 'Upload Image';
  String get imageUrl => isZh ? '输入 URL' : 'Enter URL';
  String get clickToUpload => isZh ? '点击上传图片' : 'Click to upload image';
  String get uploadingImage => isZh ? '正在上传...' : 'Uploading...';
  String get changeImage => isZh ? '更换图片' : 'Change';
  String get imageUploadFailed =>
      isZh ? '上传失败，请重试' : 'Upload failed, please retry';
  String get courseDifficulty => isZh ? '难度' : 'Difficulty';
  String get difficultyBeginner => isZh ? '入门' : 'Beginner';
  String get difficultyIntermediate => isZh ? '进阶' : 'Intermediate';
  String get difficultyAdvanced => isZh ? '高级' : 'Advanced';
  String get courseEstimatedHours => isZh ? '预计时长（小时）' : 'Estimated Hours';
  String get courseEstimatedHoursHint =>
      isZh ? '例如: 2.5（选填）' : 'e.g. 2.5 (optional)';
  String get coursePriceTier => isZh ? '定价' : 'Price Tier';
  String get priceFree => isZh ? '免费' : 'Free';
  String get pricePremium => isZh ? '付费' : 'Premium';
  String get coursePrice => isZh ? '价格' : 'Price';
  String get coursePriceHint => isZh ? '例如: 9.99' : 'e.g. 9.99';

  // Dialogs — Delete Course
  String get deleteCourseTitle => isZh ? '删除课程' : 'Delete Course';
  String deleteConfirm(String title) => isZh
      ? '确定要删除"$title"吗？此操作无法撤销。'
      : 'Are you sure you want to delete "$title"? This action cannot be undone.';
  String get delete => isZh ? '删除' : 'Delete';

  // Dialogs — Delete Lesson
  String get deleteLessonTitle => isZh ? '删除课时' : 'Delete Lesson';
  String deleteLessonConfirm(int n, String title) => isZh
      ? '确定删除第 $n 课「$title」吗？此操作不可撤销。'
      : 'Delete Lesson $n "$title"? This cannot be undone.';
  String get lessonDeleted => isZh ? '课时已删除' : 'Lesson deleted';
  String get cannotDeleteLastLesson => isZh
      ? '课程至少需要保留一个课时'
      : 'A course must have at least one lesson';
  String get errorLoading => isZh ? '加载失败，请重试' : 'Failed to load, please retry';

  // ── Snackbars ─────────────────────────────────────────────────
  String get courseDeleted => isZh ? '课程已删除' : 'Course deleted';
  String get courseNameUpdated => isZh ? '课程名称已更新' : 'Course name updated';
  String get courseInfoUpdated => isZh ? '课程信息已更新' : 'Course info updated';
  String get signedIn => isZh ? '已登录' : 'Signed in';
  String get profileUpdated => isZh ? '个人资料已更新' : 'Profile updated';

  // ── Builder — AppBar ──────────────────────────────────────────
  String get builderPreview => isZh ? '预览' : 'Preview';
  String get builderImport => isZh ? '导入' : 'Import';
  String get builderExport => isZh ? '导出' : 'Export';
  String get builderSave => isZh ? '保存' : 'Save';
  String get builderPublish => isZh ? '发布' : 'Publish';

  // Builder — Edit course title dialog
  String get editCourseTitleLabel => isZh ? '编辑课程标题' : 'Edit course title';
  String get enterCourseTitle => isZh ? '输入课程标题' : 'Enter course title';
  String get ok => isZh ? '确定' : 'OK';

  // Builder — Export
  String get exportFailed => isZh ? '导出失败' : 'Export failed';
  String get exportPleasefix => isZh ? '请修复以下问题:' : 'Please fix the following:';
  String get exportSuccess => isZh ? '课程 JSON 已导出' : 'Course JSON exported';
  String exportError(String err) => isZh ? '导出失败: $err' : 'Export failed: $err';

  // Builder — AI generate
  String get confirmGeneration => isZh ? '确认生成' : 'Confirm generation';
  String get aiUnsavedWarning => isZh
      ? '您有未保存的更改。AI 生成的课程将替换当前内容。是否继续？'
      : 'You have unsaved changes. The AI-generated course will replace the current content. Continue?';
  String get continueButton => isZh ? '继续' : 'Continue';
  String aiGeneratedCourse(String title) =>
      isZh ? 'AI 已生成课程: $title' : 'AI generated course: $title';

  // Builder — Import
  String get confirmImport => isZh ? '确认导入' : 'Confirm import';
  String get importUnsavedWarning => isZh
      ? '您有未保存的更改。导入新课程将替换当前内容。是否继续？'
      : 'You have unsaved changes. Importing a new course will replace the current content. Continue?';
  String get importButton => isZh ? '导入' : 'Import';
  String importedCourse(String title) =>
      isZh ? '已导入课程: $title' : 'Imported course: $title';
  String importFailed(String msg) =>
      isZh ? '导入失败: $msg' : 'Import failed: $msg';

  // Builder — Save to cloud
  String get savingToCloud => isZh ? '正在保存到云端...' : 'Saving to cloud...';

  // Builder — Publish
  String get publishCourseTitle => isZh ? '发布课程' : 'Publish course';
  String get publishConfirmMsg => isZh
      ? '发布后，所有人都可以看到此课程。立即发布？'
      : 'After publishing, everyone will be able to see this course. Publish now?';
  String saveFailed(String msg) => isZh ? '保存失败: $msg' : 'Save failed: $msg';

  // Builder — Draft restored
  String get draftRestored =>
      isZh ? '已恢复未保存的草稿' : 'Recovered unsaved browser draft';

  // ── Profile Dialog ────────────────────────────────────────────
  String get profileTitle => isZh ? '个人资料' : 'Profile';
  String get profileSubtitle => isZh ? '编辑您的公开信息' : 'Edit your public info';
  String get profileEmail => 'Email';
  String get profileDisplayName => isZh ? '显示名称' : 'Display name';
  String get profileDisplayNameHint =>
      isZh ? '我们怎么称呼您？' : 'How should we call you?';
  String get profileSave => isZh ? '保存' : 'Save';
  String get profileSaveFailed =>
      isZh ? '保存失败，请重试。' : 'Save failed. Please try again.';
  String get profileSignOut => isZh ? '退出登录' : 'Sign out';
  String get profileLanguage => isZh ? '语言' : 'Language';
  String get profileLanguageTitle => isZh ? '选择语言' : 'Select Language';

  // ── Landing page ──────────────────────────────────────────────
  String get landingTagline => isZh ? '从教中学' : 'Learn by teaching';
  String get landingHeadline => isZh
      ? '如果想掌握一样东西，\n就去教它。'
      : 'If you want to master\nsomething, teach it.';
  String get landingSubtitle => isZh
      ? '创建课程，分享洞见，把好奇心变成每天的习惯。Primoria 将 Brilliant 式探索与 Duolingo 式激励相融合。'
      : 'Build courses, share insights, and turn curiosity into a daily habit. '
            'Primoria blends Brilliant-style exploration with Duolingo-like momentum.';
  String get landingQuote => isZh
      ? '"如果想掌握一样东西，就去教它。"'
      : '"If you want to master something, teach it."';
  String get landingApplyNow => isZh ? '立即申请' : 'Apply Now';
  String get landingAlreadyQualified => isZh ? '已获资格' : 'Already Qualified';
  String get landingReadyTitle =>
      isZh ? '准备好发布你的下一课了吗？' : 'Ready to launch your next lesson?';
  String get landingReadySubtitle => isZh
      ? '带上你的专业知识，让 Primoria 处理剩下的。'
      : 'Bring your expertise and let Primoria handle the rest.';
  String get landingStartCreating => isZh ? '开始创作' : 'Start Creating';
  String get landingTodaysSprint => isZh ? '今日教学冲刺' : "Today's Teaching Sprint";
  String get landingSprintSubtitle => isZh
      ? '创建简洁课程，几分钟内即可发布。'
      : 'Create a bite-sized lesson and publish in minutes.';

  // Feature cards
  String get featureBadge1 => isZh ? '引导式' : 'Guided';
  String get featureTitle1 =>
      isZh ? '像玩游戏一样构建课程' : 'Course builder that feels like play';
  String get featureSubtitle1 => isZh
      ? '拖拽模块，混搭模板，随时发布。'
      : 'Drag blocks, remix templates, and publish at any pace.';
  String get featureBadge2 => isZh ? '社交' : 'Social';
  String get featureTitle2 => isZh ? '社区反馈循环' : 'Community feedback loops';
  String get featureSubtitle2 => isZh
      ? '用智能高亮将评论变成洞察。'
      : 'Turn comments into insights with smart highlights.';
  String get featureBadge3 => isZh ? '持续' : 'Momentum';
  String get featureTitle3 => isZh ? '每日任务与连续学习' : 'Daily quests and streaks';
  String get featureSubtitle3 =>
      isZh ? '用碎片化任务保持学习节奏。' : 'Stay consistent with bite-sized missions.';

  // Stat tiles
  String get statAvgBuild => isZh ? '平均构建时间' : 'Avg build time';
  String get statLearnerCompletion => isZh ? '学员完成率' : 'Learner completion';
  String get statNewLearners => isZh ? '新学员' : 'New learners';
  String get statBoostedIncome => isZh ? '收入提升' : 'Boosted income';

  // Sign-in modal
  String get signInTitle => isZh ? '登录' : 'Sign in';
  String get signInWithGoogle => isZh ? '使用 Google 登录' : 'Sign in with Google';
  String get signInWithPassword => isZh ? '使用密码登录' : 'Sign in with password';
  String get signInClose => isZh ? '关闭' : 'Close';
  String get signInNewUser => isZh ? '新用户？ ' : 'New user? ';
  String get signInApplyAccess => isZh ? '申请访问权限' : 'Apply for access';
  String get signInButton => isZh ? '登录' : 'Sign in';
  String get signInEmailHint => 'Email';
  String get signInPasswordHint => isZh ? '密码' : 'Password';
  String get signInEmptyFields =>
      isZh ? '请输入您的邮箱和密码。' : 'Please enter your email and password.';
  String get signInNotFoundMsg => isZh
      ? '未找到该 Google 账号关联的账户。请先申请访问权限。'
      : "We couldn't find an account linked to that Google profile. Please apply for access first.";
  String get signInEmailNotFound => isZh
      ? '未找到该邮箱对应的账号。请检查拼写或申请访问权限。'
      : "We couldn't find an account with that email. Please check your spelling or apply for access.";
  String get signInInvalidCredentials => isZh
      ? '邮箱或密码错误。若你使用 Google 注册，请改用 Google 登录。'
      : 'Incorrect email or password. If you signed up with Google, use Google sign-in.';

  // Schema validation dialog
  String blockingErrors(int n) => isZh ? '阻断错误 ($n)' : 'Blocking errors ($n)';
  String warnings(int n) => isZh ? '警告 ($n)' : 'Warnings ($n)';
}

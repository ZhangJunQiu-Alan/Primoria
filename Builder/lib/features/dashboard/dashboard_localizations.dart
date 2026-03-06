import '../../l10n/app_localizations.dart';

extension DashboardLocalizationsX on BuilderLocalizations {
  String get dashGreetingMorning => isZh ? '早上好' : 'Good morning';
  String get dashGreetingAfternoon => isZh ? '下午好' : 'Good afternoon';
  String get dashGreetingEvening => isZh ? '晚上好' : 'Good evening';
  String get dashWelcomeBack =>
      isZh ? '欢迎回来，继续打造你的课程。' : 'Welcome back, continue building your courses.';

  String get dashCreateNewCourse => isZh ? '创建新课程' : 'Create New Course';
  String get dashContinueEditing => isZh ? '继续编辑' : 'Continue Editing';
  String get dashViewAnalytics => isZh ? '查看数据' : 'View Analytics';

  String get dashLearningOverview => isZh ? '学习概览' : 'Learning Overview';
  String get dashWeeklyLearners => isZh ? '本周学习人数' : 'Weekly Learners';
  String get dashTotalStudyHours => isZh ? '总学习时长' : 'Total Study Hours';
  String get dashCompletionTrend => isZh ? '完成率趋势' : 'Completion Trend';
  String dashComparedToLastWeek(String delta) =>
      isZh ? '较上周 $delta' : '$delta vs last week';

  String get dashTopCourses => isZh ? '热门课程 Top 3' : 'Top 3 Courses';
  String get dashOpenCourse => isZh ? '查看课程' : 'Open Course';
  String get dashEmptyCoursesTitle =>
      isZh ? '还没有课程？创建你的第一门课程吧！' : 'No course yet? Create your first course.';
  String get dashEmptyCoursesBody => isZh
      ? '发布后即可在这里看到热门课程、趋势与学员活动。'
      : 'After publishing, top courses, trends, and learner activity will appear here.';

  String get dashRecentActivity => isZh ? '最近活动' : 'Recent Activity';
  String get dashViewAll => isZh ? '查看全部' : 'View all';
  String get dashNoActivity => isZh ? '最近还没有活动记录' : 'No recent activity yet';

  String get dashIncomeReserve =>
      isZh ? '收入概览（预留）' : 'Income Overview (Reserved)';
  String get dashMonthlyIncome => isZh ? '本月收入' : 'This Month';
  String get dashPendingSettlement => isZh ? '待结算金额' : 'Pending Settlement';
  String get dashIncomeTrend => isZh ? '收入趋势' : 'Income Trend';

  String get dashDataCenterTitle => isZh ? '数据中心' : 'Data Center';
  String get dashExportReport => isZh ? '导出报告' : 'Export Report';
  String get dashTotalLearners => isZh ? '总学员数' : 'Total Learners';
  String get dashTotalViews => isZh ? '总浏览量' : 'Total Views';
  String get dashAverageCompletion =>
      isZh ? '平均完成率' : 'Average Completion Rate';
  String get dashAverageRating => isZh ? '平均评分' : 'Average Rating';

  String get dashLearningTrends => isZh ? '学习趋势' : 'Learning Trends';
  String get dashCoursePerformance => isZh ? '课程表现对比' : 'Course Performance';
  String get dashGeoDistribution => isZh ? '地域分布' : 'Geographic Distribution';
  String get dashLearningTimeAnalysis =>
      isZh ? '学习时段分析' : 'Learning Time Analysis';

  String get dashRange7d => isZh ? '7 天' : '7D';
  String get dashRange30d => isZh ? '30 天' : '30D';
  String get dashRange90d => isZh ? '90 天' : '90D';
  String get dashRangeAll => isZh ? '全部' : 'All';

  String get dashSortByViews => isZh ? '按浏览量' : 'By Views';
  String get dashSortByCompletion => isZh ? '按完成率' : 'By Completion';
  String get dashSortByRating => isZh ? '按评分' : 'By Rating';

  String get dashCourseDataTable => isZh ? '课程详细数据' : 'Course Detail Table';
  String get dashTableCourseName => isZh ? '课程名称' : 'Course';
  String get dashTableViews => isZh ? '浏览量' : 'Views';
  String get dashTableLearners => isZh ? '学员数' : 'Learners';
  String get dashTableCompletion => isZh ? '完成率' : 'Completion';
  String get dashTableAvgStudy => isZh ? '平均学习时长' : 'Avg Study';
  String get dashTableUpdated => isZh ? '最后更新时间' : 'Updated';
  String get dashTableAction => isZh ? '操作' : 'Action';
  String get dashTableViewDetail => isZh ? '查看详情' : 'View Details';
  String get dashNoData => isZh ? '暂无数据' : 'No data yet';
  String get dashExportDone => isZh ? '报告已导出（CSV）' : 'Report exported (CSV)';

  String get dashFansTitle => isZh ? '粉丝管理' : 'Fans Management';
  String get dashTotalFans => isZh ? '总粉丝数' : 'Total Fans';
  String get dashNewFansWeek => isZh ? '本周新增粉丝' : 'New Fans This Week';
  String get dashFansGrowthTrend => isZh ? '粉丝增长趋势' : 'Fans Growth Trend';
  String get dashFansList => isZh ? '粉丝列表' : 'Fans List';
  String get dashFansSearchHint => isZh ? '搜索用户名...' : 'Search username...';

  String get dashFilterAll => isZh ? '全部' : 'All';
  String get dashFilterActive => isZh ? '高活跃' : 'Active';
  String get dashFilterNeedHelp => isZh ? '需要帮助' : 'Need Help';

  String get dashEngagementHub => isZh ? '互动中心' : 'Engagement Hub';
  String get dashReply => isZh ? '回复' : 'Reply';
  String get dashMarkImportant => isZh ? '标记重要' : 'Mark Important';

  String get dashTagManager => isZh ? '学员标签管理' : 'Learner Tags';
  String get dashCreateTag => isZh ? '创建标签' : 'Create Tag';
  String get dashApplyTag => isZh ? '批量打标' : 'Bulk Tag';

  String get dashMessageCenter => isZh ? '消息中心（预留）' : 'Messaging (Reserved)';
  String get dashUnreadMessages => isZh ? '未读消息' : 'Unread Messages';
  String get dashSendNotice => isZh ? '发送通知' : 'Send Notice';
  String get dashExportData => isZh ? '导出数据' : 'Export Data';

  String get dashNoFansTitle => isZh
      ? '还没有粉丝？分享你的课程来吸引学员吧！'
      : 'No fans yet? Share your course to attract learners.';
  String get dashNoFansBody => isZh
      ? '发布课程后，学员关注、评论和学习行为会在这里集中管理。'
      : 'After publishing courses, followers, comments, and learning behavior will appear here.';

  String get dashTagActiveLearner => isZh ? '活跃学员' : 'Active Learner';
  String get dashTagNeedHelp => isZh ? '需要帮助' : 'Needs Help';
  String get dashTagVip => 'VIP';

  String get dashActionInProgress => isZh
      ? '此功能已预留，后续接入后端能力。'
      : 'This action is reserved for backend integration.';
  String get dashJustNow => isZh ? '刚刚' : 'Just now';
  String dashHoursAgo(int h) =>
      isZh ? '$h 小时前' : '$h hour${h > 1 ? 's' : ''} ago';
  String dashDaysAgo(int d) => isZh ? '$d 天前' : '$d day${d > 1 ? 's' : ''} ago';

  String get dashViewsLegend => isZh ? '浏览量' : 'Views';
  String get dashLearnersLegend => isZh ? '学员增长' : 'Learners';
  String get dashCompletionLegend => isZh ? '完成率' : 'Completion';
  String get dashRevenueLegend => isZh ? '收入' : 'Revenue';
}

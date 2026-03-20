import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../components/common/viewer_page_shell.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../theme/theme.dart';

/// Community screen — upgraded into a shared workspace.
/// File name stays the same for routing compatibility.
class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

enum _CommunityWorkspaceSection {
  dashboard,
  ourStudy,
  notes,
  messages,
  trending,
}

class _CommunityPalette {
  const _CommunityPalette._();

  static const page = Color(0xFFF3F6FC);
  static const panel = Color(0xFFFBFCFE);
  static const surface = Colors.white;
  static const surfaceMuted = Color(0xFFF8FAFC);
  static const border = Color(0xFFE2E8F0);
  static const text = Color(0xFF0F172A);
  static const subtext = Color(0xFF64748B);
  static const subtle = Color(0xFF94A3B8);
  static const blue = Color(0xFF4F46E5);
  static const mint = Color(0xFF10B981);
  static const rose = Color(0xFFF472B6);
  static const amber = Color(0xFFF59E0B);
  static const cyan = Color(0xFF22D3EE);
  static const red = Color(0xFFEF4444);
}

class _CoursesScreenState extends State<CoursesScreen>
    with TickerProviderStateMixin {
  final TextEditingController _findSearchController = TextEditingController();
  final TextEditingController _messageSearchController =
      TextEditingController();
  final TextEditingController _messageComposerController =
      TextEditingController();
  final TextEditingController _studySearchController = TextEditingController();
  final TextEditingController _noteTitleController = TextEditingController();
  final TextEditingController _noteBodyController = TextEditingController();
  final ScrollController _messageThreadController = ScrollController();

  final math.Random _rng = math.Random();
  final List<_Conversation> _conversations = <_Conversation>[];
  final List<_StudyRoom> _studyRooms = <_StudyRoom>[];
  final List<_TrendingDiscussion> _trendingDiscussions =
      <_TrendingDiscussion>[];
  final List<_CommunityPerson> _peopleToFollow = <_CommunityPerson>[];
  final List<_CommunityNotification> _notifications =
      <_CommunityNotification>[];
  final List<_CommunityNote> _notes = <_CommunityNote>[];
  final List<_GalaxyUser> _galaxyUsers = <_GalaxyUser>[];
  final Map<int, String> _userCategoryById = <int, String>{};
  final Map<int, bool> _userOnlineById = <int, bool>{};

  late final AnimationController _floatController;
  late final AnimationController _shootingStarController;

  _CommunityWorkspaceSection _section = _CommunityWorkspaceSection.dashboard;
  String _findQuery = '';
  String _messageQuery = '';
  String _studyQuery = '';
  String _selectedCategory = 'All';
  int? _hoveredUserId;
  int? _selectedConversationId;
  int? _selectedNoteId;
  int _nextUserId = 1;
  int _nextConversationId = 1;
  int _nextStudyRoomId = 1;
  int _nextNotificationId = 1;
  int _nextNoteId = 1;
  Color _selectedInkColor = _CommunityPalette.blue;
  double _selectedInkWidth = 3.0;

  AppLocalizations get _t => context.read<LanguageProvider>().t;
  bool get _isZh => _t.isZh;

  String _copy(String en, String zh) => _isZh ? zh : en;

  static const _seedGalaxyUsers = [
    _GalaxyUser(1, '大清话', 50, 45, Color(0xFF22D3EE), 'large', 0),
    _GalaxyUser(2, 'Mia小夏', 48, 50, Color(0xFFF472B6), 'large', 0.3),
    _GalaxyUser(3, 'xX', 52, 48, Colors.white, 'medium', 0.6),
    _GalaxyUser(4, '抹茶', 40, 45, Color(0xFF22D3EE), 'medium', 0.2),
    _GalaxyUser(5, '沈术士', 45, 38, Color(0xFFF9A8D4), 'medium', 0.5),
    _GalaxyUser(6, '无限星消风', 55, 38, Color(0xFF34D399), 'medium', 0.8),
    _GalaxyUser(7, '一起吃冬瓜', 60, 45, Color(0xFFF9A8D4), 'medium', 1.1),
    _GalaxyUser(8, '墓放独主', 55, 55, Color(0xFF22D3EE), 'medium', 1.4),
    _GalaxyUser(9, '侣人', 45, 55, Color(0xFFF9A8D4), 'medium', 1.7),
    _GalaxyUser(10, 'bsh', 40, 52, Color(0xFFF9A8D4), 'medium', 2.0),
    _GalaxyUser(11, '爱吃香菜 🍀', 50, 58, Color(0xFFF9A8D4), 'medium', 2.3),
    _GalaxyUser(12, '跨的透明人', 35, 30, Color(0xFFCBD5E1), 'small', 0.4),
    _GalaxyUser(13, 'dragon', 42, 25, Color(0xFF94A3B8), 'small', 0.7),
    _GalaxyUser(14, '野', 50, 23, Color(0xFFF9A8D4), 'small', 1.0),
    _GalaxyUser(15, '&dnajaj', 58, 25, Color(0xFF94A3B8), 'small', 1.3),
    _GalaxyUser(16, 'rainbow', 65, 30, Color(0xFF94A3B8), 'small', 1.6),
    _GalaxyUser(17, '越自由', 70, 40, Color(0xFFF87171), 'small', 0.9),
    _GalaxyUser(18, '城边配', 72, 48, Color(0xFF94A3B8), 'small', 1.2),
    _GalaxyUser(19, '汉音夜飘', 70, 55, Color(0xFF94A3B8), 'small', 1.5),
    _GalaxyUser(20, 'momo', 65, 62, Color(0xFFF9A8D4), 'small', 1.8),
    _GalaxyUser(21, '小小', 58, 68, Color(0xFFF9A8D4), 'small', 2.1),
    _GalaxyUser(22, '心碎小狗', 50, 70, Color(0xFF22D3EE), 'small', 2.4),
    _GalaxyUser(23, '爱吃生蚝', 42, 68, Color(0xFF34D399), 'small', 2.7),
    _GalaxyUser(24, 'DN', 35, 62, Color(0xFF22D3EE), 'small', 3.0),
    _GalaxyUser(25, '电灯泡', 28, 48, Color(0xFFF9A8D4), 'small', 0.6),
    _GalaxyUser(26, 'Souler', 30, 40, Color(0xFF34D399), 'small', 1.1),
    _GalaxyUser(27, '喔过阴花', 32, 35, Color(0xFFF9A8D4), 'small', 1.9),
  ];

  static const _newUserColors = [
    Color(0xFF22D3EE),
    Color(0xFFF472B6),
    Color(0xFF34D399),
    Color(0xFFF9A8D4),
    Color(0xFFF87171),
    Color(0xFF94A3B8),
  ];

  static const _communityCategories = [
    'Finance',
    'Technology',
    'Mathematics',
    'Engineering',
    'Science',
    'Multilingual',
  ];

  static const _categoryTabs = ['All', ..._communityCategories];

  static const _inkPalette = [
    _CommunityPalette.blue,
    _CommunityPalette.rose,
    _CommunityPalette.amber,
    _CommunityPalette.cyan,
    _CommunityPalette.mint,
    Color(0xFF0F172A),
  ];

  static const _shootingStars = [
    _ShootingStar(
      startX: 0.08,
      startY: 0.12,
      endX: 0.50,
      endY: 0.40,
      launchAt: 0.06,
      travelWindow: 0.12,
      tailLength: 54,
      headRadius: 2.6,
      color: Color(0xFFF8FAFC),
    ),
    _ShootingStar(
      startX: 0.20,
      startY: 0.05,
      endX: 0.64,
      endY: 0.33,
      launchAt: 0.29,
      travelWindow: 0.10,
      tailLength: 48,
      headRadius: 2.4,
      color: Color(0xFFE0F2FE),
    ),
    _ShootingStar(
      startX: 0.34,
      startY: 0.26,
      endX: 0.82,
      endY: 0.57,
      launchAt: 0.55,
      travelWindow: 0.14,
      tailLength: 58,
      headRadius: 2.8,
      color: Color(0xFFFDF2F8),
    ),
    _ShootingStar(
      startX: 0.10,
      startY: 0.50,
      endX: 0.58,
      endY: 0.82,
      launchAt: 0.79,
      travelWindow: 0.11,
      tailLength: 52,
      headRadius: 2.5,
      color: Color(0xFFE9D5FF),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat();
    _shootingStarController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 11800),
    )..repeat();

    _galaxyUsers.addAll(_seedGalaxyUsers);
    _nextUserId = _galaxyUsers.length + 1;

    for (var i = 0; i < _galaxyUsers.length; i++) {
      _userCategoryById[_galaxyUsers[i].id] =
          _communityCategories[i % _communityCategories.length];
      _userOnlineById[_galaxyUsers[i].id] = _defaultOnlineForUserId(
        _galaxyUsers[i].id,
      );
    }

    _studyRooms.addAll(_seedStudyRooms());
    _notifications.addAll(_seedNotifications());
    _trendingDiscussions.addAll(_seedTrendingDiscussions());
    _peopleToFollow.addAll(_seedPeopleToFollow());
    _notes.addAll(_seedNotes());
    _seedConversations();

    if (_conversations.isNotEmpty) {
      _selectedConversationId = _conversations.first.id;
    }
    if (_notes.isNotEmpty) {
      _selectedNoteId = _notes.first.id;
      _loadSelectedNoteIntoControllers();
    }
  }

  @override
  void dispose() {
    _findSearchController.dispose();
    _messageSearchController.dispose();
    _messageComposerController.dispose();
    _studySearchController.dispose();
    _noteTitleController.dispose();
    _noteBodyController.dispose();
    _messageThreadController.dispose();
    _floatController.dispose();
    _shootingStarController.dispose();
    super.dispose();
  }

  List<_StudyRoom> _seedStudyRooms() {
    return [
      _StudyRoom(
        id: _nextStudyRoomId++,
        title: _copy('Physics Sprint Duo', '物理冲刺双人组'),
        subtitle: _copy(
          'A focused 1-on-1 sprint for mechanics, graphs, and quiz speed.',
          '一个专注于力学、图像题与测验节奏的一对一冲刺小组。',
        ),
        focus: _copy('Mechanics + graph interpretation', '力学与图像分析'),
        schedule: _copy('Tue / Thu · 8:00 PM', '周二 / 周四 · 晚上 8:00'),
        tags: [
          _copy('Physics', '物理'),
          _copy('1 on 1', '一对一'),
          _copy('Live drills', '实时训练'),
        ],
        goals: [
          _copy('Finish 2 challenge sets together', '一起完成 2 套挑战题'),
          _copy('Review weak quiz topics before Friday', '周五前复盘薄弱测验题'),
        ],
        materials: [
          _StudyMaterial(
            title: _copy('Motion problem set', '运动题训练包'),
            type: _copy('Worksheet', '练习单'),
            status: _copy('Ready', '已准备'),
          ),
          _StudyMaterial(
            title: _copy('Free-body diagram board', '受力分析白板'),
            type: _copy('Whiteboard', '白板'),
            status: _copy('Updated', '已更新'),
          ),
          _StudyMaterial(
            title: _copy('Checkpoint quiz', '检查测验'),
            type: _copy('Quiz', '测验'),
            status: _copy('Due tomorrow', '明天截止'),
          ),
        ],
        members: ['You', 'Sarah Connor'],
        accent: const Color(0xFF5B6CFF),
        progress: 0.68,
        sessionsThisWeek: 2,
        joined: true,
      ),
      _StudyRoom(
        id: _nextStudyRoomId++,
        title: _copy('Weekend Math Crew', '周末数学攻坚队'),
        subtitle: _copy(
          'A compact group solving proof-heavy calculus and algebra reviews.',
          '一个集中攻克高积分证明题与代数复习的小组。',
        ),
        focus: _copy('Integral techniques + proof practice', '积分技巧与证明训练'),
        schedule: _copy('Sat · 11:00 AM', '周六 · 上午 11:00'),
        tags: [
          _copy('Mathematics', '数学'),
          _copy('Group room', '小组房间'),
          _copy('Weekly review', '每周复盘'),
        ],
        goals: [
          _copy('Complete 1 mock test together', '一起完成 1 套模拟卷'),
          _copy('Share solution screenshots after each round', '每轮后共享解题截图'),
        ],
        materials: [
          _StudyMaterial(
            title: _copy('Mock exam pack', '模拟考试包'),
            type: _copy('Assessment', '评估'),
            status: _copy('Ready', '已准备'),
          ),
          _StudyMaterial(
            title: _copy('Formula cheatsheet', '公式速查表'),
            type: _copy('Reference', '参考资料'),
            status: _copy('Pinned', '已置顶'),
          ),
        ],
        members: ['You', 'Mike Chen', 'Jessica Lee', 'David Park'],
        accent: const Color(0xFF10B981),
        progress: 0.54,
        sessionsThisWeek: 1,
        joined: true,
      ),
      _StudyRoom(
        id: _nextStudyRoomId++,
        title: _copy('Women in Tech Circle', '科技女生学习圈'),
        subtitle: _copy(
          'Design systems, frontend patterns, and career support in one room.',
          '把设计系统、前端模式与职业支持放进同一个学习房间。',
        ),
        focus: _copy('Frontend systems + UI critique', '前端系统与界面评审'),
        schedule: _copy('Fri · 6:00 PM', '周五 · 晚上 6:00'),
        tags: [
          _copy('Technology', '科技'),
          _copy('Career growth', '职业成长'),
          _copy('Community', '社区'),
        ],
        goals: [
          _copy('Review one portfolio a week', '每周评一份作品集'),
          _copy('Build a reusable component set', '共建一套可复用组件'),
        ],
        materials: [
          _StudyMaterial(
            title: _copy('UI critique board', '界面评审板'),
            type: _copy('Board', '看板'),
            status: _copy('Active', '进行中'),
          ),
          _StudyMaterial(
            title: _copy('Career session notes', '职业分享笔记'),
            type: _copy('Notes', '笔记'),
            status: _copy('Shared', '已共享'),
          ),
        ],
        members: ['Uchiha_Obito', 'Karina01', 'Designerzzz', 'Budiarti R'],
        accent: const Color(0xFF8B5CF6),
        progress: 0.32,
        sessionsThisWeek: 0,
        joined: false,
      ),
      _StudyRoom(
        id: _nextStudyRoomId++,
        title: _copy('Multilingual Science Jam', '多语科学共学站'),
        subtitle: _copy(
          'Science learners swapping explanations across English and Chinese.',
          '中英双语学习者一起交换科学知识讲解与答疑。',
        ),
        focus: _copy('Bilingual science revision', '双语科学复习'),
        schedule: _copy('Sun · 4:30 PM', '周日 · 下午 4:30'),
        tags: [
          _copy('Science', '科学'),
          _copy('Multilingual', '多语言'),
          _copy('Peer coaching', '同伴辅导'),
        ],
        goals: [
          _copy('Translate one concept note together', '一起翻译一份概念笔记'),
          _copy('Host a short recap session each Sunday', '每周日做一次简短复盘'),
        ],
        materials: [
          _StudyMaterial(
            title: _copy('Reaction summary cards', '反应总结卡片'),
            type: _copy('Flashcards', '闪卡'),
            status: _copy('Ready', '已准备'),
          ),
          _StudyMaterial(
            title: _copy('Glossary board', '术语词汇板'),
            type: _copy('Reference', '参考资料'),
            status: _copy('Shared', '已共享'),
          ),
        ],
        members: ['rainbow', 'Souler', 'Dragon'],
        accent: const Color(0xFF06B6D4),
        progress: 0.18,
        sessionsThisWeek: 0,
        joined: false,
      ),
    ];
  }

  List<_CommunityNotification> _seedNotifications() {
    return [
      _CommunityNotification(
        id: _nextNotificationId++,
        title: _copy('Physics Sprint Duo updated its board', '物理冲刺双人组更新了白板'),
        body: _copy(
          'Sarah dropped a new free-body diagram sketch in your shared room.',
          'Sarah 在你们的共享房间里上传了新的受力图草稿。',
        ),
        timeLabel: _copy('5m ago', '5 分钟前'),
        unread: true,
        icon: Icons.draw_rounded,
        color: _CommunityPalette.blue,
      ),
      _CommunityNotification(
        id: _nextNotificationId++,
        title: _copy('Weekend Math Crew started a session', '周末数学攻坚队开启了新会话'),
        body: _copy(
          'Mock test round 2 is now live in the group chat.',
          '模拟卷第 2 轮已经在群聊里开始了。',
        ),
        timeLabel: _copy('18m ago', '18 分钟前'),
        unread: true,
        icon: Icons.bolt_rounded,
        color: _CommunityPalette.mint,
      ),
      _CommunityNotification(
        id: _nextNotificationId++,
        title: _copy('Community trend matched your interests', '有新的社区趋势匹配你的兴趣'),
        body: _copy(
          'A multilingual science group is getting traction this afternoon.',
          '今天下午有一个多语科学小组正在快速活跃。',
        ),
        timeLabel: _copy('1h ago', '1 小时前'),
        unread: false,
        icon: Icons.local_fire_department_rounded,
        color: _CommunityPalette.amber,
      ),
    ];
  }

  List<_TrendingDiscussion> _seedTrendingDiscussions() {
    return [
      _TrendingDiscussion(
        author: 'BrainyOlivia',
        title: _copy(
          'What is the best way to stay consistent with learning?',
          '怎样才能更稳定地坚持学习？',
        ),
        replies: 120,
        tags: [
          _copy('LearningHabits', '学习习惯'),
          _copy('Motivation', '动力'),
          _copy('TimeManagement', '时间管理'),
        ],
        accent: const Color(0xFFF59E0B),
      ),
      _TrendingDiscussion(
        author: 'Katie02',
        title: _copy(
          'How I landed a freelance gig after finishing the business strategy course',
          '完成商业策略课程后，我是如何接到第一份自由职业项目的',
        ),
        replies: 43,
        tags: [
          _copy('CareerJourney', '职业之路'),
          _copy('Freelancing', '自由职业'),
          _copy('BusinessCourse', '商业课程'),
        ],
        accent: const Color(0xFF10B981),
      ),
      _TrendingDiscussion(
        author: 'Uchiha_Obito',
        title: _copy(
          'Show me your note-taking setup for live study sessions',
          '来晒晒你们做直播共学时的笔记配置吧',
        ),
        replies: 29,
        tags: [
          _copy('StudySetup', '学习配置'),
          _copy('Notes', '笔记'),
          _copy('LiveSession', '直播共学'),
        ],
        accent: const Color(0xFF8B5CF6),
      ),
    ];
  }

  List<_CommunityPerson> _seedPeopleToFollow() {
    return [
      _CommunityPerson(
        name: 'Uchiha_Obito',
        role: _copy('UX Enthusiast', '用户体验爱好者'),
        color: const Color(0xFFF59E0B),
      ),
      _CommunityPerson(
        name: 'Karina01',
        role: _copy('Designer', '设计师'),
        color: const Color(0xFFF472B6),
      ),
      _CommunityPerson(
        name: 'Designerzzz',
        role: _copy('Frontend Builder', '前端创作者'),
        color: const Color(0xFF06B6D4),
      ),
    ];
  }

  List<_CommunityNote> _seedNotes() {
    return [
      _CommunityNote(
        id: _nextNoteId++,
        title: _copy('Session recap', '共学复盘'),
        body: _copy(
          'Capture action items, screenshots, and quick diagrams from every partner session.\n\n1. Compare quiz mistakes.\n2. Summarize one thing to reteach.\n3. Save visuals for later review.',
          '把每次搭子共学的行动项、截图与简图都记下来。\n\n1. 对比测验错题。\n2. 总结一个需要复讲的知识点。\n3. 保存视觉笔记方便后面复习。',
        ),
        attachments: [
          _NoteAttachment(
            label: _copy('Whiteboard snap', '白板快照'),
            caption: _copy('Force arrows and graph notes', '受力箭头和图像笔记'),
            tint: const Color(0xFFDBEAFE),
          ),
        ],
        strokes: [
          _SketchStroke(
            points: const [
              Offset(26, 110),
              Offset(88, 80),
              Offset(136, 112),
              Offset(196, 72),
            ],
            color: _CommunityPalette.blue,
            width: 3.5,
          ),
        ],
        updatedAt: DateTime.now().subtract(const Duration(minutes: 45)),
      ),
      _CommunityNote(
        id: _nextNoteId++,
        title: _copy('Friday live workshop ideas', '周五直播工坊灵感'),
        body: _copy(
          'Collect questions for the community workshop, sketch layouts, and add screenshots worth discussing.',
          '整理社区直播工坊的问题、画出布局草图，并补充值得讨论的截图。',
        ),
        attachments: const [],
        strokes: const [],
        updatedAt: DateTime.now().subtract(const Duration(hours: 3)),
      ),
    ];
  }

  void _seedConversations() {
    final physicsRoom = _studyRooms.firstWhere(
      (room) => room.title.contains(_copy('Physics Sprint Duo', '物理冲刺双人组')),
    );
    final mathRoom = _studyRooms.firstWhere(
      (room) => room.title.contains(_copy('Weekend Math Crew', '周末数学攻坚队')),
    );

    final physicsConversation = _Conversation(
      id: _nextConversationId++,
      name: physicsRoom.title,
      message: _copy(
        'Sarah: I added the final diagram for the velocity question.',
        'Sarah：我把速度题的最终图也补上了。',
      ),
      time: '10:30',
      unreadCount: 2,
      isGroup: true,
      linkedStudyRoomId: physicsRoom.id,
      participantNames: [
        'You',
        ...physicsRoom.members.where((e) => e != 'You'),
      ],
      accent: physicsRoom.accent,
      messages: [
        _ChatMessage(
          text: _copy(
            'I pinned the mechanics checklist here so we do not miss the last quiz.',
            '我把力学检查清单置顶在这里了，这样最后一份测验就不会漏掉。',
          ),
          isMine: false,
          sentAtLabel: '09:20',
        ),
        _ChatMessage(
          text: _copy(
            'Perfect. I am uploading the graph recap in a sec.',
            '太好了，我马上把图像复盘传上来。',
          ),
          isMine: true,
          sentAtLabel: '09:26',
        ),
        _ChatMessage(
          text: _copy(
            'Sarah: I added the final diagram for the velocity question.',
            'Sarah：我把速度题的最终图也补上了。',
          ),
          isMine: false,
          sentAtLabel: '10:30',
        ),
      ],
    );
    physicsRoom.linkedConversationId = physicsConversation.id;

    final mathConversation = _Conversation(
      id: _nextConversationId++,
      name: mathRoom.title,
      message: _copy(
        'Mike: Want to review the mock exam solutions before Saturday?',
        'Mike：周六前要不要先把模拟卷解答过一遍？',
      ),
      time: '09:15',
      unreadCount: 1,
      isGroup: true,
      linkedStudyRoomId: mathRoom.id,
      participantNames: ['You', ...mathRoom.members.where((e) => e != 'You')],
      accent: mathRoom.accent,
      messages: [
        _ChatMessage(
          text: _copy(
            'I just uploaded the mock exam pack to Our Study.',
            '我刚把模拟卷打包放到 Our Study 里了。',
          ),
          isMine: false,
          sentAtLabel: '08:42',
        ),
        _ChatMessage(
          text: _copy(
            'Mike: Want to review the mock exam solutions before Saturday?',
            'Mike：周六前要不要先把模拟卷解答过一遍？',
          ),
          isMine: false,
          sentAtLabel: '09:15',
        ),
      ],
    );
    mathRoom.linkedConversationId = mathConversation.id;

    _conversations.addAll([
      physicsConversation,
      mathConversation,
      _Conversation(
        id: _nextConversationId++,
        name: 'Sarah Connor',
        message: _copy(
          'The Python helper function is much cleaner now.',
          '现在这个 Python 辅助函数清晰多了。',
        ),
        time: _copy('Yesterday', '昨天'),
        unreadCount: 0,
        isGroup: false,
        participantNames: const ['You', 'Sarah Connor'],
        accent: _CommunityPalette.rose,
        messages: [
          _ChatMessage(
            text: _copy(
              'The Python helper function is much cleaner now.',
              '现在这个 Python 辅助函数清晰多了。',
            ),
            isMine: false,
            sentAtLabel: _copy('Yesterday', '昨天'),
          ),
        ],
      ),
      _Conversation(
        id: _nextConversationId++,
        name: 'Mike Chen',
        message: _copy(
          'Want to practice coding together tomorrow?',
          '明天要不要一起练习编程？',
        ),
        time: _copy('Wed', '周三'),
        unreadCount: 0,
        isGroup: false,
        participantNames: const ['You', 'Mike Chen'],
        accent: _CommunityPalette.cyan,
        messages: [
          _ChatMessage(
            text: _copy(
              'Want to practice coding together tomorrow?',
              '明天要不要一起练习编程？',
            ),
            isMine: false,
            sentAtLabel: _copy('Wed', '周三'),
          ),
        ],
      ),
    ]);
  }

  String _categoryForUser(_GalaxyUser user) {
    return _userCategoryById[user.id] ?? 'Technology';
  }

  String _categoryLabel(String category, AppLocalizations t) {
    switch (category) {
      case 'All':
        return t.communityCategoryAll;
      case 'Finance':
        return t.communityCategoryFinance;
      case 'Technology':
        return t.communityCategoryTechnology;
      case 'Mathematics':
        return t.communityCategoryMathematics;
      case 'Engineering':
        return t.communityCategoryEngineering;
      case 'Science':
        return t.communityCategoryScience;
      case 'Multilingual':
        return t.communityCategoryMultilingual;
      default:
        return category;
    }
  }

  IconData _iconForCategory(String category) {
    switch (category) {
      case 'Finance':
        return Icons.attach_money_rounded;
      case 'Technology':
        return Icons.memory_rounded;
      case 'Mathematics':
        return Icons.functions_rounded;
      case 'Engineering':
        return Icons.precision_manufacturing_rounded;
      case 'Science':
        return Icons.science_outlined;
      case 'Multilingual':
        return Icons.translate_rounded;
      default:
        return Icons.groups_rounded;
    }
  }

  String _usernameForUser(_GalaxyUser user) {
    final cleaned = user.name
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]'), '')
        .trim();
    if (cleaned.length >= 3) return cleaned;
    return 'user${user.id}';
  }

  String _emailForUser(_GalaxyUser user) {
    return user.email ?? '${_usernameForUser(user)}@primoria.community';
  }

  String _headlineForUser(_GalaxyUser user) {
    final category = _categoryLabel(_categoryForUser(user), _t);
    return _t.communityUserHeadline(category);
  }

  bool _defaultOnlineForUserId(int id) {
    return id % 3 == 0 || id % 5 == 0;
  }

  bool _isUserOnline(_GalaxyUser user) {
    return _userOnlineById[user.id] ?? false;
  }

  int get _connectedUsersCount => _galaxyUsers.length;

  int get _onlineUsersCountIncludingSelf {
    final onlineOthers = _galaxyUsers.where(_isUserOnline).length;
    return onlineOthers + 1;
  }

  int get _messageBadgeCount {
    final unreadMessages = _conversations.fold<int>(
      0,
      (sum, conversation) => sum + conversation.unreadCount,
    );
    final unreadNotifications = _notifications.where((n) => n.unread).length;
    return unreadMessages + unreadNotifications;
  }

  _Conversation? get _selectedConversation {
    if (_selectedConversationId == null) return null;
    for (final conversation in _conversations) {
      if (conversation.id == _selectedConversationId) return conversation;
    }
    return null;
  }

  _CommunityNote? get _selectedNote {
    if (_selectedNoteId == null) return null;
    for (final note in _notes) {
      if (note.id == _selectedNoteId) return note;
    }
    return null;
  }

  List<_StudyRoom> get _joinedStudyRooms {
    final query = _studyQuery.trim().toLowerCase();
    return _studyRooms.where((room) {
      if (!room.joined) return false;
      if (query.isEmpty) return true;
      final haystack = [
        room.title,
        room.subtitle,
        room.focus,
        ...room.tags,
        ...room.materials.map((material) => material.title),
      ].join(' ').toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  List<_Conversation> get _visibleConversations {
    final normalizedQuery = _messageQuery.trim().toLowerCase();
    if (normalizedQuery.isEmpty) return _conversations;
    return _conversations.where((conversation) {
      return conversation.name.toLowerCase().contains(normalizedQuery) ||
          conversation.message.toLowerCase().contains(normalizedQuery);
    }).toList();
  }

  List<int> get _visibleGalaxyUserIndexes {
    final normalizedQuery = _findQuery.trim().toLowerCase();
    final hasQuery = normalizedQuery.isNotEmpty;
    final matchingIndexes = <int>[];
    for (var i = 0; i < _galaxyUsers.length; i++) {
      final user = _galaxyUsers[i];
      final categoryMatches = _selectedCategory == 'All'
          ? true
          : _categoryForUser(user) == _selectedCategory;
      if (!categoryMatches) continue;

      if (!hasQuery) {
        matchingIndexes.add(i);
        continue;
      }

      final nameMatches = user.name.toLowerCase().contains(normalizedQuery);
      final emailMatches = (user.email ?? '').toLowerCase().contains(
        normalizedQuery,
      );
      if (nameMatches || emailMatches) {
        matchingIndexes.add(i);
      }
    }
    return matchingIndexes;
  }

  void _selectSection(_CommunityWorkspaceSection section) {
    setState(() => _section = section);
  }

  void _showMessageSnack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  void _addNotification({
    required String title,
    required String body,
    required IconData icon,
    required Color color,
    bool unread = true,
  }) {
    _notifications.insert(
      0,
      _CommunityNotification(
        id: _nextNotificationId++,
        title: title,
        body: body,
        timeLabel: _copy('just now', '刚刚'),
        unread: unread,
        icon: icon,
        color: color,
      ),
    );
  }

  void _markAllNotificationsRead() {
    setState(() {
      for (final notification in _notifications) {
        notification.unread = false;
      }
    });
  }

  Future<void> _startChatWithUser(_GalaxyUser user) async {
    final existingIndex = _conversations.indexWhere(
      (conversation) =>
          !conversation.isGroup &&
          conversation.name.toLowerCase() == user.name.toLowerCase(),
    );

    late final _Conversation conversation;
    if (existingIndex >= 0) {
      conversation = _conversations[existingIndex];
    } else {
      final initialTime = _formatCurrentTimeLabel();
      conversation = _Conversation(
        id: _nextConversationId++,
        name: user.name,
        message: _t.communityNewConnectionRequest,
        time: initialTime,
        unreadCount: 1,
        isGroup: false,
        participantNames: ['You', user.name],
        accent: user.color,
        messages: [
          _ChatMessage(
            text: _t.communityGreetingUser(user.name),
            isMine: false,
            sentAtLabel: initialTime,
          ),
        ],
      );
      setState(() => _conversations.insert(0, conversation));
    }

    if (!mounted) return;
    setState(() {
      _section = _CommunityWorkspaceSection.messages;
      _selectedConversationId = conversation.id;
      conversation.unreadCount = 0;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollInlineThreadToBottom();
    });

    if (MediaQuery.sizeOf(context).width < 900) {
      await _openConversationChat(conversation);
    }
  }

  void _callUser(_GalaxyUser user) {
    _showMessageSnack(_t.communityCallingUser(user.name));
  }

  Future<void> _showUserProfileDialog(_GalaxyUser user) async {
    final t = _t;
    final category = _categoryForUser(user);
    final username = _usernameForUser(user);
    final email = _emailForUser(user);

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          titlePadding: const EdgeInsets.fromLTRB(20, 18, 12, 6),
          contentPadding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
          actionsPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          title: Row(
            children: [
              CircleAvatar(
                radius: 21,
                backgroundColor: user.color.withValues(alpha: 0.2),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: _CommunityPalette.text,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: _CommunityPalette.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '@$username',
                      style: const TextStyle(
                        fontSize: 13,
                        color: _CommunityPalette.subtext,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                icon: const Icon(Icons.close, size: 20),
              ),
            ],
          ),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _headlineForUser(user),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF334155),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                _buildProfileField(
                  t.communityCategoryLabel,
                  _categoryLabel(category, t),
                ),
                _buildProfileField(
                  t.communityStatusLabel,
                  _isUserOnline(user)
                      ? t.communityStatusOnlineNow
                      : t.communityStatusOffline,
                ),
                _buildProfileField(t.communityEmailLabel, email),
                _buildProfileField(t.communityUsernameLabel, '@$username'),
              ],
            ),
          ),
          actions: [
            OutlinedButton.icon(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _startChatWithUser(user);
              },
              icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
              label: Text(t.communityButtonMessage),
            ),
            FilledButton.icon(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _callUser(user);
              },
              icon: const Icon(Icons.call_outlined, size: 18),
              label: Text(t.communityButtonCall),
            ),
          ],
        );
      },
    );
  }

  Widget _buildProfileField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 76,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _CommunityPalette.subtext,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: _CommunityPalette.text,
              ),
            ),
          ),
        ],
      ),
    );
  }

  ThemeData _communityDialogTheme(BuildContext context) {
    final base = Theme.of(context);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(primary: _CommunityPalette.blue),
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _CommunityPalette.blue, width: 2),
        ),
        floatingLabelStyle: const TextStyle(color: _CommunityPalette.blue),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: _CommunityPalette.blue),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _CommunityPalette.blue,
          foregroundColor: Colors.white,
        ),
      ),
    );
  }

  Future<void> _showAddUserDialog() async {
    final t = _t;
    final inputController = TextEditingController();
    String? errorText;
    var selectedCategory = _selectedCategory == 'All'
        ? 'Technology'
        : _selectedCategory;

    final input = await showDialog<_AddUserInput>(
      context: context,
      builder: (dialogContext) {
        return Theme(
          data: _communityDialogTheme(dialogContext),
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              return AlertDialog(
                title: Text(t.communityAddUserTitle),
                content: SizedBox(
                  width: 360,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.communityAddUserHint),
                      const SizedBox(height: 12),
                      TextField(
                        controller: inputController,
                        autofocus: true,
                        onChanged: (_) {
                          if (errorText != null) {
                            setDialogState(() => errorText = null);
                          }
                        },
                        decoration: InputDecoration(
                          hintText: t.communityAddUserInputHint,
                          errorText: errorText,
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedCategory,
                        decoration: InputDecoration(
                          labelText: t.communityCategoryLabel,
                          border: const OutlineInputBorder(),
                        ),
                        items: _communityCategories.map((category) {
                          return DropdownMenuItem<String>(
                            value: category,
                            child: Text(_categoryLabel(category, t)),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value == null) return;
                          setDialogState(() => selectedCategory = value);
                        },
                      ),
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    child: Text(t.cancel),
                  ),
                  FilledButton(
                    onPressed: () {
                      final value = inputController.text.trim();
                      final validationError = _validateAddUserInput(value);
                      if (validationError != null) {
                        setDialogState(() => errorText = validationError);
                        return;
                      }
                      Navigator.of(
                        dialogContext,
                      ).pop(_AddUserInput(value, selectedCategory));
                    },
                    child: Text(t.communityAddButton),
                  ),
                ],
              );
            },
          ),
        );
      },
    );

    inputController.dispose();
    if (!mounted || input == null) return;

    final addedUser = _addUserFromInput(input.identifier, input.category);
    _showMessageSnack(t.communityAddedUser(addedUser.name));
  }

  String? _validateAddUserInput(String input) {
    final t = _t;
    if (input.isEmpty) {
      return t.communityValidationInputRequired;
    }

    final isEmail = _isValidEmail(input);
    final isUsername = _isValidUsername(input);
    if (!isEmail && !isUsername) {
      return t.communityValidationInputInvalid;
    }

    final normalizedInput = input.toLowerCase();
    final exists = _galaxyUsers.any((user) {
      final nameMatches = user.name.toLowerCase() == normalizedInput;
      final emailMatches = (user.email ?? '').toLowerCase() == normalizedInput;
      return nameMatches || emailMatches;
    });
    if (exists) {
      return t.communityValidationUserExists;
    }

    return null;
  }

  bool _isValidEmail(String value) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value);
  }

  bool _isValidUsername(String value) {
    return RegExp(r'^[a-zA-Z0-9._-]{3,32}$').hasMatch(value);
  }

  _GalaxyUser _addUserFromInput(String input, String category) {
    final isEmail = _isValidEmail(input);
    final displayName = isEmail ? input.split('@').first : input;
    final newUser = _GalaxyUser(
      _nextUserId++,
      displayName,
      18 + _rng.nextDouble() * 64,
      18 + _rng.nextDouble() * 56,
      _newUserColors[_rng.nextInt(_newUserColors.length)],
      'medium',
      _rng.nextDouble() * math.pi * 2,
      email: isEmail ? input : null,
    );

    setState(() {
      _section = _CommunityWorkspaceSection.dashboard;
      _galaxyUsers.add(newUser);
      _userCategoryById[newUser.id] = category;
      _userOnlineById[newUser.id] = true;
      _findQuery = input;
      _findSearchController.text = input;
      _selectedCategory = category;
    });
    return newUser;
  }

  String? _removeUserAt(int index) {
    if (index < 0 || index >= _galaxyUsers.length) return null;
    final removedUser = _galaxyUsers[index];

    setState(() {
      if (_hoveredUserId == removedUser.id) {
        _hoveredUserId = null;
      }
      _userCategoryById.remove(removedUser.id);
      _userOnlineById.remove(removedUser.id);
      _galaxyUsers.removeAt(index);
    });

    return removedUser.name;
  }

  Future<void> _showRemoveUserDialog() async {
    final t = _t;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return Theme(
          data: _communityDialogTheme(dialogContext),
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              return AlertDialog(
                title: Text(t.communityRemoveUserTitle),
                content: SizedBox(
                  width: 420,
                  height: 360,
                  child: _galaxyUsers.isEmpty
                      ? Center(
                          child: Text(
                            t.communityNoUsers,
                            style: const TextStyle(
                              color: _CommunityPalette.subtext,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        )
                      : ListView.separated(
                          itemCount: _galaxyUsers.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final user = _galaxyUsers[index];
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: CircleAvatar(
                                backgroundColor: user.color.withValues(
                                  alpha: 0.2,
                                ),
                                child: Text(
                                  user.name.isNotEmpty
                                      ? user.name[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    color: _CommunityPalette.text,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              title: Text(
                                user.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: _CommunityPalette.text,
                                ),
                              ),
                              subtitle: Text(
                                '${user.email ?? t.communityUsernameOnly}  •  ${_categoryLabel(_categoryForUser(user), t)}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: _CommunityPalette.subtext,
                                  fontSize: 12,
                                ),
                              ),
                              trailing: TextButton.icon(
                                onPressed: () {
                                  final removedName = _removeUserAt(index);
                                  if (removedName == null) return;

                                  if (_galaxyUsers.isEmpty) {
                                    Navigator.of(dialogContext).pop();
                                  } else {
                                    setDialogState(() {});
                                  }

                                  _showMessageSnack(
                                    t.communityRemovedUser(removedName),
                                  );
                                },
                                icon: const Icon(
                                  Icons.delete_outline,
                                  size: 18,
                                  color: Color(0xFFDC2626),
                                ),
                                label: Text(
                                  t.communityRemoveButton,
                                  style: const TextStyle(
                                    color: Color(0xFFDC2626),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    child: Text(t.communityDoneButton),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  void _syncSelectedNoteFromControllers() {
    final note = _selectedNote;
    if (note == null) return;
    note.title = _noteTitleController.text.trim().isEmpty
        ? _copy('Untitled Note', '未命名笔记')
        : _noteTitleController.text.trim();
    note.body = _noteBodyController.text;
    note.updatedAt = DateTime.now();
  }

  void _loadSelectedNoteIntoControllers() {
    final note = _selectedNote;
    if (note == null) {
      _noteTitleController.clear();
      _noteBodyController.clear();
      return;
    }
    _noteTitleController.text = note.title;
    _noteBodyController.text = note.body;
  }

  void _selectNote(int noteId) {
    _syncSelectedNoteFromControllers();
    setState(() {
      _selectedNoteId = noteId;
      _loadSelectedNoteIntoControllers();
    });
  }

  void _createNewNote() {
    _syncSelectedNoteFromControllers();
    final note = _CommunityNote(
      id: _nextNoteId++,
      title: _copy('Fresh note', '新建笔记'),
      body: '',
      attachments: <_NoteAttachment>[],
      strokes: <_SketchStroke>[],
      updatedAt: DateTime.now(),
    );
    setState(() {
      _notes.insert(0, note);
      _selectedNoteId = note.id;
      _loadSelectedNoteIntoControllers();
    });
  }

  Future<void> _showAddAttachmentDialog() async {
    final note = _selectedNote;
    if (note == null) return;

    final titleController = TextEditingController();
    final captionController = TextEditingController();
    final draft = await showDialog<_AttachmentDraft>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(_copy('Add image card', '添加图片卡片')),
          content: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: InputDecoration(
                    labelText: _copy('Label', '标题'),
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: captionController,
                  decoration: InputDecoration(
                    labelText: _copy('Caption', '说明'),
                    border: const OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(_t.cancel),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(dialogContext).pop(
                  _AttachmentDraft(
                    titleController.text.trim(),
                    captionController.text.trim(),
                  ),
                );
              },
              child: Text(_copy('Add', '添加')),
            ),
          ],
        );
      },
    );

    titleController.dispose();
    captionController.dispose();

    if (!mounted || draft == null) return;
    setState(() {
      note.attachments.add(
        _NoteAttachment(
          label: draft.title.isEmpty
              ? _copy('Reference image', '参考图片')
              : draft.title,
          caption: draft.caption.isEmpty
              ? _copy('Dropped into the shared notes board.', '已添加到共享笔记板。')
              : draft.caption,
          tint: _newUserColors[_rng.nextInt(_newUserColors.length)].withValues(
            alpha: 0.14,
          ),
        ),
      );
      note.updatedAt = DateTime.now();
    });
  }

  void _clearSelectedSketch() {
    final note = _selectedNote;
    if (note == null) return;
    setState(() {
      note.strokes.clear();
      note.updatedAt = DateTime.now();
    });
  }

  void _startStroke(Offset point) {
    final note = _selectedNote;
    if (note == null) return;
    setState(() {
      note.strokes.add(
        _SketchStroke(
          points: [point],
          color: _selectedInkColor,
          width: _selectedInkWidth,
        ),
      );
      note.updatedAt = DateTime.now();
    });
  }

  void _appendStroke(Offset point) {
    final note = _selectedNote;
    if (note == null || note.strokes.isEmpty) return;
    setState(() {
      note.strokes.last.points.add(point);
      note.updatedAt = DateTime.now();
    });
  }

  void _handleFindAction() {
    final indexes = _visibleGalaxyUserIndexes;
    if (indexes.isEmpty) {
      _showMessageSnack(_t.communityNoUserFound);
      return;
    }

    _showUserProfileDialog(_galaxyUsers[indexes.first]);
  }

  _Conversation _createStudyConversation(_StudyRoom room) {
    final introTime = _formatCurrentTimeLabel();
    final conversation = _Conversation(
      id: _nextConversationId++,
      name: room.title,
      message: _copy(
        'Welcome to the room. Drop your first goal and let the group know what you are studying.',
        '欢迎进入房间。先发一个目标，让大家知道你今天在学什么。',
      ),
      time: introTime,
      unreadCount: 1,
      isGroup: true,
      linkedStudyRoomId: room.id,
      participantNames: [
        'You',
        ...room.members.where((member) => member != 'You'),
      ],
      accent: room.accent,
      messages: [
        _ChatMessage(
          text: _copy(
            'Welcome to the room. Drop your first goal and let the group know what you are studying.',
            '欢迎进入房间。先发一个目标，让大家知道你今天在学什么。',
          ),
          isMine: false,
          sentAtLabel: introTime,
        ),
      ],
    );
    room.linkedConversationId = conversation.id;
    _conversations.insert(0, conversation);
    return conversation;
  }

  void _joinStudyRoom(_StudyRoom room) {
    if (room.joined) {
      setState(() {
        _section = _CommunityWorkspaceSection.ourStudy;
      });
      return;
    }

    setState(() {
      room.joined = true;
      if (!room.members.contains('You')) {
        room.members.insert(0, 'You');
      }
      room.sessionsThisWeek += 1;
      final conversation = _createStudyConversation(room);
      _selectedConversationId = conversation.id;
      _section = _CommunityWorkspaceSection.ourStudy;
      _addNotification(
        title: _copy('Joined ${room.title}', '已加入 ${room.title}'),
        body: _copy(
          'The study room now appears in Our Study and Messages.',
          '这个学习房间现在已经同步到 Our Study 和 Messages。',
        ),
        icon: Icons.group_add_rounded,
        color: room.accent,
      );
    });
  }

  void _leaveStudyRoom(_StudyRoom room) {
    setState(() {
      room.joined = false;
      room.members.remove('You');
      if (room.linkedConversationId != null) {
        _conversations.removeWhere(
          (conversation) => conversation.id == room.linkedConversationId,
        );
        if (_selectedConversationId == room.linkedConversationId) {
          _selectedConversationId = _conversations.isEmpty
              ? null
              : _conversations.first.id;
        }
      }
      room.linkedConversationId = null;
      _addNotification(
        title: _copy('Left ${room.title}', '已退出 ${room.title}'),
        body: _copy(
          'You can always rejoin it from Trending later.',
          '之后仍然可以在 Trending 页面重新加入。',
        ),
        icon: Icons.logout_rounded,
        color: room.accent,
      );
    });
  }

  Future<void> _showCreateStudyGroupDialog() async {
    final nameController = TextEditingController();
    final focusController = TextEditingController();
    final scheduleController = TextEditingController();
    var category = _selectedCategory == 'All'
        ? 'Technology'
        : _selectedCategory;

    final draft = await showDialog<_NewStudyGroupDraft>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(_copy('Create study group', '创建学习小组')),
              content: SizedBox(
                width: 380,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: InputDecoration(
                        labelText: _copy('Group name', '小组名称'),
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: focusController,
                      decoration: InputDecoration(
                        labelText: _copy('Focus area', '学习焦点'),
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: scheduleController,
                      decoration: InputDecoration(
                        labelText: _copy('Schedule', '时间安排'),
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: category,
                      decoration: InputDecoration(
                        labelText: _t.communityCategoryLabel,
                        border: const OutlineInputBorder(),
                      ),
                      items: _communityCategories.map((item) {
                        return DropdownMenuItem<String>(
                          value: item,
                          child: Text(_categoryLabel(item, _t)),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value == null) return;
                        setDialogState(() => category = value);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: Text(_t.cancel),
                ),
                FilledButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop(
                      _NewStudyGroupDraft(
                        nameController.text.trim(),
                        focusController.text.trim(),
                        scheduleController.text.trim(),
                        category,
                      ),
                    );
                  },
                  child: Text(_copy('Create', '创建')),
                ),
              ],
            );
          },
        );
      },
    );

    nameController.dispose();
    focusController.dispose();
    scheduleController.dispose();

    if (!mounted || draft == null) return;

    final room = _StudyRoom(
      id: _nextStudyRoomId++,
      title: draft.name.isEmpty
          ? _copy('New study group', '新学习小组')
          : draft.name,
      subtitle: _copy(
        'Fresh room for partner work, group check-ins, and shared materials.',
        '一个适合搭子学习、小组同步与共享资料的新房间。',
      ),
      focus: draft.focus.isEmpty
          ? _copy('Shared study plan', '共享学习计划')
          : draft.focus,
      schedule: draft.schedule.isEmpty
          ? _copy('Pick a time together', '一起决定时间')
          : draft.schedule,
      tags: [
        _categoryLabel(draft.category, _t),
        _copy('New room', '新房间'),
        _copy('Planner', '计划中'),
      ],
      goals: [_copy('Set the first shared milestone', '先确定第一个共同里程碑')],
      materials: [
        _StudyMaterial(
          title: _copy('Shared notes board', '共享笔记板'),
          type: _copy('Notes', '笔记'),
          status: _copy('Ready', '已准备'),
        ),
      ],
      members: ['You'],
      accent: _newUserColors[_rng.nextInt(_newUserColors.length)],
      progress: 0.08,
      sessionsThisWeek: 0,
      joined: true,
    );

    setState(() {
      _studyRooms.insert(0, room);
      final conversation = _createStudyConversation(room);
      _selectedConversationId = conversation.id;
      _section = _CommunityWorkspaceSection.messages;
      _addNotification(
        title: _copy('Created ${room.title}', '已创建 ${room.title}'),
        body: _copy(
          'Invite people from Messages or Trending to start collaborating.',
          '你可以在 Messages 或 Trending 中邀请更多人加入。',
        ),
        icon: Icons.auto_awesome_rounded,
        color: room.accent,
      );
    });
  }

  Future<void> _showStartDirectChatDialog() async {
    final user = await showDialog<_GalaxyUser>(
      context: context,
      builder: (dialogContext) {
        return SimpleDialog(
          title: Text(_copy('Start new chat', '发起新聊天')),
          children: _galaxyUsers.take(8).map((user) {
            return SimpleDialogOption(
              onPressed: () => Navigator.of(dialogContext).pop(user),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: user.color.withValues(alpha: 0.18),
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        color: _CommunityPalette.text,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      user.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );

    if (!mounted || user == null) return;
    await _startChatWithUser(user);
  }

  Future<void> _showAddMembersDialog() async {
    final conversation = _selectedConversation;
    if (conversation == null || !conversation.isGroup) {
      _showMessageSnack(_copy('Choose a group chat first.', '请先选择一个群聊。'));
      return;
    }

    final candidates = _galaxyUsers
        .where((user) => !conversation.participantNames.contains(user.name))
        .toList();
    if (candidates.isEmpty) {
      _showMessageSnack(
        _copy('Everyone is already in this group.', '这个群组里已经包含所有可添加成员了。'),
      );
      return;
    }

    final addedUsers = <_GalaxyUser>{};
    final picked = await showDialog<List<_GalaxyUser>>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(_copy('Add members', '添加成员')),
              content: SizedBox(
                width: 420,
                height: 320,
                child: ListView.builder(
                  itemCount: candidates.length,
                  itemBuilder: (context, index) {
                    final user = candidates[index];
                    final selected = addedUsers.contains(user);
                    return CheckboxListTile(
                      value: selected,
                      onChanged: (_) {
                        setDialogState(() {
                          if (selected) {
                            addedUsers.remove(user);
                          } else {
                            addedUsers.add(user);
                          }
                        });
                      },
                      title: Text(user.name),
                      subtitle: Text(
                        _categoryLabel(_categoryForUser(user), _t),
                      ),
                    );
                  },
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: Text(_t.cancel),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(
                    dialogContext,
                  ).pop(addedUsers.toList(growable: false)),
                  child: Text(_copy('Add members', '添加成员')),
                ),
              ],
            );
          },
        );
      },
    );

    if (!mounted || picked == null || picked.isEmpty) return;

    setState(() {
      for (final user in picked) {
        conversation.participantNames.add(user.name);
      }
      final room = _studyRooms.cast<_StudyRoom?>().firstWhere(
        (room) => room?.id == conversation.linkedStudyRoomId,
        orElse: () => null,
      );
      if (room != null) {
        for (final user in picked) {
          if (!room.members.contains(user.name)) {
            room.members.add(user.name);
          }
        }
      }
      conversation.messages.add(
        _ChatMessage(
          text: _copy(
            '${picked.map((u) => u.name).join(', ')} joined the group.',
            '${picked.map((u) => u.name).join('、')} 已加入群组。',
          ),
          isMine: false,
          sentAtLabel: _formatCurrentTimeLabel(),
        ),
      );
      conversation.message = _copy(
        'New members were added to the group.',
        '有新成员加入了群组。',
      );
      conversation.time = _formatCurrentTimeLabel();
      _addNotification(
        title: _copy(
          'Members added to ${conversation.name}',
          '已为 ${conversation.name} 添加新成员',
        ),
        body: _copy(
          'Your group chat and study room both now include the new members.',
          '你的群聊和学习房间都已同步新增成员。',
        ),
        icon: Icons.group_add_rounded,
        color: conversation.accent,
      );
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollInlineThreadToBottom();
    });
  }

  void _toggleFollowPerson(_CommunityPerson person) {
    setState(() => person.following = !person.following);
  }

  void _scrollInlineThreadToBottom() {
    if (!_messageThreadController.hasClients) return;
    _messageThreadController.animateTo(
      _messageThreadController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
    );
  }

  void _selectConversation(_Conversation conversation) {
    setState(() {
      _selectedConversationId = conversation.id;
      conversation.unreadCount = 0;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollInlineThreadToBottom();
    });
  }

  void _sendMessageToConversation(_Conversation conversation, String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final timeLabel = _formatCurrentTimeLabel();
    setState(() {
      conversation.messages.add(
        _ChatMessage(text: trimmed, isMine: true, sentAtLabel: timeLabel),
      );
      conversation.message = trimmed;
      conversation.time = timeLabel;
      conversation.unreadCount = 0;
    });
    _messageComposerController.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollInlineThreadToBottom();
    });
  }

  String _formatCurrentTimeLabel() {
    final now = DateTime.now();
    final hour = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _formatNoteTimestamp(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '$month/$day · $hour:$minute';
  }

  Future<void> _openConversationChat(_Conversation conversation) async {
    if (conversation.unreadCount > 0) {
      setState(() => conversation.unreadCount = 0);
    }

    final composeController = TextEditingController();
    final scrollController = ScrollController();
    var initialScrollDone = false;

    void scrollToBottom() {
      if (!scrollController.hasClients) return;
      scrollController.animateTo(
        scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      );
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (sheetContext) {
        return FractionallySizedBox(
          heightFactor: 0.86,
          child: StatefulBuilder(
            builder: (context, setSheetState) {
              void sendMessage() {
                final text = composeController.text.trim();
                if (text.isEmpty) return;

                final timeLabel = _formatCurrentTimeLabel();
                setState(() {
                  conversation.messages.add(
                    _ChatMessage(
                      text: text,
                      isMine: true,
                      sentAtLabel: timeLabel,
                    ),
                  );
                  conversation.message = text;
                  conversation.time = timeLabel;
                  conversation.unreadCount = 0;
                });
                setSheetState(() {});
                composeController.clear();
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  scrollToBottom();
                });
              }

              if (!initialScrollDone) {
                initialScrollDone = true;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  scrollToBottom();
                });
              }

              return SafeArea(
                child: Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 8, 12, 8),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: conversation.accent.withValues(
                                alpha: 0.18,
                              ),
                              child: Text(
                                conversation.name[0].toUpperCase(),
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: conversation.accent,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                conversation.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: _CommunityPalette.text,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.of(sheetContext).pop(),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      Expanded(
                        child: ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                          itemCount: conversation.messages.length,
                          itemBuilder: (context, index) {
                            final message = conversation.messages[index];
                            return _buildChatBubble(
                              message: message,
                              maxWidth:
                                  MediaQuery.of(sheetContext).size.width * 0.72,
                            );
                          },
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                        decoration: const BoxDecoration(
                          border: Border(
                            top: BorderSide(color: _CommunityPalette.border),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: composeController,
                                textInputAction: TextInputAction.send,
                                onSubmitted: (_) => sendMessage(),
                                decoration: InputDecoration(
                                  hintText: _t.communityTypeMessageHint,
                                  hintStyle: const TextStyle(
                                    color: _CommunityPalette.subtle,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 12,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                      color: _CommunityPalette.border,
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                      color: _CommunityPalette.border,
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: conversation.accent,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            FilledButton(
                              onPressed: sendMessage,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size(44, 44),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: const Icon(Icons.send_rounded, size: 18),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );

    composeController.dispose();
    scrollController.dispose();
  }

  void _deleteConversation(_Conversation conversation) {
    setState(() {
      if (conversation.linkedStudyRoomId != null) {
        final room = _studyRooms.cast<_StudyRoom?>().firstWhere(
          (item) => item?.id == conversation.linkedStudyRoomId,
          orElse: () => null,
        );
        if (room != null) {
          room.joined = false;
          room.linkedConversationId = null;
          room.members.remove('You');
        }
      }
      _conversations.removeWhere((item) => item.id == conversation.id);
      if (_selectedConversationId == conversation.id) {
        _selectedConversationId = _conversations.isEmpty
            ? null
            : _conversations.first.id;
      }
    });
    _showMessageSnack(_t.communityDeletedChatWith(conversation.name));
  }

  Widget _buildSurfaceCard({
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(20),
    EdgeInsetsGeometry? margin,
    double radius = 24,
    Color background = _CommunityPalette.surface,
    BorderSide? borderSide,
  }) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: borderSide?.color ?? _CommunityPalette.border,
          width: borderSide?.width ?? 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LanguageProvider>().t;
    return ViewerPageShell(
      preset: ViewerContentWidthPreset.fullWidth,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final horizontalPadding = constraints.maxWidth >= 1600
              ? 28.0
              : constraints.maxWidth >= 1200
              ? 20.0
              : 0.0;
          final isWideLayout = constraints.maxWidth >= 1180;
          return Container(
            color: _CommunityPalette.page,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
              child: isWideLayout
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildWorkspaceSidebar(),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildWorkspacePanel(isWideLayout: true),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildMobileWorkspaceTabs(),
                        Expanded(
                          child: _buildWorkspacePanel(isWideLayout: false),
                        ),
                      ],
                    ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWorkspaceSidebar() {
    return Container(
      width: 268,
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: _CommunityPalette.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF22D3EE)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.groups_2_rounded,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _copy('Community', '社区'),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: _CommunityPalette.text,
                        ),
                      ),
                      Text(
                        _copy('Main menu', '主导航'),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _CommunityPalette.subtle,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            for (final section in _CommunityWorkspaceSection.values) ...[
              _buildWorkspaceNavItem(section),
              const SizedBox(height: 8),
            ],
            const Spacer(),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkspaceNavItem(_CommunityWorkspaceSection section) {
    final selected = _section == section;
    final label = _sectionLabel(section);
    final icon = _sectionIcon(section);
    final badgeCount = section == _CommunityWorkspaceSection.messages
        ? _messageBadgeCount
        : null;

    return Material(
      color: selected ? const Color(0xFFEFF3FF) : Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _selectSection(section),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          child: Row(
            children: [
              Icon(
                icon,
                color: selected
                    ? _CommunityPalette.blue
                    : _CommunityPalette.subtext,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    color: selected
                        ? _CommunityPalette.blue
                        : _CommunityPalette.subtext,
                  ),
                ),
              ),
              if (badgeCount != null && badgeCount > 0)
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: _CommunityPalette.red,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Center(
                    child: Text(
                      '$badgeCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMobileWorkspaceTabs() {
    return SizedBox(
      height: 66,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(0, 8, 0, 6),
        scrollDirection: Axis.horizontal,
        itemCount: _CommunityWorkspaceSection.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final section = _CommunityWorkspaceSection.values[index];
          final selected = _section == section;
          final badgeCount = section == _CommunityWorkspaceSection.messages
              ? _messageBadgeCount
              : null;
          return Padding(
            padding: EdgeInsets.only(
              left: index == 0 ? 4 : 0,
              right: index == 4 ? 4 : 0,
            ),
            child: ChoiceChip(
              selected: selected,
              onSelected: (_) => _selectSection(section),
              avatar: Icon(
                _sectionIcon(section),
                size: 18,
                color: selected
                    ? _CommunityPalette.blue
                    : _CommunityPalette.subtext,
              ),
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_sectionLabel(section)),
                  if (badgeCount != null && badgeCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        color: _CommunityPalette.red,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Center(
                        child: Text(
                          '$badgeCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              selectedColor: const Color(0xFFEFF3FF),
              backgroundColor: Colors.white,
              side: const BorderSide(color: _CommunityPalette.border),
              labelStyle: TextStyle(
                color: selected
                    ? _CommunityPalette.blue
                    : _CommunityPalette.subtext,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWorkspacePanel({required bool isWideLayout}) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: _CommunityPalette.panel,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Column(
        children: [
          _buildWorkspaceTopBar(isWideLayout: isWideLayout),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: KeyedSubtree(
                key: ValueKey(_section),
                child: _buildSectionContent(isWideLayout: isWideLayout),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkspaceTopBar({required bool isWideLayout}) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        20,
        isWideLayout ? 24 : 18,
        18,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(bottom: BorderSide(color: _CommunityPalette.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _sectionLabel(_section),
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: _CommunityPalette.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _sectionSubtitle(_section),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _CommunityPalette.subtext,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          if (isWideLayout)
            Expanded(
              child: Align(
                alignment: Alignment.centerRight,
                child: Wrap(
                  alignment: WrapAlignment.end,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 14,
                  runSpacing: 10,
                  children: _buildTopBarActions(isWideLayout),
                ),
              ),
            )
          else
            Flexible(
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: 10,
                runSpacing: 10,
                children: _buildTopBarActions(isWideLayout),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _buildTopBarActions(bool isWideLayout) {
    switch (_section) {
      case _CommunityWorkspaceSection.dashboard:
        return [
          _buildIconAction(
            icon: Icons.person_remove_outlined,
            onTap: _showRemoveUserDialog,
          ),
          _buildIconAction(
            icon: Icons.person_add_outlined,
            onTap: _showAddUserDialog,
          ),
          _buildConnectionStats(),
        ];
      case _CommunityWorkspaceSection.ourStudy:
        return [
          SizedBox(
            width: isWideLayout ? 250 : 180,
            child: TextField(
              controller: _studySearchController,
              onChanged: (value) => setState(() => _studyQuery = value),
              decoration: InputDecoration(
                hintText: _copy('Search a shared room…', '搜索共享房间…'),
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                isDense: true,
                filled: true,
                fillColor: _CommunityPalette.surfaceMuted,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.blue),
                ),
              ),
            ),
          ),
          FilledButton.icon(
            onPressed: _showCreateStudyGroupDialog,
            icon: const Icon(Icons.group_add_rounded, size: 18),
            label: Text(_copy('New group', '新建群组')),
          ),
        ];
      case _CommunityWorkspaceSection.notes:
        return [
          FilledButton.icon(
            onPressed: _createNewNote,
            icon: const Icon(Icons.note_add_rounded, size: 18),
            label: Text(_copy('New note', '新建笔记')),
          ),
          OutlinedButton.icon(
            onPressed: _showAddAttachmentDialog,
            icon: const Icon(Icons.image_outlined, size: 18),
            label: Text(_copy('Add image', '添加图片')),
          ),
          OutlinedButton.icon(
            onPressed: _clearSelectedSketch,
            icon: const Icon(Icons.layers_clear_rounded, size: 18),
            label: Text(_copy('Clear sketch', '清除草图')),
          ),
        ];
      case _CommunityWorkspaceSection.messages:
        return [
          _buildNotificationPill(),
          FilledButton.icon(
            onPressed: _showStartDirectChatDialog,
            icon: const Icon(Icons.edit_note_rounded, size: 18),
            label: Text(_copy('New chat', '新聊天')),
          ),
          OutlinedButton.icon(
            onPressed: _showCreateStudyGroupDialog,
            icon: const Icon(Icons.group_work_rounded, size: 18),
            label: Text(_copy('New group', '新群组')),
          ),
          OutlinedButton.icon(
            onPressed: _showAddMembersDialog,
            icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
            label: Text(_copy('Add members', '添加成员')),
          ),
        ];
      case _CommunityWorkspaceSection.trending:
        return [
          _buildNotificationPill(),
          FilledButton.icon(
            onPressed: () =>
                _selectSection(_CommunityWorkspaceSection.messages),
            icon: const Icon(Icons.mark_chat_unread_rounded, size: 18),
            label: Text(_copy('Open messages', '打开消息')),
          ),
        ];
    }
  }

  Widget _buildNotificationPill() {
    final unreadNotifications = _notifications.where((n) => n.unread).length;
    return GestureDetector(
      onTap: () => _selectSection(_CommunityWorkspaceSection.messages),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _CommunityPalette.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.notifications_none_rounded,
              size: 18,
              color: _CommunityPalette.subtext,
            ),
            const SizedBox(width: 8),
            Text(
              unreadNotifications > 0
                  ? _copy(
                      '$unreadNotifications new',
                      '$unreadNotifications 条新通知',
                    )
                  : _copy('All clear', '通知已清空'),
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: _CommunityPalette.text,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIconAction({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: _CommunityPalette.surfaceMuted,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _CommunityPalette.border),
        ),
        child: Icon(icon, size: 22, color: _CommunityPalette.text),
      ),
    );
  }

  Widget _buildSectionContent({required bool isWideLayout}) {
    switch (_section) {
      case _CommunityWorkspaceSection.dashboard:
        return _buildDashboardPage(isWideLayout: isWideLayout);
      case _CommunityWorkspaceSection.ourStudy:
        return _buildOurStudyPage(isWideLayout: isWideLayout);
      case _CommunityWorkspaceSection.notes:
        return _buildNotesPage(isWideLayout: isWideLayout);
      case _CommunityWorkspaceSection.messages:
        return _buildMessagesPage(isWideLayout: isWideLayout);
      case _CommunityWorkspaceSection.trending:
        return _buildTrendingPage(isWideLayout: isWideLayout);
    }
  }

  Widget _buildDashboardPage({required bool isWideLayout}) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        18,
        isWideLayout ? 24 : 18,
        24,
      ),
      child: Column(
        children: [
          _buildInlineCategoryTabs(),
          const SizedBox(height: 14),
          if (isWideLayout)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 7, child: _buildGalaxyExplorer(height: 560)),
                const SizedBox(width: 16),
                SizedBox(
                  width: 300,
                  child: Column(
                    children: [
                      _buildDashboardSnapshotCard(
                        title: _copy('Study rooms live', '活跃学习房间'),
                        value: '${_joinedStudyRooms.length}',
                        body: _copy(
                          'Your joined rooms update in real time with materials and chat.',
                          '你加入的房间会实时同步资料与聊天内容。',
                        ),
                        color: _CommunityPalette.blue,
                        buttonLabel: _copy('Open Our Study', '打开 Our Study'),
                        onTap: () =>
                            _selectSection(_CommunityWorkspaceSection.ourStudy),
                      ),
                      const SizedBox(height: 16),
                      _buildDashboardSnapshotCard(
                        title: _copy('Unread messages', '未读消息'),
                        value: '$_messageBadgeCount',
                        body: _copy(
                          'Telegram-style badges show what needs your attention first.',
                          '像 Telegram 一样的角标会先告诉你最需要处理的内容。',
                        ),
                        color: _CommunityPalette.rose,
                        buttonLabel: _copy('Go to Messages', '前往 Messages'),
                        onTap: () =>
                            _selectSection(_CommunityWorkspaceSection.messages),
                      ),
                    ],
                  ),
                ),
              ],
            )
          else ...[
            _buildGalaxyExplorer(height: 500),
            const SizedBox(height: 16),
            _buildDashboardSnapshotCard(
              title: _copy('Study rooms live', '活跃学习房间'),
              value: '${_joinedStudyRooms.length}',
              body: _copy(
                'Your joined rooms update in real time with materials and chat.',
                '你加入的房间会实时同步资料与聊天内容。',
              ),
              color: _CommunityPalette.blue,
              buttonLabel: _copy('Open Our Study', '打开 Our Study'),
              onTap: () => _selectSection(_CommunityWorkspaceSection.ourStudy),
            ),
            const SizedBox(height: 12),
            _buildDashboardSnapshotCard(
              title: _copy('Unread messages', '未读消息'),
              value: '$_messageBadgeCount',
              body: _copy(
                'All notifications and chats stay together in the Messages tab.',
                '所有通知和聊天都会集中在 Messages 页面。',
              ),
              color: _CommunityPalette.rose,
              buttonLabel: _copy('Go to Messages', '前往 Messages'),
              onTap: () => _selectSection(_CommunityWorkspaceSection.messages),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDashboardSnapshotCard({
    required String title,
    required String value,
    required String body,
    required Color color,
    required String buttonLabel,
    required VoidCallback onTap,
  }) {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.subtext,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: _CommunityPalette.subtext,
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: onTap,
            style: OutlinedButton.styleFrom(
              foregroundColor: color,
              side: BorderSide(color: color.withValues(alpha: 0.4)),
            ),
            child: Text(buttonLabel),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineCategoryTabs() {
    final t = context.watch<LanguageProvider>().t;
    return SizedBox(
      height: 54,
      child: ListView.separated(
        padding: EdgeInsets.zero,
        scrollDirection: Axis.horizontal,
        itemCount: _categoryTabs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = _categoryTabs[index];
          final isSelected = _selectedCategory == category;
          return ChoiceChip(
            selected: isSelected,
            onSelected: (_) => setState(() => _selectedCategory = category),
            avatar: Icon(
              _iconForCategory(category),
              size: 16,
              color: isSelected
                  ? _CommunityPalette.blue
                  : _CommunityPalette.subtext,
            ),
            label: Text(_categoryLabel(category, t)),
            labelStyle: TextStyle(
              color: isSelected
                  ? _CommunityPalette.blue
                  : _CommunityPalette.text,
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            ),
            selectedColor: const Color(0xFFEFF3FF),
            backgroundColor: Colors.white,
            side: const BorderSide(color: _CommunityPalette.border),
          );
        },
      ),
    );
  }

  Widget _buildConnectionStats() {
    final t = context.watch<LanguageProvider>().t;
    return Container(
      constraints: const BoxConstraints(minWidth: 176),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _CommunityPalette.surfaceMuted,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.people_alt_outlined,
                size: 15,
                color: _CommunityPalette.subtext,
              ),
              const SizedBox(width: 6),
              Text(
                t.communityConnected(_connectedUsersCount),
                style: const TextStyle(
                  fontSize: 13,
                  color: _CommunityPalette.subtext,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 9,
                height: 9,
                decoration: const BoxDecoration(
                  color: Color(0xFF22C55E),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                t.communityOnline(_onlineUsersCountIncludingSelf),
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF16A34A),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGalaxyExplorer({required double height}) {
    final t = context.watch<LanguageProvider>().t;
    final visibleUserIndexes = _visibleGalaxyUserIndexes;
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        height: height,
        child: Container(
          decoration: const BoxDecoration(gradient: AppColors.galaxyGradient),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x22000000),
                        blurRadius: 18,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _findSearchController,
                    textInputAction: TextInputAction.search,
                    onChanged: (value) => setState(() => _findQuery = value),
                    style: const TextStyle(
                      color: _CommunityPalette.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    decoration: InputDecoration(
                      hintText: t.communitySearchUserHint,
                      hintStyle: const TextStyle(
                        color: _CommunityPalette.subtle,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        color: _CommunityPalette.subtle,
                        size: 20,
                      ),
                      suffixIcon: _findQuery.isEmpty
                          ? null
                          : IconButton(
                              onPressed: () {
                                _findSearchController.clear();
                                setState(() => _findQuery = '');
                              },
                              icon: const Icon(
                                Icons.close,
                                color: _CommunityPalette.subtle,
                                size: 18,
                              ),
                            ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 18),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Positioned.fill(
                          child: IgnorePointer(
                            child: AnimatedBuilder(
                              animation: _shootingStarController,
                              builder: (context, child) {
                                return CustomPaint(
                                  painter: _GalaxyShootingStarsPainter(
                                    stars: _shootingStars,
                                    progress: _shootingStarController.value,
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        if (visibleUserIndexes.isEmpty)
                          Center(
                            child: Text(
                              t.communityNoUserFound,
                              style: const TextStyle(
                                color: Color(0xFFCBD5E1),
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          )
                        else
                          for (final i in visibleUserIndexes)
                            _buildPlanet(_galaxyUsers[i], constraints, t),
                      ],
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
                decoration: const BoxDecoration(
                  gradient: AppColors.galaxyGradient,
                  border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _handleFindAction,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFE2E8F0),
                      side: const BorderSide(
                        color: Color(0xFFE2E8F0),
                        width: 2,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: Text(
                      t.communityFindButton,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanet(
    _GalaxyUser user,
    BoxConstraints constraints,
    AppLocalizations t,
  ) {
    final dotSize = _planetSize(user.size);
    final isHovered = _hoveredUserId == user.id;
    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        final motionOffset = _planetMotionOffset(user, _floatController.value);
        return Positioned(
          left: constraints.maxWidth * user.x / 100 - 20 + motionOffset.dx,
          top: constraints.maxHeight * user.y / 100 - 20 + motionOffset.dy,
          child: child!,
        );
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _hoveredUserId = user.id),
        onExit: (_) {
          if (_hoveredUserId == user.id) {
            setState(() => _hoveredUserId = null);
          }
        },
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () => _showUserProfileDialog(user),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  if (isHovered)
                    Positioned(
                      bottom: dotSize + 8,
                      child: Container(
                        constraints: const BoxConstraints(maxWidth: 190),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _CommunityPalette.border),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x22000000),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _CommunityPalette.text,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              _categoryLabel(_categoryForUser(user), t),
                              style: const TextStyle(
                                fontSize: 11,
                                color: _CommunityPalette.subtext,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    width: isHovered ? dotSize + 3 : dotSize,
                    height: isHovered ? dotSize + 3 : dotSize,
                    decoration: BoxDecoration(
                      color: user.color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: user.color.withValues(alpha: 0.68),
                          blurRadius: isHovered ? 16 : 12,
                          spreadRadius: isHovered ? 5 : 4,
                        ),
                      ],
                      border: isHovered
                          ? Border.all(color: Colors.white, width: 1.4)
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                user.name,
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFFCBD5E1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Offset _planetMotionOffset(_GalaxyUser user, double progress) {
    final loopPhase = progress * math.pi * 2;
    final basePhase = loopPhase + user.floatDelay;
    final orbitPhase =
        loopPhase * 2 + user.floatDelay * 1.15 + (user.id % 4) * 0.32;
    final shimmerPhase = loopPhase * 3 + user.id * 0.21;

    final verticalAmplitude = switch (user.size) {
      'large' => 9.0,
      'medium' => 7.2,
      _ => 5.8,
    };
    final horizontalAmplitude = switch (user.size) {
      'large' => 4.6,
      'medium' => 3.7,
      _ => 2.9,
    };

    final yOffset =
        math.sin(basePhase) * verticalAmplitude + math.cos(shimmerPhase) * 1.2;
    final xOffset =
        math.cos(orbitPhase) * horizontalAmplitude +
        math.sin(shimmerPhase) * 0.9;

    return Offset(xOffset, yOffset);
  }

  double _planetSize(String size) {
    switch (size) {
      case 'large':
        return 20;
      case 'medium':
        return 16;
      default:
        return 12;
    }
  }

  Widget _buildOurStudyPage({required bool isWideLayout}) {
    final rooms = _joinedStudyRooms;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        18,
        isWideLayout ? 24 : 18,
        24,
      ),
      child: isWideLayout
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 7,
                  child: Column(
                    children: [
                      _buildStudyHero(),
                      const SizedBox(height: 16),
                      if (rooms.isEmpty)
                        _buildEmptyStudyCard()
                      else
                        ...rooms.map(
                          (room) => Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: _buildStudyRoomCard(room),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 300,
                  child: Column(
                    children: [
                      _buildStudySummaryRailCard(),
                      const SizedBox(height: 16),
                      _buildStudyGoalsRailCard(rooms),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              children: [
                _buildStudyHero(),
                const SizedBox(height: 16),
                if (rooms.isEmpty)
                  _buildEmptyStudyCard()
                else
                  ...rooms.map(
                    (room) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _buildStudyRoomCard(room),
                    ),
                  ),
                const SizedBox(height: 12),
                _buildStudySummaryRailCard(),
              ],
            ),
    );
  }

  Widget _buildStudyHero() {
    final joinedRooms = _joinedStudyRooms.length;
    final totalMaterials = _joinedStudyRooms.fold<int>(
      0,
      (sum, room) => sum + room.materials.length,
    );
    return _buildSurfaceCard(
      padding: const EdgeInsets.all(22),
      background: const Color(0xFFEEF2FF),
      borderSide: const BorderSide(color: Color(0xFFC7D2FE)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _copy(
                    'Shared learning that actually stays aligned',
                    '真正保持同步的共享学习空间',
                  ),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: _CommunityPalette.text,
                    height: 1.12,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _copy(
                    'Everything your partner or group agreed to study together lives here: rooms, materials, schedules, and the fast path back into chat.',
                    '你和搭子或小组约好一起学习的内容都会集中在这里：房间、资料、日程，以及快速返回聊天的入口。',
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: _CommunityPalette.subtext,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _buildMetricChip(
                label: _copy('Rooms', '房间'),
                value: '$joinedRooms',
              ),
              _buildMetricChip(
                label: _copy('Materials', '资料'),
                value: '$totalMaterials',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricChip({required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.subtext,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyStudyCard() {
    return _buildSurfaceCard(
      child: Column(
        children: [
          const Icon(
            Icons.group_work_rounded,
            size: 44,
            color: _CommunityPalette.subtle,
          ),
          const SizedBox(height: 10),
          Text(
            _copy('No joined study rooms yet', '还没有已加入的学习房间'),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _copy(
              'Browse Trending and join a group to sync it here automatically.',
              '去 Trending 页面加入一个群组，它就会自动同步到这里。',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: _CommunityPalette.subtext,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () =>
                _selectSection(_CommunityWorkspaceSection.trending),
            child: Text(_copy('Go to Trending', '前往 Trending')),
          ),
        ],
      ),
    );
  }

  Widget _buildStudyRoomCard(_StudyRoom room) {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: room.tags
                          .map(
                            (tag) => _buildTag(
                              tag,
                              tint: room.accent.withValues(alpha: 0.12),
                              color: room.accent,
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      room.title,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: _CommunityPalette.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      room.subtitle,
                      style: const TextStyle(
                        fontSize: 13.5,
                        height: 1.5,
                        color: _CommunityPalette.subtext,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonal(
                    onPressed: room.linkedConversationId == null
                        ? null
                        : () {
                            setState(() {
                              _section = _CommunityWorkspaceSection.messages;
                              _selectedConversationId =
                                  room.linkedConversationId;
                            });
                          },
                    child: Text(_copy('Open chat', '打开聊天')),
                  ),
                  OutlinedButton(
                    onPressed: () => _leaveStudyRoom(room),
                    child: Text(_copy('Leave', '退出')),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _buildInfoPill(
                  icon: Icons.my_location_rounded,
                  label: room.focus,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildInfoPill(
                  icon: Icons.schedule_rounded,
                  label: room.schedule,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildInfoPill(
                  icon: Icons.groups_rounded,
                  label: _copy(
                    '${room.members.length} members',
                    '${room.members.length} 位成员',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _copy('Shared progress', '共享进度'),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _CommunityPalette.subtext,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 10,
                        value: room.progress,
                        backgroundColor: const Color(0xFFE2E8F0),
                        color: room.accent,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Text(
                '${(room.progress * 100).round()}%',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: room.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            _copy('Materials and study assets', '资料与学习资产'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: room.materials
                .map(
                  (material) => _buildStudyMaterialCard(material, room.accent),
                )
                .toList(),
          ),
          const SizedBox(height: 16),
          Text(
            _copy('Shared goals', '共享目标'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 10),
          ...room.goals.map(
            (goal) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 5),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: room.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      goal,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        color: _CommunityPalette.subtext,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoPill({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _CommunityPalette.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: _CommunityPalette.subtext),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: _CommunityPalette.text,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudyMaterialCard(_StudyMaterial material, Color accent) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            material.type,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: accent,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            material.title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            material.status,
            style: const TextStyle(
              fontSize: 12,
              color: _CommunityPalette.subtext,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudySummaryRailCard() {
    final joinedRooms = _joinedStudyRooms;
    final averageProgress = joinedRooms.isEmpty
        ? 0.0
        : joinedRooms.map((room) => room.progress).reduce((a, b) => a + b) /
              joinedRooms.length;

    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy('This week', '本周总览'),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 14),
          _buildMiniStat(
            title: _copy('Active rooms', '活跃房间'),
            value: '${joinedRooms.length}',
            color: _CommunityPalette.blue,
          ),
          const SizedBox(height: 12),
          _buildMiniStat(
            title: _copy('Avg. progress', '平均进度'),
            value: '${(averageProgress * 100).round()}%',
            color: _CommunityPalette.mint,
          ),
          const SizedBox(height: 12),
          _buildMiniStat(
            title: _copy('Messages waiting', '待处理消息'),
            value: '$_messageBadgeCount',
            color: _CommunityPalette.rose,
          ),
        ],
      ),
    );
  }

  Widget _buildStudyGoalsRailCard(List<_StudyRoom> rooms) {
    final goals = rooms.expand((room) => room.goals.take(1)).take(4).toList();
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy('Keep these aligned', '优先保持同步'),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 14),
          if (goals.isEmpty)
            Text(
              _copy(
                'Join a room to start sharing milestones here.',
                '加入一个房间后，这里会展示你们共同的里程碑。',
              ),
              style: const TextStyle(
                fontSize: 13,
                color: _CommunityPalette.subtext,
              ),
            )
          else
            ...goals.map(
              (goal) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.flag_rounded,
                      size: 16,
                      color: _CommunityPalette.amber,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        goal,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.45,
                          color: _CommunityPalette.subtext,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMiniStat({
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: _CommunityPalette.subtext,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotesPage({required bool isWideLayout}) {
    final selectedNote = _selectedNote;
    if (selectedNote == null) {
      return Center(
        child: FilledButton(
          onPressed: _createNewNote,
          child: Text(_copy('Create your first note', '创建你的第一份笔记')),
        ),
      );
    }

    final editor = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _noteTitleController,
                onChanged: (_) => _syncSelectedNoteFromControllers(),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  hintText: _copy('Untitled note', '未命名笔记'),
                ),
              ),
              Text(
                _copy(
                  'Updated ${_formatNoteTimestamp(selectedNote.updatedAt)}',
                  '更新于 ${_formatNoteTimestamp(selectedNote.updatedAt)}',
                ),
                style: const TextStyle(
                  fontSize: 12,
                  color: _CommunityPalette.subtext,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _noteBodyController,
                onChanged: (_) => _syncSelectedNoteFromControllers(),
                maxLines: 10,
                decoration: InputDecoration(
                  hintText: _copy(
                    'Capture decisions, action items, and quick summaries from your partner sessions…',
                    '记录你和搭子共学中的决策、行动项与快速总结…',
                  ),
                  filled: true,
                  fillColor: _CommunityPalette.surfaceMuted,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(
                      color: _CommunityPalette.border,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(
                      color: _CommunityPalette.border,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(color: _CommunityPalette.blue),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildSurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'Assets',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: _CommunityPalette.text,
                    ),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _showAddAttachmentDialog,
                    icon: const Icon(
                      Icons.add_photo_alternate_outlined,
                      size: 18,
                    ),
                    label: Text(_copy('Add image', '添加图片')),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (selectedNote.attachments.isEmpty)
                Text(
                  _copy(
                    'Drop screenshots, whiteboard captures, or reference images here.',
                    '把截图、白板内容或参考图片都集中放在这里。',
                  ),
                  style: const TextStyle(
                    fontSize: 13,
                    color: _CommunityPalette.subtext,
                  ),
                )
              else
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: selectedNote.attachments.map((attachment) {
                    return Container(
                      width: 200,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: attachment.tint,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: _CommunityPalette.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            height: 90,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              gradient: LinearGradient(
                                colors: [attachment.tint, Colors.white],
                              ),
                            ),
                            child: const Icon(
                              Icons.image_outlined,
                              size: 34,
                              color: _CommunityPalette.subtext,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            attachment.label,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              color: _CommunityPalette.text,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            attachment.caption,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: _CommunityPalette.subtext,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildSketchPadCard(selectedNote),
      ],
    );

    return Padding(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        18,
        isWideLayout ? 24 : 18,
        24,
      ),
      child: isWideLayout
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: 260, child: _buildNotesSidebar()),
                const SizedBox(width: 16),
                Expanded(child: SingleChildScrollView(child: editor)),
              ],
            )
          : SingleChildScrollView(
              child: Column(
                children: [
                  _buildNotesSidebar(),
                  const SizedBox(height: 16),
                  editor,
                ],
              ),
            ),
    );
  }

  Widget _buildNotesSidebar() {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _copy('Notes board', '笔记板'),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: _createNewNote,
                icon: const Icon(Icons.add_circle_outline_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ..._notes.map((note) {
            final selected = note.id == _selectedNoteId;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Material(
                color: selected
                    ? const Color(0xFFEFF3FF)
                    : _CommunityPalette.surfaceMuted,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => _selectNote(note.id),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: selected
                                ? _CommunityPalette.blue
                                : _CommunityPalette.text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatNoteTimestamp(note.updatedAt),
                          style: const TextStyle(
                            fontSize: 12,
                            color: _CommunityPalette.subtext,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSketchPadCard(_CommunityNote note) {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _copy('Sketch pad', '草图板'),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
              ),
              const Spacer(),
              Wrap(
                spacing: 8,
                children: _inkPalette.map((color) {
                  final selected = color == _selectedInkColor;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedInkColor = color),
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? Colors.black : Colors.white,
                          width: selected ? 2 : 1,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(width: 12),
              DropdownButton<double>(
                value: _selectedInkWidth,
                underline: const SizedBox.shrink(),
                items: const [
                  DropdownMenuItem(value: 2.0, child: Text('2px')),
                  DropdownMenuItem(value: 3.0, child: Text('3px')),
                  DropdownMenuItem(value: 5.0, child: Text('5px')),
                ],
                onChanged: (value) {
                  if (value == null) return;
                  setState(() => _selectedInkWidth = value);
                },
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: GestureDetector(
              onPanStart: (details) => _startStroke(details.localPosition),
              onPanUpdate: (details) => _appendStroke(details.localPosition),
              child: Container(
                height: 240,
                width: double.infinity,
                color: const Color(0xFFFCFCFD),
                child: CustomPaint(painter: _SketchPadPainter(note.strokes)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesPage({required bool isWideLayout}) {
    final visibleConversations = _visibleConversations;
    final selectedConversation = _selectedConversation;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        18,
        isWideLayout ? 24 : 18,
        24,
      ),
      child: Column(
        children: [
          _buildMessageOverviewRow(),
          const SizedBox(height: 16),
          Expanded(
            child: isWideLayout
                ? Row(
                    children: [
                      SizedBox(
                        width: 340,
                        child: _buildMessageListPanel(visibleConversations),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: selectedConversation == null
                            ? _buildEmptyMessagePanel()
                            : _buildInlineConversationPanel(
                                selectedConversation,
                              ),
                      ),
                    ],
                  )
                : _buildMessageListPanel(visibleConversations),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageOverviewRow() {
    final unreadMessages = _conversations.fold<int>(
      0,
      (sum, conversation) => sum + conversation.unreadCount,
    );
    final unreadNotifications = _notifications.where((n) => n.unread).length;
    return Row(
      children: [
        Expanded(
          child: _buildOverviewStat(
            title: _copy('Unread chats', '未读聊天'),
            value: '$unreadMessages',
            color: _CommunityPalette.rose,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildOverviewStat(
            title: _copy('Notifications', '通知'),
            value: '$unreadNotifications',
            color: _CommunityPalette.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildOverviewStat(
            title: _copy('Groups', '群组'),
            value: '${_conversations.where((c) => c.isGroup).length}',
            color: _CommunityPalette.mint,
          ),
        ),
      ],
    );
  }

  Widget _buildOverviewStat({
    required String title,
    required String value,
    required Color color,
  }) {
    return _buildSurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.subtext,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageListPanel(List<_Conversation> conversations) {
    return _buildSurfaceCard(
      padding: const EdgeInsets.all(0),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: TextField(
              controller: _messageSearchController,
              onChanged: (value) => setState(() => _messageQuery = value),
              decoration: InputDecoration(
                hintText: _t.communitySearchBoxHint,
                filled: true,
                fillColor: _CommunityPalette.surfaceMuted,
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  color: _CommunityPalette.subtle,
                  size: 20,
                ),
                suffixIcon: _messageQuery.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _messageSearchController.clear();
                          setState(() => _messageQuery = '');
                        },
                        icon: const Icon(Icons.close, size: 18),
                      ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.blue),
                ),
              ),
            ),
          ),
          if (_notifications.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: _buildSurfaceCard(
                padding: const EdgeInsets.all(14),
                background: const Color(0xFFF8FAFC),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          _copy('Notifications', '通知'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: _CommunityPalette.text,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: _markAllNotificationsRead,
                          child: Text(_copy('Mark all read', '全部设为已读')),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ..._notifications.take(2).map((notification) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: notification.color.withValues(
                                  alpha: 0.14,
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                notification.icon,
                                size: 16,
                                color: notification.color,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    notification.title,
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: _CommunityPalette.text,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    notification.body,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      height: 1.4,
                                      color: _CommunityPalette.subtext,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (notification.unread)
                              Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.only(top: 4),
                                decoration: const BoxDecoration(
                                  color: _CommunityPalette.red,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          Expanded(
            child: conversations.isEmpty
                ? Center(
                    child: Text(
                      _t.communityNoConversationFound,
                      style: const TextStyle(
                        color: _CommunityPalette.subtext,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: conversations.length,
                    itemBuilder: (context, index) {
                      return _buildConversationItem(
                        conversations[index],
                        isCompact: MediaQuery.sizeOf(context).width < 900,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationItem(
    _Conversation conversation, {
    required bool isCompact,
  }) {
    final selected = conversation.id == _selectedConversationId;
    return InkWell(
      onTap: () async {
        _selectConversation(conversation);
        if (isCompact) {
          await _openConversationChat(conversation);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFF5F7FF) : Colors.transparent,
          border: const Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
        ),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: conversation.accent.withValues(alpha: 0.18),
                  child: Text(
                    conversation.name[0].toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: conversation.accent,
                      fontSize: 18,
                    ),
                  ),
                ),
                if (conversation.unreadCount > 0)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 20),
                      height: 20,
                      padding: const EdgeInsets.symmetric(horizontal: 5),
                      decoration: BoxDecoration(
                        color: _CommunityPalette.red,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: Center(
                        child: Text(
                          '${conversation.unreadCount}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: _CommunityPalette.text,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (conversation.isGroup)
                        _buildTag(
                          _copy('Group', '群组'),
                          tint: conversation.accent.withValues(alpha: 0.12),
                          color: conversation.accent,
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conversation.message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      color: _CommunityPalette.subtext,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  conversation.time,
                  style: const TextStyle(
                    fontSize: 12,
                    color: _CommunityPalette.subtle,
                  ),
                ),
                const SizedBox(height: 8),
                IconButton(
                  tooltip: _t.communityDeleteChatTooltip,
                  onPressed: () => _deleteConversation(conversation),
                  icon: const Icon(
                    Icons.delete_outline_rounded,
                    size: 20,
                    color: Color(0xFFDC2626),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyMessagePanel() {
    return _buildSurfaceCard(
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.chat_bubble_outline_rounded,
              size: 40,
              color: _CommunityPalette.subtle,
            ),
            const SizedBox(height: 10),
            Text(
              _copy('Select a conversation', '请选择一个会话'),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: _CommunityPalette.text,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInlineConversationPanel(_Conversation conversation) {
    return _buildSurfaceCard(
      padding: const EdgeInsets.all(0),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: conversation.accent.withValues(alpha: 0.18),
                  child: Text(
                    conversation.name[0].toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: conversation.accent,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        conversation.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: _CommunityPalette.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        conversation.isGroup
                            ? _copy(
                                '${conversation.participantNames.length} members · shared study room',
                                '${conversation.participantNames.length} 位成员 · 共享学习房间',
                              )
                            : _copy('Direct chat', '私聊'),
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: _CommunityPalette.subtext,
                        ),
                      ),
                    ],
                  ),
                ),
                if (conversation.isGroup)
                  OutlinedButton.icon(
                    onPressed: _showAddMembersDialog,
                    icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                    label: Text(_copy('Add members', '添加成员')),
                  ),
              ],
            ),
          ),
          if (conversation.isGroup)
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: conversation.participantNames
                      .map(
                        (name) => _buildTag(
                          name,
                          tint: _CommunityPalette.surfaceMuted,
                          color: _CommunityPalette.subtext,
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              controller: _messageThreadController,
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
              itemCount: conversation.messages.length,
              itemBuilder: (context, index) {
                final message = conversation.messages[index];
                return _buildChatBubble(message: message, maxWidth: 520);
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _CommunityPalette.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageComposerController,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessageToConversation(
                      conversation,
                      _messageComposerController.text,
                    ),
                    decoration: InputDecoration(
                      hintText: _t.communityTypeMessageHint,
                      filled: true,
                      fillColor: _CommunityPalette.surfaceMuted,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: _CommunityPalette.border,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: _CommunityPalette.border,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: conversation.accent),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: () => _sendMessageToConversation(
                    conversation,
                    _messageComposerController.text,
                  ),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(52, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble({
    required _ChatMessage message,
    required double maxWidth,
  }) {
    return Align(
      alignment: message.isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: maxWidth),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: message.isMine
              ? _CommunityPalette.text
              : _CommunityPalette.surfaceMuted,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: message.isMine
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              message.text,
              style: TextStyle(
                color: message.isMine ? Colors.white : _CommunityPalette.text,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.sentAtLabel,
              style: TextStyle(
                color: message.isMine
                    ? Colors.white70
                    : _CommunityPalette.subtle,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendingPage({required bool isWideLayout}) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        isWideLayout ? 24 : 18,
        18,
        isWideLayout ? 24 : 18,
        24,
      ),
      child: isWideLayout
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 7,
                  child: Column(
                    children: [
                      _buildTrendingDiscussionsPanel(isWideLayout: true),
                      const SizedBox(height: 16),
                      _buildTrendingGroupsPanel(),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                SizedBox(
                  width: 300,
                  child: Column(
                    children: [
                      _buildLiveSessionCard(),
                      const SizedBox(height: 16),
                      _buildTrendingHashtagsCard(),
                      const SizedBox(height: 16),
                      _buildPeopleToFollowCard(),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              children: [
                _buildTrendingDiscussionsPanel(isWideLayout: false),
                const SizedBox(height: 16),
                _buildTrendingGroupsPanel(),
                const SizedBox(height: 16),
                _buildLiveSessionCard(),
                const SizedBox(height: 16),
                _buildTrendingHashtagsCard(),
                const SizedBox(height: 16),
                _buildPeopleToFollowCard(),
              ],
            ),
    );
  }

  Widget _buildTrendingDiscussionsPanel({required bool isWideLayout}) {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _copy('Trending Discussions', '热门讨论'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {},
                child: Text(_copy('See More', '查看更多')),
              ),
            ],
          ),
          const SizedBox(height: 16),
          isWideLayout
              ? Row(
                  children: _trendingDiscussions.take(2).map((discussion) {
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                          right: discussion == _trendingDiscussions.first
                              ? 14
                              : 0,
                        ),
                        child: _buildDiscussionCard(discussion),
                      ),
                    );
                  }).toList(),
                )
              : Column(
                  children: _trendingDiscussions
                      .map(
                        (discussion) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _buildDiscussionCard(discussion),
                        ),
                      )
                      .toList(),
                ),
        ],
      ),
    );
  }

  Widget _buildDiscussionCard(_TrendingDiscussion discussion) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _CommunityPalette.surfaceMuted,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: discussion.accent.withValues(alpha: 0.16),
                child: Text(
                  discussion.author[0].toUpperCase(),
                  style: TextStyle(
                    color: discussion.accent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  discussion.author,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: _CommunityPalette.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            discussion.title,
            style: const TextStyle(
              fontSize: 17,
              height: 1.35,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(
                Icons.chat_bubble_outline_rounded,
                size: 16,
                color: _CommunityPalette.subtle,
              ),
              const SizedBox(width: 6),
              Text(
                _copy(
                  '${discussion.replies} replies',
                  '${discussion.replies} 条回复',
                ),
                style: const TextStyle(
                  fontSize: 12.5,
                  color: _CommunityPalette.subtext,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: discussion.tags
                .map(
                  (tag) => _buildTag(
                    tag,
                    tint: discussion.accent.withValues(alpha: 0.12),
                    color: discussion.accent,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingGroupsPanel() {
    final groups = _studyRooms;
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _copy('Peer Groups', '热门共学小组'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {},
                child: Text(_copy('See More', '查看更多')),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...groups.map(
            (room) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _buildTrendingGroupCard(room),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingGroupCard(_StudyRoom room) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _CommunityPalette.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Row(
        children: [
          Container(
            width: 140,
            height: 108,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [
                  room.accent.withValues(alpha: 0.45),
                  room.accent.withValues(alpha: 0.12),
                ],
              ),
            ),
            child: Icon(Icons.groups_2_rounded, size: 42, color: room.accent),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  room.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: _CommunityPalette.text,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  room.subtitle,
                  style: const TextStyle(
                    fontSize: 13.5,
                    height: 1.5,
                    color: _CommunityPalette.subtext,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.groups_rounded,
                      size: 16,
                      color: _CommunityPalette.subtle,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _copy(
                        '${room.members.length + (room.joined ? 0 : 2)} members',
                        '${room.members.length + (room.joined ? 0 : 2)} 位成员',
                      ),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: _CommunityPalette.subtext,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          FilledButton(
            onPressed: room.joined ? null : () => _joinStudyRoom(room),
            style: FilledButton.styleFrom(
              backgroundColor: room.joined
                  ? const Color(0xFFCBD5E1)
                  : room.accent,
            ),
            child: Text(
              room.joined
                  ? _copy('Joined', '已加入')
                  : _copy('Join Group', '加入小组'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveSessionCard() {
    return _buildSurfaceCard(
      background: const Color(0xFF5B5CEB),
      borderSide: const BorderSide(color: Color(0xFF7777FF)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy(
              'Live Session This Friday:\n“Designing for Impact”',
              '本周五直播：\n“Designing for Impact”',
            ),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            _copy(
              'May 24 · 6 PM (GMT)\nJoin our expert-led workshop on creating meaningful user experiences.',
              '5 月 24 日 · 晚上 6 点 (GMT)\n加入由专家主讲的工坊，一起讨论如何设计更有影响力的用户体验。',
            ),
            style: const TextStyle(
              fontSize: 13.5,
              height: 1.5,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {},
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _CommunityPalette.blue,
              ),
              child: Text(_copy('Save Your Seat', '预留席位')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingHashtagsCard() {
    final tags = [
      _copy('LearningStreak', '学习连击'),
      _copy('BuiltWithCode', '代码搭建'),
      _copy('DesignInspo', '设计灵感'),
      _copy('AskTheCommunity', '问问社区'),
      _copy('ChallengeAccepted', '挑战接受'),
      _copy('CareerSwitch', '职业转换'),
      _copy('StudySetup', '学习配置'),
      _copy('MyFirstCourse', '我的第一门课'),
      _copy('DailyWin', '今日小胜利'),
      _copy('1D1Course', '一日一课'),
    ];
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy('Trending Hashtags', '热门话题标签'),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: tags
                .map(
                  (tag) => _buildTag(
                    tag,
                    tint:
                        _newUserColors[tags.indexOf(tag) %
                                _newUserColors.length]
                            .withValues(alpha: 0.12),
                    color:
                        _newUserColors[tags.indexOf(tag) %
                            _newUserColors.length],
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildPeopleToFollowCard() {
    return _buildSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy('People to Follow', '值得关注的人'),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: _CommunityPalette.text,
            ),
          ),
          const SizedBox(height: 16),
          ..._peopleToFollow.map(
            (person) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: person.color.withValues(alpha: 0.18),
                    child: Text(
                      person.name[0].toUpperCase(),
                      style: TextStyle(
                        color: person.color,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          person.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: _CommunityPalette.text,
                          ),
                        ),
                        Text(
                          person.role,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: _CommunityPalette.subtext,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => _toggleFollowPerson(person),
                    child: Text(
                      person.following
                          ? _copy('Following', '已关注')
                          : _copy('+ Follow', '+ 关注'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTag(String label, {required Color tint, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  String _sectionLabel(_CommunityWorkspaceSection section) {
    switch (section) {
      case _CommunityWorkspaceSection.dashboard:
        return _copy('Dashboard', 'Dashboard');
      case _CommunityWorkspaceSection.ourStudy:
        return _copy('Our Study', 'Our Study');
      case _CommunityWorkspaceSection.notes:
        return _copy('Notes', 'Notes');
      case _CommunityWorkspaceSection.messages:
        return _copy('Messages', 'Messages');
      case _CommunityWorkspaceSection.trending:
        return _copy('Trending', 'Trending');
    }
  }

  String _sectionSubtitle(_CommunityWorkspaceSection section) {
    switch (section) {
      case _CommunityWorkspaceSection.dashboard:
        return _copy(
          'Keep the galaxy view, filters, and discovery actions in one home page.',
          '保留原有银河视图、筛选器和发现操作，把它们集中到一个主页里。',
        );
      case _CommunityWorkspaceSection.ourStudy:
        return _copy(
          'Shared study rooms, materials, schedules, and progress with your partner or group.',
          '把你和搭子或小组的房间、资料、时间安排与进度都集中在这里。',
        );
      case _CommunityWorkspaceSection.notes:
        return _copy(
          'Take notes, attach images, and sketch quick diagrams while you study together.',
          '在共学时直接记笔记、贴图片，并画出快速示意图。',
        );
      case _CommunityWorkspaceSection.messages:
        return _copy(
          'All chats, notifications, groups, and member management stay here.',
          '所有聊天、通知、群组和成员管理都统一放在这里。',
        );
      case _CommunityWorkspaceSection.trending:
        return _copy(
          'See what the community is discussing and join rooms that match your interests.',
          '看看社区正在讨论什么，并加入适合你兴趣的共学房间。',
        );
    }
  }

  IconData _sectionIcon(_CommunityWorkspaceSection section) {
    switch (section) {
      case _CommunityWorkspaceSection.dashboard:
        return Icons.grid_view_rounded;
      case _CommunityWorkspaceSection.ourStudy:
        return Icons.local_library_outlined;
      case _CommunityWorkspaceSection.notes:
        return Icons.note_alt_outlined;
      case _CommunityWorkspaceSection.messages:
        return Icons.chat_bubble_outline_rounded;
      case _CommunityWorkspaceSection.trending:
        return Icons.trending_up_rounded;
    }
  }
}

class _GalaxyUser {
  final int id;
  final String name;
  final String? email;
  final double x;
  final double y;
  final Color color;
  final String size;
  final double floatDelay;

  const _GalaxyUser(
    this.id,
    this.name,
    this.x,
    this.y,
    this.color,
    this.size,
    this.floatDelay, {
    this.email,
  });
}

class _ShootingStar {
  final double startX;
  final double startY;
  final double endX;
  final double endY;
  final double launchAt;
  final double travelWindow;
  final double tailLength;
  final double headRadius;
  final Color color;

  const _ShootingStar({
    required this.startX,
    required this.startY,
    required this.endX,
    required this.endY,
    required this.launchAt,
    required this.travelWindow,
    required this.tailLength,
    required this.headRadius,
    required this.color,
  });
}

class _Conversation {
  final int id;
  final String name;
  String message;
  String time;
  int unreadCount;
  final bool isGroup;
  final int? linkedStudyRoomId;
  final List<String> participantNames;
  final Color accent;
  final List<_ChatMessage> messages;

  _Conversation({
    required this.id,
    required this.name,
    required this.message,
    required this.time,
    required this.unreadCount,
    required this.isGroup,
    required this.participantNames,
    required this.accent,
    required this.messages,
    this.linkedStudyRoomId,
  });
}

class _ChatMessage {
  final String text;
  final bool isMine;
  final String sentAtLabel;

  const _ChatMessage({
    required this.text,
    required this.isMine,
    required this.sentAtLabel,
  });
}

class _StudyRoom {
  final int id;
  final String title;
  final String subtitle;
  final String focus;
  final String schedule;
  final List<String> tags;
  final List<String> goals;
  final List<_StudyMaterial> materials;
  final List<String> members;
  final Color accent;
  double progress;
  int sessionsThisWeek;
  bool joined;
  int? linkedConversationId;

  _StudyRoom({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.focus,
    required this.schedule,
    required this.tags,
    required this.goals,
    required this.materials,
    required this.members,
    required this.accent,
    required this.progress,
    required this.sessionsThisWeek,
    required this.joined,
  });
}

class _StudyMaterial {
  final String title;
  final String type;
  final String status;

  const _StudyMaterial({
    required this.title,
    required this.type,
    required this.status,
  });
}

class _TrendingDiscussion {
  final String author;
  final String title;
  final int replies;
  final List<String> tags;
  final Color accent;

  const _TrendingDiscussion({
    required this.author,
    required this.title,
    required this.replies,
    required this.tags,
    required this.accent,
  });
}

class _CommunityPerson {
  final String name;
  final String role;
  final Color color;
  bool following = false;

  _CommunityPerson({
    required this.name,
    required this.role,
    required this.color,
  });
}

class _CommunityNotification {
  final int id;
  final String title;
  final String body;
  final String timeLabel;
  final IconData icon;
  final Color color;
  bool unread;

  _CommunityNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.timeLabel,
    required this.icon,
    required this.color,
    required this.unread,
  });
}

class _CommunityNote {
  final int id;
  String title;
  String body;
  final List<_NoteAttachment> attachments;
  final List<_SketchStroke> strokes;
  DateTime updatedAt;

  _CommunityNote({
    required this.id,
    required this.title,
    required this.body,
    required this.attachments,
    required this.strokes,
    required this.updatedAt,
  });
}

class _NoteAttachment {
  final String label;
  final String caption;
  final Color tint;

  const _NoteAttachment({
    required this.label,
    required this.caption,
    required this.tint,
  });
}

class _SketchStroke {
  final List<Offset> points;
  final Color color;
  final double width;

  const _SketchStroke({
    required this.points,
    required this.color,
    required this.width,
  });
}

class _AddUserInput {
  final String identifier;
  final String category;

  const _AddUserInput(this.identifier, this.category);
}

class _NewStudyGroupDraft {
  final String name;
  final String focus;
  final String schedule;
  final String category;

  const _NewStudyGroupDraft(
    this.name,
    this.focus,
    this.schedule,
    this.category,
  );
}

class _AttachmentDraft {
  final String title;
  final String caption;

  const _AttachmentDraft(this.title, this.caption);
}

class _SketchPadPainter extends CustomPainter {
  final List<_SketchStroke> strokes;

  const _SketchPadPainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    for (final stroke in strokes) {
      if (stroke.points.isEmpty) continue;
      final paint = Paint()
        ..color = stroke.color
        ..strokeWidth = stroke.width
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;

      if (stroke.points.length == 1) {
        canvas.drawCircle(stroke.points.first, stroke.width / 2, paint);
        continue;
      }

      final path = Path()
        ..moveTo(stroke.points.first.dx, stroke.points.first.dy);
      for (final point in stroke.points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SketchPadPainter oldDelegate) {
    return oldDelegate.strokes != strokes;
  }
}

class _GalaxyShootingStarsPainter extends CustomPainter {
  final List<_ShootingStar> stars;
  final double progress;

  const _GalaxyShootingStarsPainter({
    required this.stars,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final star in stars) {
      final localProgress = (progress - star.launchAt) / star.travelWindow;
      if (localProgress <= 0 || localProgress >= 1) continue;

      final easedProgress = Curves.easeOut.transform(localProgress);
      final opacity = math.sin(localProgress * math.pi).clamp(0.0, 1.0);
      if (opacity <= 0.01) continue;

      final start = Offset(star.startX * size.width, star.startY * size.height);
      final end = Offset(star.endX * size.width, star.endY * size.height);
      final head = Offset.lerp(start, end, easedProgress)!;
      final direction = end - start;
      final distance = direction.distance;
      if (distance == 0) continue;

      final unitDirection = direction / distance;
      final tail = head - unitDirection * star.tailLength;

      final glowPaint = Paint()
        ..color = star.color.withValues(alpha: 0.16 * opacity)
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7);

      final tailPaint = Paint()
        ..shader = LinearGradient(
          colors: [
            star.color.withValues(alpha: 0),
            star.color.withValues(alpha: 0.78 * opacity),
          ],
        ).createShader(Rect.fromPoints(tail, head))
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round;

      final headGlowPaint = Paint()
        ..color = star.color.withValues(alpha: 0.26 * opacity)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);

      final headPaint = Paint()
        ..color = star.color.withValues(alpha: 0.96 * opacity);

      canvas.drawLine(tail, head, glowPaint);
      canvas.drawLine(tail, head, tailPaint);
      canvas.drawCircle(head, star.headRadius * 2.4, headGlowPaint);
      canvas.drawCircle(head, star.headRadius, headPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GalaxyShootingStarsPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.stars != stars;
  }
}

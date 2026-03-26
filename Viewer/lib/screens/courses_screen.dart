import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../components/common/viewer_page_shell.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../services/image_picker_service.dart' as image_picker_service;

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

enum _MessagesActionButton { newItem, call, search, more, attach, mic }

enum _SketchTool { pencil, brush, eraser }

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
  late final AnimationController _planetSpinController;
  late final AnimationController _shootingStarController;

  _CommunityWorkspaceSection _section = _CommunityWorkspaceSection.dashboard;
  String _messageQuery = '';
  String _studyQuery = '';
  String _selectedCategory = 'All';
  int? _hoveredUserId;
  int? _selectedConversationId;
  int? _selectedNoteId;
  _MessagesActionButton? _activeMessagesAction;
  int _nextUserId = 1;
  int _nextConversationId = 1;
  int _nextStudyRoomId = 1;
  int _nextNotificationId = 1;
  int _nextNoteId = 1;
  int? _activeSketchPointerId;
  Color _selectedInkColor = _CommunityPalette.blue;
  double _selectedInkWidth = 3.0;
  _SketchTool _selectedSketchTool = _SketchTool.pencil;

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

  static const _studyAccentPool = [
    Color(0xFF5B6CFF),
    Color(0xFF6366F1),
    Color(0xFF7C3AED),
    Color(0xFF8B5CF6),
    Color(0xFF3B82F6),
    Color(0xFF2563EB),
  ];

  static const _communityCategories = [
    'Finance',
    'Technology',
    'Mathematics',
    'Engineering',
    'Science',
    'Multilingual',
  ];

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
    _planetSpinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 22000),
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
    _messageSearchController.dispose();
    _messageComposerController.dispose();
    _studySearchController.dispose();
    _noteTitleController.dispose();
    _noteBodyController.dispose();
    _messageThreadController.dispose();
    _floatController.dispose();
    _planetSpinController.dispose();
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
        accent: const Color(0xFF6366F1),
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
        accent: const Color(0xFF3B82F6),
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
        accent: const Color(0xFF4F46E5),
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
        title: '',
        body: '',
        attachments: <_NoteAttachment>[],
        strokes: <_SketchStroke>[],
        updatedAt: DateTime.now().subtract(const Duration(minutes: 3)),
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
    return List<int>.generate(_galaxyUsers.length, (index) => index);
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
    note.title = _noteTitleController.text.trim();
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

  void _createNewNote() {
    _syncSelectedNoteFromControllers();
    final note = _CommunityNote(
      id: _nextNoteId++,
      title: '',
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

  void _selectNoteForEditing(int noteId) {
    _syncSelectedNoteFromControllers();
    setState(() {
      _selectedNoteId = noteId;
      _loadSelectedNoteIntoControllers();
    });
  }

  Future<void> _copyNoteContent(_CommunityNote note) async {
    if (note.id == _selectedNoteId) {
      _syncSelectedNoteFromControllers();
    }
    final title = note.title.trim();
    final body = note.body.trim();
    final composed = [
      if (title.isNotEmpty) title,
      if (body.isNotEmpty) body,
    ].join('\n\n');

    if (composed.isEmpty) {
      _showMessageSnack(_copy('Nothing to copy yet.', '暂时没有可复制的内容。'));
      return;
    }

    await Clipboard.setData(ClipboardData(text: composed));
    if (!mounted) return;
    _showMessageSnack(_copy('Note copied.', '笔记已复制。'));
  }

  void _deleteNote(_CommunityNote note) {
    final selectedId = _selectedNoteId;
    _syncSelectedNoteFromControllers();

    final remainingNotes = _notes.where((item) => item.id != note.id).toList();
    final replacementNote = remainingNotes.isNotEmpty
        ? remainingNotes.first
        : _CommunityNote(
            id: _nextNoteId++,
            title: '',
            body: '',
            attachments: <_NoteAttachment>[],
            strokes: <_SketchStroke>[],
            updatedAt: DateTime.now(),
          );

    setState(() {
      _notes
        ..clear()
        ..addAll(
          remainingNotes.isNotEmpty ? remainingNotes : [replacementNote],
        );
      if (selectedId == note.id || _selectedNoteId == null) {
        _selectedNoteId = replacementNote.id;
        _loadSelectedNoteIntoControllers();
      }
    });

    _showMessageSnack(_copy('Note deleted.', '笔记已删除。'));
  }

  Future<void> _pickNoteAttachmentImage() async {
    final note = _selectedNote;
    if (note == null) return;
    final picked = await image_picker_service.pickImageFileBytes();
    if (!mounted || picked.cancelled) return;
    if (!picked.success || picked.bytes == null) {
      _showMessageSnack(
        _copy('Could not upload that image right now.', '现在暂时无法上传这张图片。'),
      );
      return;
    }

    final label = (picked.fileName ?? '').trim().isEmpty
        ? _copy('Uploaded image', '已上传图片')
        : picked.fileName!.trim();
    setState(() {
      note.attachments.add(
        _NoteAttachment(
          label: label,
          caption: _copy('Uploaded to your shared assets board.', '已上传到共享素材区。'),
          tint: _newUserColors[_rng.nextInt(_newUserColors.length)].withValues(
            alpha: 0.14,
          ),
          bytes: picked.bytes,
        ),
      );
      note.updatedAt = DateTime.now();
    });
    _showMessageSnack(_copy('Image added to assets.', '图片已加入素材区。'));
  }

  void _clearSelectedNoteAssets() {
    final note = _selectedNote;
    if (note == null || note.attachments.isEmpty) return;
    setState(() {
      note.attachments.clear();
      note.updatedAt = DateTime.now();
    });
    _showMessageSnack(_copy('Assets cleared.', '素材已清空。'));
  }

  void _editSelectedNoteAssets() {
    _showMessageSnack(_copy('Asset editing is coming next.', '素材编辑功能即将推出。'));
  }

  void _clearSelectedSketch() {
    final note = _selectedNote;
    if (note == null) return;
    setState(() {
      note.strokes.clear();
      note.updatedAt = DateTime.now();
    });
  }

  void _undoSelectedSketch() {
    final note = _selectedNote;
    if (note == null || note.strokes.isEmpty) return;
    setState(() {
      note.strokes.removeLast();
      note.updatedAt = DateTime.now();
    });
  }

  void _deleteSelectedSketch() {
    final note = _selectedNote;
    if (note == null) return;
    setState(() {
      note.strokes.clear();
      note.updatedAt = DateTime.now();
    });
    _showMessageSnack(_copy('Sketch deleted.', '草图已删除。'));
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
          tool: _selectedSketchTool,
        ),
      );
      note.updatedAt = DateTime.now();
    });
  }

  void _endStroke() {
    _activeSketchPointerId = null;
  }

  void _appendStroke(Offset point) {
    final note = _selectedNote;
    if (note == null || note.strokes.isEmpty) return;
    setState(() {
      note.strokes.last.points.add(point);
      note.updatedAt = DateTime.now();
    });
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
      accent: _studyAccentPool[_rng.nextInt(_studyAccentPool.length)],
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
    final showWorkspaceTopBar =
        _section != _CommunityWorkspaceSection.dashboard &&
        _section != _CommunityWorkspaceSection.notes &&
        _section != _CommunityWorkspaceSection.trending &&
        !(isWideLayout && _section == _CommunityWorkspaceSection.messages);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: _CommunityPalette.panel,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _CommunityPalette.border),
      ),
      child: Column(
        children: [
          if (showWorkspaceTopBar)
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
    if (_section == _CommunityWorkspaceSection.ourStudy) {
      return _buildOurStudyTopBar(isWideLayout: isWideLayout);
    }
    final actions = _buildTopBarActions(isWideLayout);
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
          if (actions.isNotEmpty) ...[
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
                    children: actions,
                  ),
                ),
              )
            else
              Flexible(
                child: Wrap(
                  alignment: WrapAlignment.end,
                  spacing: 10,
                  runSpacing: 10,
                  children: actions,
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildOurStudyTopBar({required bool isWideLayout}) {
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
        children: [
          if (isWideLayout)
            SizedBox(width: 350, child: _buildStudySearchField())
          else
            Expanded(child: _buildStudySearchField()),
          if (isWideLayout) const Spacer() else const SizedBox(width: 12),
          _buildNewGroupButton(),
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
            width: isWideLayout ? 350 : 280,
            child: _buildStudySearchField(),
          ),
          _buildNewGroupButton(),
        ];
      case _CommunityWorkspaceSection.notes:
        return const [];
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
            style: FilledButton.styleFrom(
              backgroundColor: _CommunityPalette.blue,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.mark_chat_unread_rounded, size: 18),
            label: Text(_copy('Open messages', '打开消息')),
          ),
        ];
    }
  }

  Widget _buildStudySearchField() {
    return TextField(
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
    );
  }

  Widget _buildNewGroupButton() {
    return FilledButton.icon(
      onPressed: _showCreateStudyGroupDialog,
      style: FilledButton.styleFrom(
        backgroundColor: _CommunityPalette.blue,
        foregroundColor: Colors.white,
      ),
      icon: const Icon(Icons.group_add_rounded, size: 18),
      label: Text(_copy('New group', '新建群组')),
    );
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
    final minHeight = isWideLayout ? 700.0 : 560.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        final galaxyHeight = math.max(minHeight, constraints.maxHeight);
        return SingleChildScrollView(
          padding: EdgeInsets.zero,
          child: SizedBox(
            height: galaxyHeight,
            child: _buildGalaxyExplorer(
              height: galaxyHeight,
              isWideLayout: isWideLayout,
            ),
          ),
        );
      },
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

  Widget _buildGalaxyExplorer({
    required double height,
    required bool isWideLayout,
  }) {
    final t = context.watch<LanguageProvider>().t;
    final visibleUserIndexes = _visibleGalaxyUserIndexes;
    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: SizedBox(
        height: height,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFE6FBFF), Color(0xFFF6ECFF), Color(0xFFF8FAFF)],
            ),
          ),
          child: Column(
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 14),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final planetRadius = math
                          .min(
                            constraints.maxWidth * 0.22,
                            constraints.maxHeight * 0.34,
                          )
                          .clamp(140.0, 230.0)
                          .toDouble();
                      final planetCenter = Offset(
                        constraints.maxWidth * 0.5,
                        constraints.maxHeight * 0.54,
                      );
                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Positioned.fill(
                            child: IgnorePointer(
                              child: AnimatedBuilder(
                                animation: Listenable.merge([
                                  _planetSpinController,
                                  _shootingStarController,
                                ]),
                                builder: (context, child) {
                                  return CustomPaint(
                                    painter: _GalaxyPlanetScenePainter(
                                      planetCenter: planetCenter,
                                      planetRadius: planetRadius,
                                      spinProgress: _planetSpinController.value,
                                      twinkleProgress:
                                          _shootingStarController.value,
                                      sparkleSeeds: _shootingStars,
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
                                  color: Color(0xFF64748B),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                          else
                            for (final entry
                                in visibleUserIndexes.asMap().entries)
                              _buildPlanet(
                                _galaxyUsers[entry.value],
                                constraints,
                                t,
                                slotIndex: entry.key,
                                totalUsers: visibleUserIndexes.length,
                                planetCenter: planetCenter,
                                planetRadius: planetRadius,
                              ),
                          Positioned(
                            top: isWideLayout ? 22 : 18,
                            left: isWideLayout ? 22 : 18,
                            child: Wrap(
                              spacing: 14,
                              runSpacing: 10,
                              children: [
                                _buildIconAction(
                                  icon: Icons.person_remove_outlined,
                                  onTap: _showRemoveUserDialog,
                                ),
                                _buildIconAction(
                                  icon: Icons.person_add_outlined,
                                  onTap: _showAddUserDialog,
                                ),
                              ],
                            ),
                          ),
                          Positioned(
                            top: isWideLayout ? 22 : 18,
                            right: isWideLayout ? 22 : 18,
                            child: _buildConnectionStats(),
                          ),
                        ],
                      );
                    },
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
    AppLocalizations t, {
    required int slotIndex,
    required int totalUsers,
    required Offset planetCenter,
    required double planetRadius,
  }) {
    final dotSize = _planetSize(user.size);
    final isHovered = _hoveredUserId == user.id;
    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        final motionOffset = _planetMotionOffset(user, _floatController.value);
        final anchor = _planetOrbitAnchor(
          user,
          constraints,
          slotIndex: slotIndex,
          totalUsers: totalUsers,
          planetCenter: planetCenter,
          planetRadius: planetRadius,
        );
        return Positioned(
          left: anchor.dx - 20 + motionOffset.dx,
          top: anchor.dy - 20 + motionOffset.dy,
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
                  fontSize: 9.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF475569),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Offset _planetOrbitAnchor(
    _GalaxyUser user,
    BoxConstraints constraints, {
    required int slotIndex,
    required int totalUsers,
    required Offset planetCenter,
    required double planetRadius,
  }) {
    final total = math.max(totalUsers, 1);
    final layer = slotIndex % 3;
    final angle =
        (-math.pi / 2) +
        (slotIndex / total) * math.pi * 2 +
        user.floatDelay * 0.14 +
        layer * 0.18;

    final radiusX = switch (layer) {
      0 => planetRadius * 1.24,
      1 => planetRadius * 1.52,
      _ => planetRadius * 1.78,
    };
    final radiusY = switch (layer) {
      0 => planetRadius * 0.90,
      1 => planetRadius * 1.10,
      _ => planetRadius * 1.26,
    };

    final xJitter = ((user.x - 50) / 50) * 10;
    final yJitter = ((user.y - 50) / 50) * 12;
    final x = planetCenter.dx + math.cos(angle) * radiusX + xJitter;
    final y = planetCenter.dy + math.sin(angle) * radiusY + yJitter;

    return Offset(
      x.clamp(22.0, constraints.maxWidth - 22.0),
      y.clamp(22.0, constraints.maxHeight - 22.0),
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
      child: Column(
        children: [
          if (rooms.isEmpty)
            _buildEmptyStudyCard()
          else
            ...rooms.map(
              (room) => Padding(
                padding: EdgeInsets.only(bottom: isWideLayout ? 16 : 14),
                child: _buildStudyRoomCard(room),
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
            style: FilledButton.styleFrom(
              backgroundColor: _CommunityPalette.blue,
              foregroundColor: Colors.white,
            ),
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
                  FilledButton(
                    onPressed: room.linkedConversationId == null
                        ? null
                        : () {
                            setState(() {
                              _section = _CommunityWorkspaceSection.messages;
                              _selectedConversationId =
                                  room.linkedConversationId;
                            });
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: room.accent,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: room.accent.withValues(
                        alpha: 0.24,
                      ),
                      disabledForegroundColor: Colors.white.withValues(
                        alpha: 0.78,
                      ),
                    ),
                    child: Text(_copy('Open chat', '打开聊天')),
                  ),
                  OutlinedButton(
                    onPressed: () => _leaveStudyRoom(room),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: room.accent,
                      side: BorderSide(
                        color: room.accent.withValues(alpha: 0.56),
                        width: 1.5,
                      ),
                    ),
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
        ..._notes.map(
          (note) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _buildNoteSection(note),
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
                  _buildNoteActionIcon(
                    icon: Icons.add_rounded,
                    tooltip: _copy('Add asset', '添加素材'),
                    onTap: _pickNoteAttachmentImage,
                    color: _CommunityPalette.blue,
                  ),
                  const SizedBox(width: 8),
                  _buildNoteActionIcon(
                    icon: Icons.edit_outlined,
                    tooltip: _copy('Edit assets', '编辑素材'),
                    onTap: _editSelectedNoteAssets,
                    color: _CommunityPalette.blue,
                  ),
                  const SizedBox(width: 8),
                  _buildNoteActionIcon(
                    icon: Icons.delete_outline_rounded,
                    tooltip: _copy('Delete assets', '删除素材'),
                    onTap: _clearSelectedNoteAssets,
                    color: _CommunityPalette.red,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickNoteAttachmentImage,
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FBFF),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: _CommunityPalette.blue.withValues(alpha: 0.20),
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _CommunityPalette.blue.withValues(alpha: 0.10),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.upload_rounded,
                          color: _CommunityPalette.blue,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _copy(
                          'Drag images here or click to upload',
                          '把图片拖到这里，或点击上传',
                        ),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: _CommunityPalette.text,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _copy(
                          'Add screenshots, whiteboard captures, or references directly into Assets.',
                          '把截图、白板内容或参考图直接添加到素材区。',
                        ),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: _CommunityPalette.subtext,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (selectedNote.attachments.isNotEmpty) ...[
                const SizedBox(height: 14),
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
                            clipBehavior: Clip.antiAlias,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              gradient: attachment.bytes == null
                                  ? LinearGradient(
                                      colors: [attachment.tint, Colors.white],
                                    )
                                  : null,
                            ),
                            child: attachment.bytes == null
                                ? const Icon(
                                    Icons.image_outlined,
                                    size: 34,
                                    color: _CommunityPalette.subtext,
                                  )
                                : Image.memory(
                                    attachment.bytes!,
                                    fit: BoxFit.cover,
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
      child: SingleChildScrollView(child: editor),
    );
  }

  Widget _buildNoteSection(_CommunityNote note) {
    final selected = note.id == _selectedNoteId;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
          child: Row(
            children: [
              const Spacer(),
              _buildNoteActionIcon(
                icon: Icons.add_rounded,
                tooltip: _copy('New note', '新建笔记'),
                onTap: _createNewNote,
                color: _CommunityPalette.blue,
              ),
              const SizedBox(width: 8),
              _buildNoteActionIcon(
                icon: Icons.edit_outlined,
                tooltip: _copy('Edit note', '编辑笔记'),
                onTap: () => _selectNoteForEditing(note.id),
                color: _CommunityPalette.blue,
                isActive: selected,
              ),
              const SizedBox(width: 8),
              _buildNoteActionIcon(
                icon: Icons.content_copy_rounded,
                tooltip: _copy('Copy note', '复制笔记'),
                onTap: () => _copyNoteContent(note),
                color: _CommunityPalette.subtext,
              ),
              const SizedBox(width: 8),
              _buildNoteActionIcon(
                icon: Icons.delete_outline_rounded,
                tooltip: _copy('Delete note', '删除笔记'),
                onTap: () => _deleteNote(note),
                color: _CommunityPalette.red,
              ),
            ],
          ),
        ),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            if (!selected) {
              _selectNoteForEditing(note.id);
            }
          },
          child: _buildSurfaceCard(
            padding: const EdgeInsets.fromLTRB(24, 22, 24, 22),
            child: selected
                ? _buildEditableNoteCard()
                : _buildRenderedNoteCard(note),
          ),
        ),
      ],
    );
  }

  Widget _buildEditableNoteCard() {
    final note = _selectedNote;
    final isBlank = note == null || _isNoteBlank(note);
    const fieldFill = Color(0xFFF8FBFF);
    final fieldBorder = _CommunityPalette.blue.withValues(alpha: 0.20);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _noteTitleController,
          onChanged: (_) => setState(_syncSelectedNoteFromControllers),
          keyboardType: TextInputType.text,
          textCapitalization: TextCapitalization.sentences,
          style: TextStyle(
            fontSize: isBlank ? 17 : 24,
            height: 1.2,
            fontWeight: FontWeight.w800,
            color: _CommunityPalette.text,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: fieldFill,
            contentPadding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
            hintText: _copy("What's on your mind...", '你在想些什么…'),
            hintStyle: const TextStyle(
              fontSize: 17,
              height: 1.2,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.subtle,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _noteBodyController,
          onChanged: (_) => setState(_syncSelectedNoteFromControllers),
          keyboardType: TextInputType.multiline,
          textCapitalization: TextCapitalization.sentences,
          maxLines: null,
          minLines: isBlank ? 4 : 7,
          style: const TextStyle(
            fontSize: 15.5,
            height: 1.65,
            fontWeight: FontWeight.w500,
            color: _CommunityPalette.text,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: fieldFill,
            alignLabelWithHint: true,
            contentPadding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
            hintText: _copy('Type Here... ✅🔥🙂', '在这里输入... ✅🔥🙂'),
            hintStyle: const TextStyle(
              fontSize: 13.5,
              height: 1.6,
              fontWeight: FontWeight.w500,
              color: _CommunityPalette.subtle,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(28),
              borderSide: BorderSide(color: fieldBorder, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRenderedNoteCard(_CommunityNote note) {
    final title = note.title.trim();
    final body = note.body.trim();
    final isBlank = _isNoteBlank(note);

    if (isBlank) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _copy("What's on your mind...", '你在想些什么…'),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: _CommunityPalette.subtle,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _copy('Type Here...', '在这里输入...'),
            style: const TextStyle(
              fontSize: 13.5,
              color: _CommunityPalette.subtle,
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.isEmpty ? _copy('Untitled note', '未命名笔记') : title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: _CommunityPalette.text,
          ),
        ),
        const SizedBox(height: 12),
        SelectableText(
          body,
          style: const TextStyle(
            fontSize: 15,
            height: 1.65,
            fontWeight: FontWeight.w500,
            color: _CommunityPalette.text,
          ),
        ),
      ],
    );
  }

  Widget _buildNoteActionIcon({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    required Color color,
    bool isActive = false,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: isActive ? color.withValues(alpha: 0.10) : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: isActive
                  ? color.withValues(alpha: 0.28)
                  : _CommunityPalette.border,
            ),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }

  bool _isNoteBlank(_CommunityNote note) {
    return note.title.trim().isEmpty && note.body.trim().isEmpty;
  }

  Widget _buildSketchPadCard(_CommunityNote note) {
    final pixelLabel = '${_selectedInkWidth.round()}px';
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
              _buildNoteActionIcon(
                icon: Icons.undo_rounded,
                tooltip: _copy('Undo stroke', '撤销笔画'),
                onTap: _undoSelectedSketch,
                color: _CommunityPalette.blue,
              ),
              const SizedBox(width: 8),
              _buildNoteActionIcon(
                icon: Icons.layers_clear_rounded,
                tooltip: _copy('Clear sketch', '清除草图'),
                onTap: _clearSelectedSketch,
                color: _CommunityPalette.blue,
              ),
              const SizedBox(width: 8),
              _buildNoteActionIcon(
                icon: Icons.delete_outline_rounded,
                tooltip: _copy('Delete sketch', '删除草图'),
                onTap: _deleteSelectedSketch,
                color: _CommunityPalette.red,
              ),
            ],
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 860;
              final palette = Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _inkPalette.map((color) {
                  final selected = color == _selectedInkColor;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedInkColor = color),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      width: selected ? 28 : 22,
                      height: selected ? 28 : 22,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? Colors.black : Colors.white,
                          width: selected ? 2.5 : 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.18),
                            blurRadius: selected ? 10 : 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );

              final toolsAndSize = Row(
                children: [
                  _buildSketchToolButton(
                    tool: _SketchTool.pencil,
                    icon: Icons.edit_rounded,
                    tooltip: _copy('Pencil', '铅笔'),
                  ),
                  const SizedBox(width: 8),
                  _buildSketchToolButton(
                    tool: _SketchTool.brush,
                    icon: Icons.brush_rounded,
                    tooltip: _copy('Brush', '画笔'),
                  ),
                  const SizedBox(width: 8),
                  _buildSketchToolButton(
                    tool: _SketchTool.eraser,
                    icon: Icons.auto_fix_off_rounded,
                    tooltip: _copy('Eraser', '橡皮擦'),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 8,
                        activeTrackColor: _CommunityPalette.blue,
                        inactiveTrackColor: _CommunityPalette.blue.withValues(
                          alpha: 0.12,
                        ),
                        thumbColor: Colors.white,
                        overlayColor: _CommunityPalette.blue.withValues(
                          alpha: 0.12,
                        ),
                        thumbShape: const RoundSliderThumbShape(
                          enabledThumbRadius: 11,
                        ),
                        overlayShape: const RoundSliderOverlayShape(
                          overlayRadius: 20,
                        ),
                      ),
                      child: Slider(
                        value: _selectedInkWidth.clamp(1.0, 100.0),
                        min: 1,
                        max: 100,
                        divisions: 99,
                        label: pixelLabel,
                        onChanged: (value) {
                          setState(() => _selectedInkWidth = value);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 52,
                    child: Text(
                      pixelLabel,
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _CommunityPalette.text,
                      ),
                    ),
                  ),
                ],
              );

              if (compact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [palette, const SizedBox(height: 14), toolsAndSize],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: palette),
                  const SizedBox(width: 18),
                  SizedBox(width: 420, child: toolsAndSize),
                ],
              );
            },
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: MouseRegion(
              cursor: SystemMouseCursors.precise,
              child: Listener(
                behavior: HitTestBehavior.opaque,
                onPointerDown: (event) {
                  _activeSketchPointerId = event.pointer;
                  _startStroke(event.localPosition);
                },
                onPointerMove: (event) {
                  if (_activeSketchPointerId != event.pointer) return;
                  _appendStroke(event.localPosition);
                },
                onPointerUp: (_) => _endStroke(),
                onPointerCancel: (_) => _endStroke(),
                child: Container(
                  height: 300,
                  width: double.infinity,
                  color: const Color(0xFFF8FBFF),
                  child: CustomPaint(painter: _SketchPadPainter(note.strokes)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSketchToolButton({
    required _SketchTool tool,
    required IconData icon,
    required String tooltip,
  }) {
    final selected = _selectedSketchTool == tool;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: () => setState(() => _selectedSketchTool = tool),
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: selected
                ? _CommunityPalette.blue.withValues(alpha: 0.10)
                : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected
                  ? _CommunityPalette.blue.withValues(alpha: 0.28)
                  : _CommunityPalette.border,
            ),
          ),
          child: Icon(
            icon,
            size: 19,
            color: selected
                ? _CommunityPalette.blue
                : _CommunityPalette.subtext,
          ),
        ),
      ),
    );
  }

  Widget _buildMessagesPage({required bool isWideLayout}) {
    final visibleConversations = _visibleConversations;
    final selectedConversation = _selectedConversation;

    if (isWideLayout) {
      return Row(
        children: [
          SizedBox(
            width: 320,
            child: _buildDesktopMessagesListPanel(visibleConversations),
          ),
          const VerticalDivider(
            width: 1,
            thickness: 1,
            color: Color(0xFFE2E8F0),
          ),
          Expanded(
            child: selectedConversation == null
                ? _buildDesktopEmptyMessagePanel()
                : _buildDesktopConversationPanel(selectedConversation),
          ),
        ],
      );
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(18, 18, 18, 24),
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

  void _setActiveMessagesAction(_MessagesActionButton? action) {
    if (_activeMessagesAction == action) return;
    setState(() => _activeMessagesAction = action);
  }

  void _handleMessagesListMenuSelection(String value) {
    switch (value) {
      case 'new_chat':
        _showStartDirectChatDialog();
      case 'new_group':
        _showCreateStudyGroupDialog();
    }
  }

  void _handleConversationMenuSelection(
    String value,
    _Conversation conversation,
  ) {
    switch (value) {
      case 'add_members':
        _showAddMembersDialog();
      case 'delete_chat':
        _deleteConversation(conversation);
    }
  }

  void _handleConversationCall(_Conversation conversation) {
    _setActiveMessagesAction(_MessagesActionButton.call);
    if (conversation.isGroup) {
      _showMessageSnack(_copy('Group calls are coming soon.', '群组通话功能即将上线。'));
      return;
    }

    final user = _galaxyUsers.cast<_GalaxyUser?>().firstWhere(
      (item) => item?.name == conversation.name,
      orElse: () => null,
    );
    if (user == null) {
      _showMessageSnack(
        _copy('Calling ${conversation.name}', '正在呼叫 ${conversation.name}'),
      );
      return;
    }
    _callUser(user);
  }

  void _toggleConversationSearchState() {
    final nextAction = _activeMessagesAction == _MessagesActionButton.search
        ? null
        : _MessagesActionButton.search;
    _setActiveMessagesAction(nextAction);
    if (nextAction != null) {
      _showMessageSnack(
        _copy('In-chat search tools are next.', '聊天内搜索功能接下来会继续补上。'),
      );
    }
  }

  void _handleMessageAttachmentAction() {
    _setActiveMessagesAction(_MessagesActionButton.attach);
    _showMessageSnack(
      _copy('Message attachments are coming next.', '消息附件功能接下来会继续补上。'),
    );
  }

  void _handleVoiceMessageAction() {
    _setActiveMessagesAction(_MessagesActionButton.mic);
    _showMessageSnack(_copy('Voice messages are coming soon.', '语音消息功能即将上线。'));
  }

  String _conversationPresenceLabel(_Conversation conversation) {
    if (conversation.isGroup) {
      return _copy(
        '${conversation.participantNames.length} members active',
        '${conversation.participantNames.length} 位成员在线',
      );
    }
    return _copy('Last seen recently', '最近在线');
  }

  Widget _buildDesktopMessagesListPanel(List<_Conversation> conversations) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                const SizedBox(width: 42),
                Expanded(
                  child: Center(
                    child: Text(
                      _copy('Chats', '聊天'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: _CommunityPalette.text,
                      ),
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: _copy('Create', '创建'),
                  padding: EdgeInsets.zero,
                  onOpened: () =>
                      _setActiveMessagesAction(_MessagesActionButton.newItem),
                  onCanceled: () => _setActiveMessagesAction(null),
                  onSelected: (value) {
                    _setActiveMessagesAction(null);
                    _handleMessagesListMenuSelection(value);
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'new_chat',
                      child: Text(_copy('New chat', '新聊天')),
                    ),
                    PopupMenuItem<String>(
                      value: 'new_group',
                      child: Text(_copy('New group', '新群组')),
                    ),
                  ],
                  child: _buildMessagesActionButton(
                    icon: Icons.add_circle_outline_rounded,
                    action: _MessagesActionButton.newItem,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _messageSearchController,
              onChanged: (value) => setState(() => _messageQuery = value),
              decoration: InputDecoration(
                hintText: _copy('Search', '搜索'),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
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
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: _CommunityPalette.blue),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          Expanded(
            child: conversations.isEmpty
                ? Center(
                    child: Text(
                      _copy('No chats found', '没有找到聊天'),
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
                      return _buildDesktopConversationListItem(
                        conversations[index],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopConversationListItem(_Conversation conversation) {
    final selected = conversation.id == _selectedConversationId;
    final previewStatusColor = selected
        ? Colors.white70
        : _CommunityPalette.subtle;
    final previewTextColor = selected
        ? Colors.white.withValues(alpha: 0.88)
        : _CommunityPalette.subtext;
    return InkWell(
      onTap: () => _selectConversation(conversation),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(
                  colors: [Color(0xFF5967F6), Color(0xFF6874FF)],
                )
              : null,
          color: selected ? null : Colors.white,
          border: selected
              ? null
              : const Border(bottom: BorderSide(color: Color(0xFFE8EDF5))),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: selected
                  ? Colors.white
                  : conversation.accent.withValues(alpha: 0.12),
              child: Text(
                conversation.name[0].toUpperCase(),
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: selected
                      ? _CommunityPalette.text
                      : conversation.accent,
                  fontSize: 17,
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : _CommunityPalette.text,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    conversation.message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: previewTextColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  conversation.time,
                  style: TextStyle(
                    fontSize: 11,
                    color: selected ? Colors.white70 : _CommunityPalette.subtle,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (conversation.unreadCount > 0)
                  Container(
                    constraints: const BoxConstraints(minWidth: 20),
                    height: 20,
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: selected ? Colors.white : _CommunityPalette.red,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Center(
                      child: Text(
                        '${conversation.unreadCount}',
                        style: TextStyle(
                          color: selected
                              ? _CommunityPalette.blue
                              : Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  )
                else
                  Icon(
                    conversation.isGroup
                        ? Icons.group_rounded
                        : Icons.done_all_rounded,
                    size: 16,
                    color: previewStatusColor,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopEmptyMessagePanel() {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFD8E7B7), Color(0xFFC6D9A1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        const IgnorePointer(
          child: CustomPaint(painter: _MessagesWallpaperPainter()),
        ),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.82),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.forum_outlined,
                  color: _CommunityPalette.blue,
                  size: 34,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _copy('Select a chat', '选择聊天'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: _CommunityPalette.text,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDesktopConversationPanel(_Conversation conversation) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF5967F6), Color(0xFF6574FF)],
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.white,
                child: Text(
                  conversation.name[0].toUpperCase(),
                  style: const TextStyle(
                    color: _CommunityPalette.text,
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
                      conversation.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _conversationPresenceLabel(conversation),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Colors.white.withValues(alpha: 0.82),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              _buildMessagesActionButton(
                icon: Icons.call_outlined,
                action: _MessagesActionButton.call,
                onTap: () => _handleConversationCall(conversation),
                onDark: true,
              ),
              const SizedBox(width: 8),
              _buildMessagesActionButton(
                icon: Icons.search_rounded,
                action: _MessagesActionButton.search,
                onTap: _toggleConversationSearchState,
                onDark: true,
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                tooltip: _copy('More', '更多'),
                padding: EdgeInsets.zero,
                onOpened: () =>
                    _setActiveMessagesAction(_MessagesActionButton.more),
                onCanceled: () => _setActiveMessagesAction(null),
                onSelected: (value) {
                  _setActiveMessagesAction(null);
                  _handleConversationMenuSelection(value, conversation);
                },
                itemBuilder: (context) => [
                  if (conversation.isGroup)
                    PopupMenuItem<String>(
                      value: 'add_members',
                      child: Text(_copy('Add members', '添加成员')),
                    ),
                  PopupMenuItem<String>(
                    value: 'delete_chat',
                    child: Text(_copy('Delete chat', '删除聊天')),
                  ),
                ],
                child: _buildMessagesActionButton(
                  icon: Icons.more_horiz_rounded,
                  action: _MessagesActionButton.more,
                  onDark: true,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ClipRect(
            child: Stack(
              fit: StackFit.expand,
              children: [
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Color(0xFF090D27),
                        Color(0xFF101844),
                        Color(0xFF182868),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                ),
                const IgnorePointer(
                  child: CustomPaint(painter: _MessagesWallpaperPainter()),
                ),
                ListView.builder(
                  controller: _messageThreadController,
                  padding: const EdgeInsets.fromLTRB(22, 18, 22, 22),
                  itemCount: conversation.messages.length,
                  itemBuilder: (context, index) {
                    return _buildDesktopChatBubble(
                      message: conversation.messages[index],
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Row(
            children: [
              _buildMessagesActionButton(
                icon: Icons.attach_file_rounded,
                action: _MessagesActionButton.attach,
                onTap: _handleMessageAttachmentAction,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _messageComposerController,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessageToConversation(
                      conversation,
                      _messageComposerController.text,
                    ),
                    decoration: InputDecoration(
                      hintText: _copy('Write a Message...', '输入消息...'),
                      hintStyle: const TextStyle(
                        color: _CommunityPalette.subtle,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _messageComposerController,
                builder: (context, value, child) {
                  final hasText = value.text.trim().isNotEmpty;
                  if (hasText) {
                    return FilledButton(
                      onPressed: () => _sendMessageToConversation(
                        conversation,
                        _messageComposerController.text,
                      ),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(52, 52),
                        backgroundColor: _CommunityPalette.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      child: const Icon(Icons.send_rounded),
                    );
                  }
                  return _buildMessagesActionButton(
                    icon: Icons.mic_none_rounded,
                    action: _MessagesActionButton.mic,
                    onTap: _handleVoiceMessageAction,
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDesktopChatBubble({required _ChatMessage message}) {
    final isMine = message.isMine;
    final bubbleColor = isMine ? const Color(0xFFDCEBFF) : Colors.white;
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 440),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isMine ? 18 : 6),
            bottomRight: Radius.circular(isMine ? 6 : 18),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x12000000),
              blurRadius: 14,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: isMine
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              message.text,
              style: const TextStyle(
                color: _CommunityPalette.text,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  message.sentAtLabel,
                  style: const TextStyle(
                    color: _CommunityPalette.subtle,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (isMine) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.done_all_rounded,
                    size: 14,
                    color: Color(0xFF38BDF8),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesActionButton({
    required IconData icon,
    required _MessagesActionButton action,
    VoidCallback? onTap,
    bool onDark = false,
  }) {
    final isActive = _activeMessagesAction == action;
    final backgroundColor = onDark
        ? isActive
              ? Colors.white.withValues(alpha: 0.22)
              : Colors.white.withValues(alpha: 0.10)
        : isActive
        ? const Color(0xFFEFF3FF)
        : const Color(0xFFF8FAFC);
    final foregroundColor = onDark
        ? Colors.white
        : isActive
        ? _CommunityPalette.blue
        : _CommunityPalette.subtext;

    final child = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: onDark
              ? Colors.white.withValues(alpha: 0.08)
              : const Color(0xFFE2E8F0),
        ),
      ),
      child: Icon(icon, color: foregroundColor, size: 20),
    );

    if (onTap == null) return child;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: child,
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
                  child: Column(children: [_buildPeopleToFollowCard()]),
                ),
              ],
            )
          : Column(
              children: [
                _buildTrendingDiscussionsPanel(isWideLayout: false),
                const SizedBox(height: 16),
                _buildTrendingGroupsPanel(),
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
                style: TextButton.styleFrom(
                  foregroundColor: _CommunityPalette.blue,
                ),
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
                style: TextButton.styleFrom(
                  foregroundColor: _CommunityPalette.blue,
                ),
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
                    style: TextButton.styleFrom(
                      foregroundColor: _CommunityPalette.blue,
                    ),
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
  final Uint8List? bytes;

  const _NoteAttachment({
    required this.label,
    required this.caption,
    required this.tint,
    this.bytes,
  });
}

class _SketchStroke {
  final List<Offset> points;
  final Color color;
  final double width;
  final _SketchTool tool;

  const _SketchStroke({
    required this.points,
    required this.color,
    required this.width,
    required this.tool,
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

class _SketchPadPainter extends CustomPainter {
  final List<_SketchStroke> strokes;

  const _SketchPadPainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.saveLayer(Offset.zero & size, Paint());
    for (final stroke in strokes) {
      if (stroke.points.isEmpty) continue;

      final strokeWidth = switch (stroke.tool) {
        _SketchTool.pencil => stroke.width,
        _SketchTool.brush => stroke.width * 1.35,
        _SketchTool.eraser => stroke.width * 1.2,
      };
      final paint = Paint()
        ..color = stroke.tool == _SketchTool.brush
            ? stroke.color.withValues(alpha: 0.55)
            : stroke.color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..blendMode = stroke.tool == _SketchTool.eraser
            ? BlendMode.clear
            : BlendMode.srcOver
        ..isAntiAlias = true;

      if (stroke.tool == _SketchTool.brush) {
        paint.maskFilter = MaskFilter.blur(
          BlurStyle.normal,
          stroke.width * 0.22,
        );
      }

      if (stroke.points.length == 1) {
        canvas.drawCircle(stroke.points.first, strokeWidth / 2, paint);
        continue;
      }

      final path = Path()
        ..moveTo(stroke.points.first.dx, stroke.points.first.dy);
      for (final point in stroke.points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, paint);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SketchPadPainter oldDelegate) {
    return true;
  }
}

class _MessagesWallpaperPainter extends CustomPainter {
  const _MessagesWallpaperPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final nebulaCenters = <Offset>[
      Offset(size.width * 0.18, size.height * 0.20),
      Offset(size.width * 0.78, size.height * 0.28),
      Offset(size.width * 0.56, size.height * 0.76),
    ];
    final nebulaColors = <Color>[
      const Color(0xFF5EEAD4),
      const Color(0xFF818CF8),
      const Color(0xFF38BDF8),
    ];
    final nebulaRadius = math.max(size.shortestSide * 0.28, 160.0);

    for (var i = 0; i < nebulaCenters.length; i++) {
      final rect = Rect.fromCircle(
        center: nebulaCenters[i],
        radius: nebulaRadius,
      );
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [
            nebulaColors[i].withValues(alpha: 0.18),
            nebulaColors[i].withValues(alpha: 0.04),
            Colors.transparent,
          ],
          stops: const [0.0, 0.52, 1.0],
        ).createShader(rect);
      canvas.drawCircle(nebulaCenters[i], nebulaRadius, paint);
    }

    final orbitPaint = Paint()
      ..color = const Color(0xFFAFCAFF).withValues(alpha: 0.16)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1;

    final orbitHighlightPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.78, size.height * 0.26),
        width: size.width * 0.28,
        height: size.width * 0.10,
      ),
      orbitPaint,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.26, size.height * 0.68),
        width: size.width * 0.36,
        height: size.width * 0.13,
      ),
      orbitHighlightPaint,
    );

    final planetPaint = Paint()
      ..color = const Color(0xFFC7D2FE).withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(
      Offset(size.width * 0.79, size.height * 0.26),
      26,
      planetPaint,
    );
    canvas.drawCircle(
      Offset(size.width * 0.24, size.height * 0.69),
      18,
      Paint()
        ..color = Color(0xFF93C5FD).withValues(alpha: 0.10)
        ..style = PaintingStyle.fill,
    );

    final starPositions = <Offset>[
      Offset(size.width * 0.12, size.height * 0.16),
      Offset(size.width * 0.22, size.height * 0.38),
      Offset(size.width * 0.36, size.height * 0.12),
      Offset(size.width * 0.48, size.height * 0.52),
      Offset(size.width * 0.64, size.height * 0.18),
      Offset(size.width * 0.72, size.height * 0.60),
      Offset(size.width * 0.84, size.height * 0.42),
      Offset(size.width * 0.90, size.height * 0.16),
      Offset(size.width * 0.56, size.height * 0.26),
      Offset(size.width * 0.18, size.height * 0.80),
      Offset(size.width * 0.38, size.height * 0.72),
      Offset(size.width * 0.80, size.height * 0.82),
    ];

    for (var i = 0; i < starPositions.length; i++) {
      final position = starPositions[i];
      final radius = i.isEven ? 1.8 : 1.2;
      final starPaint = Paint()
        ..color = Colors.white.withValues(alpha: i.isEven ? 0.62 : 0.42);
      canvas.drawCircle(position, radius, starPaint);
    }

    final sparklePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.26)
      ..strokeWidth = 1.1
      ..strokeCap = StrokeCap.round;
    final sparkles = <Offset>[
      Offset(size.width * 0.30, size.height * 0.28),
      Offset(size.width * 0.68, size.height * 0.48),
      Offset(size.width * 0.52, size.height * 0.82),
    ];
    for (final position in sparkles) {
      canvas.drawLine(
        Offset(position.dx - 5, position.dy),
        Offset(position.dx + 5, position.dy),
        sparklePaint,
      );
      canvas.drawLine(
        Offset(position.dx, position.dy - 5),
        Offset(position.dx, position.dy + 5),
        sparklePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MessagesWallpaperPainter oldDelegate) {
    return false;
  }
}

class _GalaxyPlanetScenePainter extends CustomPainter {
  final Offset planetCenter;
  final double planetRadius;
  final double spinProgress;
  final double twinkleProgress;
  final List<_ShootingStar> sparkleSeeds;

  const _GalaxyPlanetScenePainter({
    required this.planetCenter,
    required this.planetRadius,
    required this.spinProgress,
    required this.twinkleProgress,
    required this.sparkleSeeds,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final backgroundGlows = <({Offset center, double radius, Color color})>[
      (
        center: Offset(size.width * 0.16, size.height * 0.14),
        radius: planetRadius * 1.05,
        color: const Color(0xFFA7F3FF),
      ),
      (
        center: Offset(size.width * 0.82, size.height * 0.18),
        radius: planetRadius * 0.92,
        color: const Color(0xFFFFD7F6),
      ),
      (
        center: Offset(size.width * 0.56, size.height * 0.74),
        radius: planetRadius * 1.08,
        color: const Color(0xFFE4D5FF),
      ),
    ];

    for (final glow in backgroundGlows) {
      final rect = Rect.fromCircle(center: glow.center, radius: glow.radius);
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [
            glow.color.withValues(alpha: 0.22),
            glow.color.withValues(alpha: 0.06),
            Colors.transparent,
          ],
          stops: const [0.0, 0.54, 1.0],
        ).createShader(rect);
      canvas.drawCircle(glow.center, glow.radius, paint);
    }

    final twinkleBase = twinkleProgress * math.pi * 2;
    for (var i = 0; i < sparkleSeeds.length; i++) {
      final seed = sparkleSeeds[i];
      final position = Offset(
        seed.startX * size.width,
        seed.startY * size.height,
      );
      final twinkle = 0.38 + 0.32 * math.sin(twinkleBase + seed.launchAt * 9);
      final glowPaint = Paint()
        ..color = Colors.white.withValues(alpha: twinkle * 0.18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
      final starPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.42 + twinkle * 0.28);
      canvas.drawCircle(position, 3.2 + twinkle * 0.8, glowPaint);
      canvas.drawCircle(position, 1.2 + twinkle * 0.5, starPaint);
      if (i.isEven) {
        final sparklePaint = Paint()
          ..color = Colors.white.withValues(alpha: 0.22 + twinkle * 0.18)
          ..strokeWidth = 1
          ..strokeCap = StrokeCap.round;
        canvas.drawLine(
          Offset(position.dx - 5, position.dy),
          Offset(position.dx + 5, position.dy),
          sparklePaint,
        );
        canvas.drawLine(
          Offset(position.dx, position.dy - 5),
          Offset(position.dx, position.dy + 5),
          sparklePaint,
        );
      }
    }

    final ringRect = Rect.fromCenter(
      center: planetCenter.translate(0, planetRadius * 0.10),
      width: planetRadius * 2.62,
      height: planetRadius * 0.84,
    );

    final ringGlowPaint = Paint()
      ..color = const Color(0xFFA78BFA).withValues(alpha: 0.18)
      ..strokeWidth = planetRadius * 0.18
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);
    canvas.drawOval(ringRect, ringGlowPaint);

    final ringBackPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          const Color(0xFFB38CFF).withValues(alpha: 0.42),
          const Color(0xFFE8D8FF).withValues(alpha: 0.65),
          const Color(0xFF8C8EFF).withValues(alpha: 0.46),
        ],
      ).createShader(ringRect)
      ..strokeWidth = planetRadius * 0.13
      ..style = PaintingStyle.stroke;
    canvas.drawOval(ringRect, ringBackPaint);

    final sphereRect = Rect.fromCircle(
      center: planetCenter,
      radius: planetRadius,
    );
    final spherePaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.24, -0.28),
        radius: 1.06,
        colors: [
          Colors.white.withValues(alpha: 0.96),
          const Color(0xFFF3D8FF),
          const Color(0xFFC7A4FF),
          const Color(0xFF8D79FF),
        ],
        stops: const [0.0, 0.26, 0.68, 1.0],
      ).createShader(sphereRect);
    canvas.drawCircle(planetCenter, planetRadius, spherePaint);

    final sphereOutlinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = Colors.white.withValues(alpha: 0.48);
    canvas.drawCircle(planetCenter, planetRadius, sphereOutlinePaint);

    canvas.save();
    canvas.clipPath(
      Path()
        ..addOval(Rect.fromCircle(center: planetCenter, radius: planetRadius)),
    );
    canvas.translate(planetCenter.dx, planetCenter.dy);
    canvas.rotate(spinProgress * math.pi * 2);

    final shardPaint = Paint();
    final shardRects = [
      Rect.fromCenter(
        center: Offset(-planetRadius * 0.18, -planetRadius * 0.10),
        width: planetRadius * 0.42,
        height: planetRadius * 2.2,
      ),
      Rect.fromCenter(
        center: Offset(planetRadius * 0.08, 0),
        width: planetRadius * 0.34,
        height: planetRadius * 2.1,
      ),
      Rect.fromCenter(
        center: Offset(planetRadius * 0.32, planetRadius * 0.06),
        width: planetRadius * 0.28,
        height: planetRadius * 2.0,
      ),
    ];
    final shardColors = [
      [Colors.white.withValues(alpha: 0.22), Colors.transparent],
      [const Color(0xFFD7C3FF).withValues(alpha: 0.18), Colors.transparent],
      [Colors.white.withValues(alpha: 0.16), Colors.transparent],
    ];
    for (var i = 0; i < shardRects.length; i++) {
      shardPaint.shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: shardColors[i],
      ).createShader(shardRects[i]);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          shardRects[i],
          Radius.circular(planetRadius * 0.14),
        ),
        shardPaint,
      );
    }

    final surfaceStarPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.48);
    final surfaceStars = [
      Offset(-planetRadius * 0.30, -planetRadius * 0.16),
      Offset(planetRadius * 0.18, -planetRadius * 0.22),
      Offset(planetRadius * 0.06, planetRadius * 0.05),
      Offset(-planetRadius * 0.12, planetRadius * 0.22),
      Offset(planetRadius * 0.26, planetRadius * 0.18),
    ];
    for (final star in surfaceStars) {
      canvas.drawCircle(star, 1.6, surfaceStarPaint);
    }
    canvas.restore();

    final highlightPaint = Paint()
      ..shader =
          RadialGradient(
            colors: [
              Colors.white.withValues(alpha: 0.52),
              Colors.white.withValues(alpha: 0.08),
              Colors.transparent,
            ],
          ).createShader(
            Rect.fromCircle(
              center: planetCenter.translate(
                -planetRadius * 0.22,
                -planetRadius * 0.34,
              ),
              radius: planetRadius * 0.54,
            ),
          );
    canvas.drawCircle(
      planetCenter.translate(-planetRadius * 0.22, -planetRadius * 0.34),
      planetRadius * 0.54,
      highlightPaint,
    );

    canvas.save();
    canvas.clipRect(
      Rect.fromLTWH(
        0,
        planetCenter.dy - planetRadius * 0.02,
        size.width,
        size.height,
      ),
    );
    final ringFrontPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          const Color(0xFFB58EFF).withValues(alpha: 0.78),
          Colors.white.withValues(alpha: 0.92),
          const Color(0xFF8FA6FF).withValues(alpha: 0.80),
        ],
      ).createShader(ringRect)
      ..strokeWidth = planetRadius * 0.11
      ..style = PaintingStyle.stroke;
    canvas.drawOval(ringRect, ringFrontPaint);

    final ringHighlightPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.48)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;
    canvas.drawOval(ringRect.deflate(planetRadius * 0.03), ringHighlightPaint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _GalaxyPlanetScenePainter oldDelegate) {
    return oldDelegate.planetCenter != planetCenter ||
        oldDelegate.planetRadius != planetRadius ||
        oldDelegate.spinProgress != spinProgress ||
        oldDelegate.twinkleProgress != twinkleProgress ||
        oldDelegate.sparkleSeeds != sparkleSeeds;
  }
}

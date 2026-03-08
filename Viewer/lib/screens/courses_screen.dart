import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/common/viewer_page_shell.dart';
import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../theme/theme.dart';

/// Community screen — ported from Figma FriendsScreen template
/// (file kept as courses_screen.dart for routing compatibility)
class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen>
    with TickerProviderStateMixin {
  String _view = 'find'; // 'find' or 'message'
  final TextEditingController _findSearchController = TextEditingController();
  final TextEditingController _messageSearchController =
      TextEditingController();
  String _findQuery = '';
  String _messageQuery = '';
  String _selectedCategory = 'All';
  int? _hoveredUserId;
  final math.Random _rng = math.Random();
  List<_GalaxyUser> _galaxyUsers = [];
  late final AnimationController _floatController;
  final List<_Conversation> _conversations = [];
  final Map<int, String> _userCategoryById = <int, String>{};
  final Map<int, bool> _userOnlineById = <int, bool>{};
  int _nextUserId = 1;
  AppLocalizations get _t => context.read<LanguageProvider>().t;

  // Galaxy user data
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

  List<_ConversationSeed> _seedConversations(AppLocalizations t) {
    final yesterday = t.isZh ? '昨天' : 'Yesterday';
    final weekday = t.isZh ? '周三' : 'Wed';
    return [
      _ConversationSeed(
        1,
        'Sarah Connor',
        t.isZh ? 'Python 函数太有意思了！' : 'Python functions are so interesting!',
        '10:30',
        true,
      ),
      _ConversationSeed(
        2,
        'Mike Chen',
        t.isZh ? '明天要不要一起练习编程？' : 'Want to practice coding together tomorrow?',
        '09:15',
        true,
      ),
      _ConversationSeed(
        3,
        'Jessica Lee',
        t.isZh ? '谢谢你的帮助！' : 'Thank you for your help!',
        yesterday,
        false,
      ),
      _ConversationSeed(
        4,
        'Python Study Group',
        t.isZh ? 'Alex：今天的作业太难了...' : "Alex: Today's homework is too hard...",
        yesterday,
        false,
      ),
      _ConversationSeed(
        5,
        'David Park',
        t.isZh ? '周末见！' : 'See you this weekend!',
        weekday,
        false,
      ),
    ];
  }

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat();
    _galaxyUsers = List<_GalaxyUser>.from(_seedGalaxyUsers);
    _nextUserId = _galaxyUsers.length + 1;
    for (var i = 0; i < _galaxyUsers.length; i++) {
      _userCategoryById[_galaxyUsers[i].id] =
          _communityCategories[i % _communityCategories.length];
      _userOnlineById[_galaxyUsers[i].id] = _defaultOnlineForUserId(
        _galaxyUsers[i].id,
      );
    }
    for (final seed in _seedConversations(_t)) {
      _conversations.add(
        _Conversation(
          id: seed.id,
          name: seed.name,
          message: seed.message,
          time: seed.time,
          unread: seed.unread,
          messages: [
            _ChatMessage(
              text: seed.message,
              isMine: false,
              sentAtLabel: seed.time,
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _findSearchController.dispose();
    _messageSearchController.dispose();
    _floatController.dispose();
    super.dispose();
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
    final t = _t;
    final category = _categoryLabel(_categoryForUser(user), t);
    return t.communityUserHeadline(category);
  }

  bool _defaultOnlineForUserId(int id) {
    // Deterministic pseudo-presence while local-only.
    return id % 3 == 0 || id % 5 == 0;
  }

  bool _isUserOnline(_GalaxyUser user) {
    return _userOnlineById[user.id] ?? false;
  }

  int get _connectedUsersCount => _galaxyUsers.length;

  int get _onlineUsersCountIncludingSelf {
    final onlineOthers = _galaxyUsers.where(_isUserOnline).length;
    return onlineOthers + 1; // include current user
  }

  Future<void> _startChatWithUser(_GalaxyUser user) async {
    final existingIndex = _conversations.indexWhere(
      (conversation) =>
          conversation.name.toLowerCase() == user.name.toLowerCase(),
    );

    late final _Conversation conversation;
    if (existingIndex >= 0) {
      conversation = _conversations[existingIndex];
    } else {
      final initialTime = _formatCurrentTimeLabel();
      conversation = _Conversation(
        id: _conversations.isEmpty
            ? 1
            : _conversations.map((c) => c.id).reduce(math.max) + 1,
        name: user.name,
        message: _t.communityNewConnectionRequest,
        time: initialTime,
        unread: false,
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
    setState(() => _view = 'message');
    await _openConversationChat(conversation);
  }

  void _callUser(_GalaxyUser user) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(_t.communityCallingUser(user.name))));
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
                    color: Color(0xFF0F172A),
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
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '@$username',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
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
                color: Color(0xFF64748B),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
        ],
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
        return StatefulBuilder(
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
        );
      },
    );

    inputController.dispose();
    if (!mounted || input == null) return;

    final addedUser = _addUserFromInput(input.identifier, input.category);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(t.communityAddedUser(addedUser.name))),
    );
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
      _view = 'find';
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
        return StatefulBuilder(
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
                            color: Color(0xFF64748B),
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
                                  color: Color(0xFF0F172A),
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
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            subtitle: Text(
                              '${user.email ?? t.communityUsernameOnly}  •  ${_categoryLabel(_categoryForUser(user), t)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF64748B),
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

                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      t.communityRemovedUser(removedName),
                                    ),
                                  ),
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
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ViewerPageShell(
      preset: ViewerContentWidthPreset.feed,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWideLayout = constraints.maxWidth >= 980;
          return isWideLayout
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildCategorySidebar(),
                    const SizedBox(width: 14),
                    Expanded(
                      child: _buildMainPanel(showInlineCategories: false),
                    ),
                  ],
                )
              : _buildMainPanel(showInlineCategories: true);
        },
      ),
    );
  }

  Widget _buildMainPanel({required bool showInlineCategories}) {
    return Column(
      children: [
        _buildHeader(),
        if (showInlineCategories) _buildInlineCategoryTabs(),
        Expanded(
          child: _view == 'find' ? _buildFindView() : _buildMessageView(),
        ),
      ],
    );
  }

  Widget _buildCategorySidebar() {
    final t = context.watch<LanguageProvider>().t;
    return Container(
      width: 220,
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              t.communityCategories,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 12),
              itemCount: _categoryTabs.length,
              itemBuilder: (context, index) {
                final category = _categoryTabs[index];
                final isSelected = _selectedCategory == category;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Material(
                    color: isSelected
                        ? const Color(0xFFEFF6FF)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => setState(() => _selectedCategory = category),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 10,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _iconForCategory(category),
                              size: 18,
                              color: isSelected
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFF64748B),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _categoryLabel(category, t),
                                style: TextStyle(
                                  color: isSelected
                                      ? const Color(0xFF1D4ED8)
                                      : const Color(0xFF334155),
                                  fontSize: 13,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
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
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
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
                  ? const Color(0xFF1D4ED8)
                  : const Color(0xFF64748B),
            ),
            label: Text(_categoryLabel(category, t)),
            labelStyle: TextStyle(
              color: isSelected
                  ? const Color(0xFF1D4ED8)
                  : const Color(0xFF334155),
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            ),
            selectedColor: const Color(0xFFEFF6FF),
            backgroundColor: Colors.white,
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          );
        },
      ),
    );
  }

  Widget _buildConnectionStats() {
    final t = context.watch<LanguageProvider>().t;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.people_alt_outlined,
                  size: 13,
                  color: Color(0xFF64748B),
                ),
                const SizedBox(width: 4),
                Text(
                  t.communityConnected(_connectedUsersCount),
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF22C55E),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  t.communityOnline(_onlineUsersCountIncludingSelf),
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF16A34A),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final t = context.watch<LanguageProvider>().t;
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 14),
      color: Colors.white,
      child: Column(
        children: [
          Row(
            children: [
              _buildConnectionStats(),
              const Spacer(),
              if (_view == 'find') ...[
                GestureDetector(
                  onTap: _showRemoveUserDialog,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.person_remove_outlined,
                      size: 20,
                      color: Color(0xFF334155),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _showAddUserDialog,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.person_add_outlined,
                      size: 20,
                      color: Color(0xFF334155),
                    ),
                  ),
                ),
              ] else
                const SizedBox(width: 76),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                _buildViewTab(
                  label: t.communityFind,
                  selected: _view == 'find',
                  onTap: () => setState(() => _view = 'find'),
                ),
                _buildViewTab(
                  label: t.communityMessage,
                  selected: _view == 'message',
                  onTap: () => setState(() => _view = 'message'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewTab({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          margin: const EdgeInsets.all(4),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: selected
                  ? const Color(0xFF0F172A)
                  : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFindView() {
    final t = context.watch<LanguageProvider>().t;
    final visibleUserIndexes = _visibleGalaxyUserIndexes;
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.galaxyGradient),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: TextField(
                controller: _findSearchController,
                textInputAction: TextInputAction.search,
                onChanged: (value) => setState(() => _findQuery = value),
                style: const TextStyle(
                  color: Color(0xFF000000),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                decoration: InputDecoration(
                  hintText: t.communitySearchUserHint,
                  hintStyle: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  prefixIcon: const Icon(
                    Icons.search,
                    color: Color(0xFF94A3B8),
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
                            color: Color(0xFF94A3B8),
                            size: 18,
                          ),
                        ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
          // Galaxy area
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
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
          // Find button
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: AppColors.galaxyGradient,
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFCBD5E1),
                  side: const BorderSide(color: Color(0xFFCBD5E1), width: 2),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  t.communityFindButton,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
              ),
            ),
          ),
        ],
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
    final speedFactor = 0.86 + (user.id % 5) * 0.07;
    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        final phase =
            _floatController.value * math.pi * 2 * speedFactor +
            user.floatDelay;
        final yOffset = math.sin(phase) * 8;
        final xOffset = math.cos(phase * 0.7) * 4;
        return Positioned(
          left: constraints.maxWidth * user.x / 100 - 20 + xOffset,
          top: constraints.maxHeight * user.y / 100 - 20 + yOffset,
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
              // Planet dot + hover mini profile
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
                          border: Border.all(color: const Color(0xFFE2E8F0)),
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
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              _categoryLabel(_categoryForUser(user), t),
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF64748B),
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
                          ? Border.all(
                              color: const Color(0xFFFFFFFF),
                              width: 1.4,
                            )
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Name label
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

  String _formatCurrentTimeLabel() {
    final now = DateTime.now();
    final hour = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  List<_Conversation> get _visibleConversations {
    final normalizedQuery = _messageQuery.trim().toLowerCase();
    if (normalizedQuery.isEmpty) return _conversations;
    return _conversations.where((conversation) {
      return conversation.name.toLowerCase().contains(normalizedQuery) ||
          conversation.message.toLowerCase().contains(normalizedQuery);
    }).toList();
  }

  Future<void> _openConversationChat(_Conversation conversation) async {
    if (conversation.unread) {
      setState(() => conversation.unread = false);
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
                  conversation.unread = false;
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
                              backgroundColor: const Color(0xFFE2E8F0),
                              child: Text(
                                conversation.name[0].toUpperCase(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF64748B),
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
                                  color: Color(0xFF0F172A),
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
                            final msg = conversation.messages[index];
                            return Align(
                              alignment: msg.isMine
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(
                                  maxWidth:
                                      MediaQuery.of(sheetContext).size.width *
                                      0.72,
                                ),
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: msg.isMine
                                      ? const Color(0xFF0F172A)
                                      : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: msg.isMine
                                      ? CrossAxisAlignment.end
                                      : CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      msg.text,
                                      style: TextStyle(
                                        color: msg.isMine
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      msg.sentAtLabel,
                                      style: TextStyle(
                                        color: msg.isMine
                                            ? Colors.white70
                                            : const Color(0xFF94A3B8),
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                        decoration: const BoxDecoration(
                          border: Border(
                            top: BorderSide(color: Color(0xFFE2E8F0)),
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
                                    color: Color(0xFF94A3B8),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 12,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                      color: Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                      color: Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(
                                      color: Color(0xFF94A3B8),
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

  Widget _buildMessageView() {
    final t = context.watch<LanguageProvider>().t;
    final visibleConversations = _visibleConversations;
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: TextField(
              controller: _messageSearchController,
              onChanged: (value) => setState(() => _messageQuery = value),
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: t.communitySearchBoxHint,
                hintStyle: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                filled: true,
                fillColor: Colors.white,
                prefixIcon: const Icon(
                  Icons.search,
                  color: Color(0xFF94A3B8),
                  size: 20,
                ),
                suffixIcon: _messageQuery.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          _messageSearchController.clear();
                          setState(() => _messageQuery = '');
                        },
                        icon: const Icon(
                          Icons.close,
                          color: Color(0xFF94A3B8),
                          size: 18,
                        ),
                      ),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF94A3B8)),
                ),
              ),
            ),
          ),
          // Conversation list
          Expanded(
            child: visibleConversations.isEmpty
                ? Center(
                    child: Text(
                      t.communityNoConversationFound,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: visibleConversations.length,
                    itemBuilder: (context, index) {
                      return _buildConversationItem(
                        visibleConversations[index],
                        t,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _deleteConversation(_Conversation conv) {
    final t = _t;
    setState(() {
      _conversations.removeWhere((item) => item.id == conv.id);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(t.communityDeletedChatWith(conv.name))),
    );
  }

  Widget _buildConversationItem(_Conversation conv, AppLocalizations t) {
    return InkWell(
      onTap: () => _openConversationChat(conv),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
        ),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFE2E8F0),
                  child: Text(
                    conv.name[0],
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF64748B),
                      fontSize: 18,
                    ),
                  ),
                ),
                if (conv.unread)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Center(
                        child: Text(
                          '1',
                          style: TextStyle(
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
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conv.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conv.message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
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
                  conv.time,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 8),
                IconButton(
                  tooltip: t.communityDeleteChatTooltip,
                  onPressed: () => _deleteConversation(conv),
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

class _ConversationSeed {
  final int id;
  final String name;
  final String message;
  final String time;
  final bool unread;
  const _ConversationSeed(
    this.id,
    this.name,
    this.message,
    this.time,
    this.unread,
  );
}

class _Conversation {
  final int id;
  final String name;
  String message;
  String time;
  bool unread;
  final List<_ChatMessage> messages;
  _Conversation({
    required this.id,
    required this.name,
    required this.message,
    required this.time,
    required this.unread,
    required this.messages,
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

class _AddUserInput {
  final String identifier;
  final String category;
  const _AddUserInput(this.identifier, this.category);
}

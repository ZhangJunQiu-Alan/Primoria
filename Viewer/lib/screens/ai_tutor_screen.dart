import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/language_provider.dart';
import '../services/gemini_service.dart';

class AiTutorScreen extends StatefulWidget {
  const AiTutorScreen({super.key});

  @override
  State<AiTutorScreen> createState() => _AiTutorScreenState();
}

class _AiTutorScreenState extends State<AiTutorScreen> {
  static const List<String> _suggestedPromptsEn = [
    'Hello! Can you help me plan today\'s learning tasks?',
    'I am new here, what can you do for note-taking?',
    'Can you summarize my notes into a simple mind map?',
  ];
  static const List<String> _suggestedPromptsZh = [
    '你好！可以帮我规划今天的学习任务吗？',
    '我是新用户，你能怎么帮我做笔记？',
    '可以把我的笔记总结成简单的思维导图吗？',
  ];
  static final RegExp _apiKeyPattern = RegExp(r'AIza[0-9A-Za-z_-]{20,}');

  final TextEditingController _inputController = TextEditingController();
  final ScrollController _conversationController = ScrollController();
  final List<_ConversationMessage> _messages = <_ConversationMessage>[];

  bool _isSending = false;
  bool _isMindMapLoading = false;
  bool _isQuizLoading = false;
  bool _isReplayLoading = false;

  _MindMapData? _latestMindMap;
  _QuizSet? _latestQuiz;
  _MindMapEvolution? _latestEvolution;
  DateTime? _latestMindMapAt;
  DateTime? _latestQuizAt;
  DateTime? _latestEvolutionAt;

  AppLocalizations get _t => context.read<LanguageProvider>().t;

  String _tr({required String en, required String zh}) {
    return _t.isZh ? zh : en;
  }

  @override
  void initState() {
    super.initState();
    _warmupGeminiConfiguration();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _conversationController.dispose();
    super.dispose();
  }

  Future<void> _warmupGeminiConfiguration() async {
    await GeminiService.initialize();
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _sendCurrentInput() async {
    await _sendMessage(_inputController.text);
  }

  Future<void> _sendSuggestedPrompt(String prompt) async {
    await _sendMessage(prompt);
  }

  Future<bool> _ensureGeminiForStudio() async {
    final configured = await GeminiService.ensureConfigured();
    if (configured) return true;
    if (!mounted) return false;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _tr(
            en: 'Gemini is not configured yet. Use --dart-define or send /apikey your_key first.',
            zh: 'Gemini 尚未配置。请先使用 --dart-define，或先发送 /apikey your_key。',
          ),
        ),
      ),
    );
    return false;
  }

  String _buildLearningSource() {
    if (_messages.isEmpty) return '';
    final start = _messages.length > 16 ? _messages.length - 16 : 0;
    final recent = _messages.sublist(start);

    return recent
        .map(
          (m) => '${m.kind == _MessageKind.user ? 'User' : 'Tutor'}: ${m.text}',
        )
        .join('\n');
  }

  Map<String, dynamic> _extractJsonObject(String raw) {
    var source = raw.trim();
    final fenced = RegExp(r'```(?:json)?\s*([\s\S]*?)```').firstMatch(source);
    if (fenced != null) {
      source = (fenced.group(1) ?? '').trim();
    }

    final start = source.indexOf('{');
    final end = source.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw const FormatException('No JSON object found in model output.');
    }

    final jsonText = source.substring(start, end + 1);
    final decoded = jsonDecode(jsonText);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return decoded.cast<String, dynamic>();
    throw const FormatException('Model output is not a JSON object.');
  }

  Future<void> _handleMindMapTap() async {
    if (_isMindMapLoading) return;
    if (!await _ensureGeminiForStudio()) return;

    final source = _buildLearningSource();
    if (source.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Please chat with the tutor first, then generate a mind map.',
              zh: '请先和导师对话，再生成思维导图。',
            ),
          ),
        ),
      );
      return;
    }

    setState(() => _isMindMapLoading = true);

    try {
      final prompt =
          '''
Create a concise study mind map from the source text.
Return JSON only (no markdown):
{
  "title": "string",
  "nodes": [
    { "id": "root", "label": "string", "parentId": null },
    { "id": "n1", "label": "string", "parentId": "root" }
  ]
}
Rules:
- 8 to 18 nodes total
- labels must be short (max 6 words)
- exactly one root node (parentId = null)
- all non-root parentId values must reference an existing node id

Source:
$source
''';

      final reply = await GeminiService.generateReply(
        history: [GeminiMessage(role: GeminiRole.user, text: prompt)],
      );
      final data = _MindMapData.fromJson(_extractJsonObject(reply));

      if (!mounted) return;
      setState(() {
        _latestMindMap = data;
        _latestMindMapAt = DateTime.now();
      });
      await _showMindMapDialog(data);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Mind map generation failed. Please try again.',
              zh: '思维导图生成失败，请重试。',
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isMindMapLoading = false);
      }
    }
  }

  Future<void> _handleQuizTap() async {
    if (_isQuizLoading) return;
    if (!await _ensureGeminiForStudio()) return;

    final source = _buildLearningSource();
    if (source.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Please chat with the tutor first, then generate a quiz.',
              zh: '请先和导师对话，再生成测验。',
            ),
          ),
        ),
      );
      return;
    }

    setState(() => _isQuizLoading = true);

    try {
      final prompt =
          '''
Create a short study quiz from the source text.
Return JSON only (no markdown):
{
  "title": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0,
      "explanation": "string"
    }
  ]
}
Rules:
- exactly 5 questions
- 4 options per question
- answerIndex must be 0..3
- include clear explanation in one sentence

Source:
$source
''';

      final reply = await GeminiService.generateReply(
        history: [GeminiMessage(role: GeminiRole.user, text: prompt)],
      );
      final quiz = _QuizSet.fromJson(_extractJsonObject(reply));

      if (!mounted) return;
      setState(() {
        _latestQuiz = quiz;
        _latestQuizAt = DateTime.now();
      });
      await _showQuizDialog(quiz);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Quiz generation failed. Please try again.',
              zh: '测验生成失败，请重试。',
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isQuizLoading = false);
      }
    }
  }

  Future<void> _handlePresentationTap() async {
    if (_isReplayLoading) return;
    if (!await _ensureGeminiForStudio()) return;

    final source = _buildLearningSource();
    if (source.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Please chat with the tutor first, then generate an evolution replay.',
              zh: '请先和导师对话，再生成演化回放。',
            ),
          ),
        ),
      );
      return;
    }

    setState(() => _isReplayLoading = true);

    try {
      final prompt =
          '''
Create a staged "mind map evolution replay" from the source text.
Return JSON only (no markdown):
{
  "title": "string",
  "stages": [
    {
      "stageTitle": "string",
      "focus": "string",
      "nodes": [
        { "id": "root", "label": "string", "parentId": null },
        { "id": "n1", "label": "string", "parentId": "root" }
      ]
    }
  ]
}
Rules:
- 3 to 5 stages
- stage 1 should be the simplest core understanding
- each next stage must add new nodes and deeper detail
- keep existing node ids stable across stages
- each stage must include a root node (parentId = null)
- labels max 6 words

Source:
$source
''';

      final reply = await GeminiService.generateReply(
        history: [GeminiMessage(role: GeminiRole.user, text: prompt)],
      );
      final evolution = _MindMapEvolution.fromJson(_extractJsonObject(reply));

      if (!mounted) return;
      setState(() {
        _latestEvolution = evolution;
        _latestEvolutionAt = DateTime.now();
      });
      await _showEvolutionDialog(evolution);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tr(
              en: 'Evolution replay generation failed. Please try again.',
              zh: '演化回放生成失败，请重试。',
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isReplayLoading = false);
      }
    }
  }

  Future<void> _showMindMapDialog(_MindMapData mindMap) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (_) => _MindMapDialog(mindMap: mindMap),
    );
  }

  Future<void> _showQuizDialog(_QuizSet quiz) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (_) => _QuizDialog(quiz: quiz),
    );
  }

  Future<void> _showEvolutionDialog(_MindMapEvolution evolution) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (_) => _MindMapEvolutionDialog(evolution: evolution),
    );
  }

  String? _extractApiKeyFromInput(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return null;

    final lowered = trimmed.toLowerCase();
    if (lowered.startsWith('/apikey ')) {
      final value = trimmed.substring(8).trim();
      return value.isEmpty ? null : value;
    }

    final match = _apiKeyPattern.firstMatch(trimmed);
    return match?.group(0);
  }

  Future<bool> _tryConfigureFromInput(String text) async {
    final key = _extractApiKeyFromInput(text);
    if (key == null) return false;

    await GeminiService.setApiKey(key);
    if (!mounted) return true;

    setState(() {
      _messages.add(
        _ConversationMessage.assistant(
          _tr(
            en: 'Gemini API key saved locally. Ask your question again.',
            zh: 'Gemini API Key 已保存在本地。请重新提问。',
          ),
        ),
      );
    });
    _scrollToBottom();
    return true;
  }

  Future<void> _sendMessage(String rawText) async {
    final text = rawText.trim();
    if (text.isEmpty || _isSending) return;

    if (await _tryConfigureFromInput(text)) {
      _inputController.clear();
      return;
    }

    _inputController.clear();

    setState(() {
      _messages.add(_ConversationMessage.user(text));
      _isSending = true;
    });
    _scrollToBottom();

    final isConfigured = await GeminiService.ensureConfigured();
    if (!isConfigured) {
      setState(() {
        _messages.add(
          _ConversationMessage.assistant(
            _tr(
              en: 'Gemini API key is missing. Start with --dart-define=GEMINI_API_KEY=your_key, or send "/apikey your_key" once in this chat.',
              zh: '缺少 Gemini API Key。请使用 --dart-define=GEMINI_API_KEY=your_key，或在本会话发送一次 "/apikey your_key"。',
            ),
          ),
        );
        _isSending = false;
      });
      _scrollToBottom();
      return;
    }

    try {
      final reply = await GeminiService.generateReply(
        history: _buildGeminiHistory(),
      );
      if (!mounted) return;
      setState(() {
        _messages.add(_ConversationMessage.assistant(reply));
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is GeminiServiceException
          ? error.message
          : _tr(en: 'Unexpected error: $error', zh: '未知错误：$error');
      setState(() {
        _messages.add(
          _ConversationMessage.assistant(
            _tr(
              en: 'I hit an error while contacting Gemini:\n$message',
              zh: '连接 Gemini 时发生错误：\n$message',
            ),
          ),
        );
      });
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
        _scrollToBottom();
      }
    }
  }

  List<GeminiMessage> _buildGeminiHistory() {
    final start = _messages.length > 20 ? _messages.length - 20 : 0;
    final recent = _messages.sublist(start);

    return recent
        .map(
          (message) => GeminiMessage(
            role: message.kind == _MessageKind.user
                ? GeminiRole.user
                : GeminiRole.model,
            text: message.text,
          ),
        )
        .toList(growable: false);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_conversationController.hasClients) return;
      _conversationController.animateTo(
        _conversationController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.watch<LanguageProvider>().t;
    final suggestedPrompts = t.isZh ? _suggestedPromptsZh : _suggestedPromptsEn;

    return Container(
      color: const Color(0xFFF3F4F6),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isCompact = constraints.maxWidth < 960;

          if (isCompact) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  SizedBox(
                    height: 720,
                    child: _ConversationPanel(
                      isZh: t.isZh,
                      messages: _messages,
                      isSending: _isSending,
                      isGeminiConfigured: GeminiService.isConfigured,
                      inputController: _inputController,
                      conversationController: _conversationController,
                      onSendPressed: _sendCurrentInput,
                      onSuggestedPromptPressed: _sendSuggestedPrompt,
                      suggestedPrompts: suggestedPrompts,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 520,
                    child: _StudioPanel(
                      isZh: t.isZh,
                      isMindMapLoading: _isMindMapLoading,
                      isQuizLoading: _isQuizLoading,
                      isReplayLoading: _isReplayLoading,
                      latestMindMap: _latestMindMap,
                      latestQuiz: _latestQuiz,
                      latestEvolution: _latestEvolution,
                      latestMindMapAt: _latestMindMapAt,
                      latestQuizAt: _latestQuizAt,
                      latestEvolutionAt: _latestEvolutionAt,
                      onMindMapTap: _handleMindMapTap,
                      onQuizTap: _handleQuizTap,
                      onPresentationTap: _handlePresentationTap,
                      onOpenMindMap: _latestMindMap == null
                          ? null
                          : () => _showMindMapDialog(_latestMindMap!),
                      onOpenQuiz: _latestQuiz == null
                          ? null
                          : () => _showQuizDialog(_latestQuiz!),
                      onOpenEvolution: _latestEvolution == null
                          ? null
                          : () => _showEvolutionDialog(_latestEvolution!),
                    ),
                  ),
                ],
              ),
            );
          }

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: _ConversationPanel(
                          isZh: t.isZh,
                          messages: _messages,
                          isSending: _isSending,
                          isGeminiConfigured: GeminiService.isConfigured,
                          inputController: _inputController,
                          conversationController: _conversationController,
                          onSendPressed: _sendCurrentInput,
                          onSuggestedPromptPressed: _sendSuggestedPrompt,
                          suggestedPrompts: suggestedPrompts,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 1,
                        child: _StudioPanel(
                          isZh: t.isZh,
                          isMindMapLoading: _isMindMapLoading,
                          isQuizLoading: _isQuizLoading,
                          isReplayLoading: _isReplayLoading,
                          latestMindMap: _latestMindMap,
                          latestQuiz: _latestQuiz,
                          latestEvolution: _latestEvolution,
                          latestMindMapAt: _latestMindMapAt,
                          latestQuizAt: _latestQuizAt,
                          latestEvolutionAt: _latestEvolutionAt,
                          onMindMapTap: _handleMindMapTap,
                          onQuizTap: _handleQuizTap,
                          onPresentationTap: _handlePresentationTap,
                          onOpenMindMap: _latestMindMap == null
                              ? null
                              : () => _showMindMapDialog(_latestMindMap!),
                          onOpenQuiz: _latestQuiz == null
                              ? null
                              : () => _showQuizDialog(_latestQuiz!),
                          onOpenEvolution: _latestEvolution == null
                              ? null
                              : () => _showEvolutionDialog(_latestEvolution!),
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
    );
  }
}

class _ConversationPanel extends StatelessWidget {
  final bool isZh;
  final List<_ConversationMessage> messages;
  final bool isSending;
  final bool isGeminiConfigured;
  final TextEditingController inputController;
  final ScrollController conversationController;
  final Future<void> Function() onSendPressed;
  final Future<void> Function(String prompt) onSuggestedPromptPressed;
  final List<String> suggestedPrompts;

  const _ConversationPanel({
    required this.isZh,
    required this.messages,
    required this.isSending,
    required this.isGeminiConfigured,
    required this.inputController,
    required this.conversationController,
    required this.onSendPressed,
    required this.onSuggestedPromptPressed,
    required this.suggestedPrompts,
  });

  String _tr({required String en, required String zh}) {
    return isZh ? zh : en;
  }

  @override
  Widget build(BuildContext context) {
    const textColor = Color(0xFF333333);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE6E9ED)),
      ),
      child: Column(
        children: [
          Expanded(
            child: ListView(
              controller: conversationController,
              padding: const EdgeInsets.fromLTRB(28, 24, 28, 20),
              children: [
                Text(
                  _tr(en: 'Conversation', zh: '对话'),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 28),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E0),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.waving_hand_outlined,
                        color: Color(0xFFE18C00),
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        _tr(
                          en: 'Hi there! Welcome to your AI Tutor',
                          zh: '你好，欢迎来到你的 AI 导师',
                        ),
                        style: const TextStyle(
                          fontSize: 32,
                          height: 1.15,
                          fontWeight: FontWeight.w500,
                          color: textColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  _tr(
                    en: 'Nice to meet you. I can help you organize notes, summarize long content, and turn ideas into clear knowledge structures. Start with a quick question and I will guide you step by step.',
                    zh: '很高兴认识你。我可以帮你整理笔记、总结长内容，并把想法转成清晰的知识结构。你可以从一个简单问题开始，我会一步步引导你。',
                  ),
                  style: const TextStyle(
                    fontSize: 16,
                    height: 1.6,
                    color: Color(0xFF7A7A7A),
                  ),
                ),
                if (!isGeminiConfigured) ...[
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7E8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFF5D9A4)),
                    ),
                    child: Text(
                      _tr(
                        en: 'Gemini is not configured yet. Start with --dart-define=GEMINI_API_KEY=your_key, or send "/apikey your_key" once in this chat.',
                        zh: 'Gemini 尚未配置。请先使用 --dart-define=GEMINI_API_KEY=your_key，或在本会话发送一次 "/apikey your_key"。',
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF8C640A),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 26),
                for (var i = 0; i < suggestedPrompts.length; i++) ...[
                  _QuestionCard(
                    question: suggestedPrompts[i],
                    onTap: () => onSuggestedPromptPressed(suggestedPrompts[i]),
                  ),
                  if (i < suggestedPrompts.length - 1)
                    const SizedBox(height: 12),
                ],
                if (messages.isNotEmpty || isSending) ...[
                  const SizedBox(height: 26),
                  Text(
                    _tr(en: 'Live Chat', zh: '实时对话'),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final message in messages) ...[
                    _MessageBubble(message: message),
                    const SizedBox(height: 10),
                  ],
                  if (isSending) ...[
                    const _TypingBubble(),
                    const SizedBox(height: 10),
                  ],
                ],
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE6E9ED)),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD4D8DE)),
              ),
              child: TextField(
                controller: inputController,
                enabled: !isSending,
                textInputAction: TextInputAction.send,
                minLines: 1,
                maxLines: 4,
                onSubmitted: (_) => onSendPressed(),
                decoration: InputDecoration(
                  hintText: _tr(en: 'Start typing...', zh: '开始输入...'),
                  hintStyle: const TextStyle(color: Color(0xFF9AA1AA)),
                  prefixIcon: const Icon(
                    Icons.edit_note_outlined,
                    color: Color(0xFF8B949E),
                  ),
                  suffixIcon: IconButton(
                    onPressed: isSending ? null : onSendPressed,
                    icon: Icon(
                      Icons.send_rounded,
                      color: isSending
                          ? const Color(0xFFBCC3CC)
                          : const Color(0xFF2D3A59),
                    ),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 14,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudioPanel extends StatelessWidget {
  final bool isZh;
  final bool isMindMapLoading;
  final bool isQuizLoading;
  final bool isReplayLoading;
  final _MindMapData? latestMindMap;
  final _QuizSet? latestQuiz;
  final _MindMapEvolution? latestEvolution;
  final DateTime? latestMindMapAt;
  final DateTime? latestQuizAt;
  final DateTime? latestEvolutionAt;
  final VoidCallback onMindMapTap;
  final VoidCallback onQuizTap;
  final VoidCallback onPresentationTap;
  final VoidCallback? onOpenMindMap;
  final VoidCallback? onOpenQuiz;
  final VoidCallback? onOpenEvolution;

  const _StudioPanel({
    required this.isZh,
    required this.isMindMapLoading,
    required this.isQuizLoading,
    required this.isReplayLoading,
    required this.latestMindMap,
    required this.latestQuiz,
    required this.latestEvolution,
    required this.latestMindMapAt,
    required this.latestQuizAt,
    required this.latestEvolutionAt,
    required this.onMindMapTap,
    required this.onQuizTap,
    required this.onPresentationTap,
    required this.onOpenMindMap,
    required this.onOpenQuiz,
    required this.onOpenEvolution,
  });

  String _tr({required String en, required String zh}) {
    return isZh ? zh : en;
  }

  String _localizeGeneratedTitle(String title) {
    if (!isZh) return title;
    switch (title.trim()) {
      case 'Study Mind Map':
        return '学习思维导图';
      case 'Practice Quiz':
        return '练习测验';
      case 'Mind Map Evolution Replay':
        return '思维导图演化回放';
      default:
        return title;
    }
  }

  String _formatRelative(DateTime? time) {
    if (time == null) return _tr(en: 'not generated yet', zh: '尚未生成');
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return _tr(en: 'updated just now', zh: '刚刚更新');
    if (diff.inHours < 1) {
      return _tr(
        en: 'updated ${diff.inMinutes} min ago',
        zh: '${diff.inMinutes} 分钟前更新',
      );
    }
    if (diff.inDays < 1) {
      return _tr(
        en: 'updated ${diff.inHours} hr ago',
        zh: '${diff.inHours} 小时前更新',
      );
    }
    return _tr(
      en: 'updated ${diff.inDays} day(s) ago',
      zh: '${diff.inDays} 天前更新',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE6E9ED)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 20, 18, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _tr(en: 'Studio', zh: '工作台'),
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w500,
                color: Color(0xFF333333),
              ),
            ),
            const SizedBox(height: 18),
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.8,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _ModuleCard(
                  label: _tr(en: 'Mind Map', zh: '思维导图'),
                  icon: Icons.account_tree_outlined,
                  background: Color(0xFFE7F3FF),
                  accent: Color(0xFF2E74C9),
                  isLoading: isMindMapLoading,
                  onTap: onMindMapTap,
                ),
                _ModuleCard(
                  label: _tr(en: 'Report', zh: '报告'),
                  icon: Icons.summarize_outlined,
                  background: Color(0xFFE8F6EE),
                  accent: Color(0xFF2F8F57),
                ),
                _ModuleCard(
                  label: _tr(en: 'Quiz', zh: '测验'),
                  icon: Icons.quiz_outlined,
                  background: Color(0xFFFFF8DB),
                  accent: Color(0xFF9A7C12),
                  isLoading: isQuizLoading,
                  onTap: onQuizTap,
                ),
                _ModuleCard(
                  label: _tr(en: 'Presentation', zh: '演示'),
                  icon: Icons.slideshow_outlined,
                  background: Color(0xFFF0E9FF),
                  accent: Color(0xFF7350B6),
                  isLoading: isReplayLoading,
                  onTap: onPresentationTap,
                ),
              ],
            ),
            const SizedBox(height: 22),
            Text(
              _tr(en: 'Notebooks', zh: '笔记本'),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Color(0xFF333333),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView(
                children: [
                  _NotebookItem(
                    title: latestMindMap == null
                        ? _tr(en: 'Mind Map', zh: '思维导图')
                        : _localizeGeneratedTitle(latestMindMap!.title),
                    subtitle: _formatRelative(latestMindMapAt),
                    icon: Icons.account_tree_outlined,
                    onTap: onOpenMindMap,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: latestQuiz == null
                        ? _tr(en: 'Quiz', zh: '测验')
                        : _localizeGeneratedTitle(latestQuiz!.title),
                    subtitle: _formatRelative(latestQuizAt),
                    icon: Icons.quiz_outlined,
                    onTap: onOpenQuiz,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: latestEvolution == null
                        ? _tr(en: 'Evolution Replay', zh: '演化回放')
                        : _localizeGeneratedTitle(latestEvolution!.title),
                    subtitle: _formatRelative(latestEvolutionAt),
                    icon: Icons.slideshow_outlined,
                    onTap: onOpenEvolution,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: _tr(en: 'Networking Foundations', zh: '网络基础'),
                    subtitle: _tr(
                      en: '4 sources - updated today',
                      zh: '4 个来源 - 今日更新',
                    ),
                    icon: Icons.hub_outlined,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: _tr(en: 'Protocol Flashcards', zh: '协议闪卡'),
                    subtitle: _tr(
                      en: '12 cards - reviewed 2 hours ago',
                      zh: '12 张卡片 - 2 小时前复习',
                    ),
                    icon: Icons.style_outlined,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: _tr(
                      en: 'OSI vs TCP/IP Notes',
                      zh: 'OSI 与 TCP/IP 笔记',
                    ),
                    subtitle: _tr(
                      en: '3 references - updated yesterday',
                      zh: '3 份参考 - 昨日更新',
                    ),
                    icon: Icons.menu_book_outlined,
                  ),
                  const SizedBox(height: 8),
                  _NotebookItem(
                    title: _tr(en: 'Routing Exercises', zh: '路由练习'),
                    subtitle: _tr(
                      en: 'quiz draft - 8 questions',
                      zh: '测验草稿 - 8 题',
                    ),
                    icon: Icons.route_outlined,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionCard extends StatefulWidget {
  final String question;
  final VoidCallback onTap;

  const _QuestionCard({required this.question, required this.onTap});

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _hovered ? const Color(0xFFB6BDC7) : const Color(0xFFDDE2E8),
          ),
        ),
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              widget.question,
              style: const TextStyle(
                fontSize: 15,
                height: 1.4,
                color: Color(0xFF333333),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final _ConversationMessage message;

  const _MessageBubble({required this.message});

  List<InlineSpan> _buildStyledSpans({
    required String input,
    required TextStyle baseStyle,
  }) {
    final spans = <InlineSpan>[];
    final matches = RegExp(r'\*\*(.+?)\*\*', dotAll: true).allMatches(input);
    var cursor = 0;

    for (final match in matches) {
      if (match.start > cursor) {
        spans.add(
          TextSpan(
            text: input.substring(cursor, match.start),
            style: baseStyle,
          ),
        );
      }

      final boldText = match.group(1) ?? '';
      spans.add(
        TextSpan(
          text: boldText,
          style: baseStyle.copyWith(fontWeight: FontWeight.w700),
        ),
      );

      cursor = match.end;
    }

    if (cursor < input.length) {
      spans.add(TextSpan(text: input.substring(cursor), style: baseStyle));
    }

    return spans;
  }

  @override
  Widget build(BuildContext context) {
    final isUser = message.kind == _MessageKind.user;
    final textStyle = TextStyle(
      fontSize: 14,
      height: 1.5,
      color: isUser ? Colors.white : const Color(0xFF333333),
    );

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isUser ? const Color(0xFF1F2A44) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isUser ? const Color(0xFF1F2A44) : const Color(0xFFDDE2E8),
            ),
          ),
          child: RichText(
            text: TextSpan(
              children: _buildStyledSpans(
                input: message.text,
                baseStyle: textStyle,
              ),
              style: textStyle,
            ),
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFDDE2E8)),
        ),
        child: const SizedBox(
          width: 48,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [_TypingDot(), _TypingDot(), _TypingDot()],
          ),
        ),
      ),
    );
  }
}

class _TypingDot extends StatelessWidget {
  const _TypingDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 7,
      height: 7,
      decoration: const BoxDecoration(
        color: Color(0xFFB0B7C1),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color background;
  final Color accent;
  final bool isLoading;
  final VoidCallback? onTap;

  const _ModuleCard({
    required this.label,
    required this.icon,
    required this.background,
    required this.accent,
    this.isLoading = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          isLoading
              ? SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(accent),
                  ),
                )
              : Icon(icon, color: accent, size: 18),
          const Spacer(),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: accent,
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return content;

    return InkWell(
      onTap: isLoading ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: content,
    );
  }
}

class _NotebookItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback? onTap;

  const _NotebookItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final content = Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE6E9ED)),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F4F7),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF65707C)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF7B838E),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.more_vert, color: Color(0xFF9BA3AD), size: 18),
        ],
      ),
    );

    if (onTap == null) return content;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: content,
    );
  }
}

class _MindMapData {
  final String title;
  final List<_MindMapNode> nodes;

  const _MindMapData({required this.title, required this.nodes});

  factory _MindMapData.fromJson(Map<String, dynamic> json) {
    final rawNodes = json['nodes'];
    if (rawNodes is! List) {
      throw const FormatException('Mind map JSON missing "nodes" array.');
    }

    final nodes = rawNodes
        .whereType<Map>()
        .map((e) => _MindMapNode.fromJson(e.cast<String, dynamic>()))
        .toList(growable: false);

    if (nodes.isEmpty) {
      throw const FormatException('Mind map contains no nodes.');
    }

    final title = (json['title']?.toString().trim().isNotEmpty ?? false)
        ? json['title'].toString().trim()
        : 'Study Mind Map';

    return _MindMapData(title: title, nodes: nodes);
  }
}

class _MindMapNode {
  final String id;
  final String label;
  final String? parentId;

  const _MindMapNode({
    required this.id,
    required this.label,
    required this.parentId,
  });

  factory _MindMapNode.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString().trim() ?? '';
    final label = json['label']?.toString().trim() ?? '';
    final parentRaw = json['parentId']?.toString().trim();

    if (id.isEmpty || label.isEmpty) {
      throw const FormatException(
        'Each mind map node must contain id and label.',
      );
    }

    return _MindMapNode(
      id: id,
      label: label,
      parentId: (parentRaw == null || parentRaw.isEmpty || parentRaw == 'null')
          ? null
          : parentRaw,
    );
  }
}

class _QuizSet {
  final String title;
  final List<_QuizQuestion> questions;

  const _QuizSet({required this.title, required this.questions});

  factory _QuizSet.fromJson(Map<String, dynamic> json) {
    final raw = json['questions'];
    if (raw is! List) {
      throw const FormatException('Quiz JSON missing "questions" array.');
    }

    final questions = raw
        .whereType<Map>()
        .map((e) => _QuizQuestion.fromJson(e.cast<String, dynamic>()))
        .toList(growable: false);

    if (questions.isEmpty) {
      throw const FormatException('Quiz has no questions.');
    }

    final title = (json['title']?.toString().trim().isNotEmpty ?? false)
        ? json['title'].toString().trim()
        : 'Practice Quiz';

    return _QuizSet(title: title, questions: questions);
  }
}

class _QuizQuestion {
  final String question;
  final List<String> options;
  final int answerIndex;
  final String explanation;

  const _QuizQuestion({
    required this.question,
    required this.options,
    required this.answerIndex,
    required this.explanation,
  });

  factory _QuizQuestion.fromJson(Map<String, dynamic> json) {
    final question = json['question']?.toString().trim() ?? '';
    final optionsRaw = json['options'];
    final explanation = json['explanation']?.toString().trim() ?? '';
    final answerIndex =
        int.tryParse(json['answerIndex']?.toString() ?? '') ?? -1;

    if (question.isEmpty || optionsRaw is! List || optionsRaw.length != 4) {
      throw const FormatException(
        'Each quiz question needs 1 question and 4 options.',
      );
    }

    final options = optionsRaw.map((e) => e.toString().trim()).toList();
    if (options.any((e) => e.isEmpty)) {
      throw const FormatException('Quiz options cannot be empty.');
    }
    if (answerIndex < 0 || answerIndex >= options.length) {
      throw const FormatException('Quiz answerIndex must be between 0 and 3.');
    }

    return _QuizQuestion(
      question: question,
      options: options,
      answerIndex: answerIndex,
      explanation: explanation.isEmpty
          ? 'No explanation provided.'
          : explanation,
    );
  }
}

class _MindMapEvolution {
  final String title;
  final List<_MindMapEvolutionStage> stages;

  const _MindMapEvolution({required this.title, required this.stages});

  factory _MindMapEvolution.fromJson(Map<String, dynamic> json) {
    final rawStages = json['stages'];
    if (rawStages is! List) {
      throw const FormatException('Evolution JSON missing "stages" array.');
    }

    final stages = rawStages
        .whereType<Map>()
        .map((e) => _MindMapEvolutionStage.fromJson(e.cast<String, dynamic>()))
        .toList(growable: false);

    if (stages.length < 2) {
      throw const FormatException(
        'Evolution replay requires at least 2 stages.',
      );
    }

    final title = (json['title']?.toString().trim().isNotEmpty ?? false)
        ? json['title'].toString().trim()
        : 'Mind Map Evolution Replay';

    return _MindMapEvolution(title: title, stages: stages);
  }
}

class _MindMapEvolutionStage {
  final String stageTitle;
  final String focus;
  final List<_MindMapNode> nodes;

  const _MindMapEvolutionStage({
    required this.stageTitle,
    required this.focus,
    required this.nodes,
  });

  factory _MindMapEvolutionStage.fromJson(Map<String, dynamic> json) {
    final rawNodes = json['nodes'];
    if (rawNodes is! List) {
      throw const FormatException('Each stage must include "nodes".');
    }

    final nodes = rawNodes
        .whereType<Map>()
        .map((e) => _MindMapNode.fromJson(e.cast<String, dynamic>()))
        .toList(growable: false);
    if (nodes.isEmpty) {
      throw const FormatException('Each stage must contain at least one node.');
    }

    final stageTitle =
        (json['stageTitle']?.toString().trim().isNotEmpty ?? false)
        ? json['stageTitle'].toString().trim()
        : 'Stage';
    final focus = (json['focus']?.toString().trim().isNotEmpty ?? false)
        ? json['focus'].toString().trim()
        : 'Progressive understanding';

    return _MindMapEvolutionStage(
      stageTitle: stageTitle,
      focus: focus,
      nodes: nodes,
    );
  }
}

class _MindMapEvolutionDialog extends StatefulWidget {
  final _MindMapEvolution evolution;

  const _MindMapEvolutionDialog({required this.evolution});

  @override
  State<_MindMapEvolutionDialog> createState() =>
      _MindMapEvolutionDialogState();
}

class _MindMapEvolutionDialogState extends State<_MindMapEvolutionDialog> {
  static const Duration _playInterval = Duration(seconds: 2);

  int _stageIndex = 0;
  bool _isPlaying = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startAutoPlay();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startAutoPlay() {
    _timer?.cancel();
    _timer = Timer.periodic(_playInterval, (_) {
      if (!mounted) return;
      setState(() {
        _stageIndex = (_stageIndex + 1) % widget.evolution.stages.length;
      });
    });
  }

  void _togglePlay() {
    if (_isPlaying) {
      _timer?.cancel();
      setState(() => _isPlaying = false);
      return;
    }

    setState(() => _isPlaying = true);
    _startAutoPlay();
  }

  void _goToStage(int index, {bool pause = false}) {
    if (index < 0 || index >= widget.evolution.stages.length) return;
    if (pause) {
      _timer?.cancel();
      _isPlaying = false;
    }
    setState(() {
      _stageIndex = index;
    });
  }

  Set<String> _newNodeIds() {
    final current = widget.evolution.stages[_stageIndex];
    final currentIds = current.nodes.map((e) => e.id).toSet();
    if (_stageIndex == 0) {
      return currentIds;
    }

    final previousIds = widget.evolution.stages[_stageIndex - 1].nodes
        .map((e) => e.id)
        .toSet();
    return currentIds.difference(previousIds);
  }

  List<Widget> _buildNodeTree({
    required String? parentId,
    required Map<String?, List<_MindMapNode>> byParent,
    required Set<String> visited,
    required Set<String> newNodeIds,
    int depth = 0,
  }) {
    final children = byParent[parentId] ?? const <_MindMapNode>[];
    final widgets = <Widget>[];

    for (final node in children) {
      if (visited.contains(node.id)) continue;
      visited.add(node.id);
      final isNew = newNodeIds.contains(node.id);

      widgets.add(
        Padding(
          padding: EdgeInsets.only(left: depth * 14.0, bottom: 8),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: isNew ? const Color(0xFFEDE8FF) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  depth == 0
                      ? Icons.radio_button_checked
                      : Icons.subdirectory_arrow_right,
                  size: depth == 0 ? 14 : 16,
                  color: isNew
                      ? const Color(0xFF7350B6)
                      : const Color(0xFF6A7380),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    node.label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isNew ? FontWeight.w700 : FontWeight.w500,
                      color: const Color(0xFF2F3640),
                    ),
                  ),
                ),
                if (isNew)
                  Container(
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7350B6),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      context.watch<LanguageProvider>().t.isZh ? '新增' : 'NEW',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );

      widgets.addAll(
        _buildNodeTree(
          parentId: node.id,
          byParent: byParent,
          visited: visited,
          newNodeIds: newNodeIds,
          depth: depth + 1,
        ),
      );
    }

    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String tr({required String en, required String zh}) => isZh ? zh : en;
    String displayTitle(String title) {
      if (!isZh) return title;
      switch (title.trim()) {
        case 'Mind Map Evolution Replay':
          return '思维导图演化回放';
        default:
          return title;
      }
    }

    String displayStageTitle(String title) {
      if (!isZh) return title;
      return title.trim() == 'Stage' ? '阶段' : title;
    }

    String displayFocus(String focus) {
      if (!isZh) return focus;
      return focus.trim() == 'Progressive understanding' ? '渐进式理解' : focus;
    }

    final stages = widget.evolution.stages;
    final stage = stages[_stageIndex];
    final newNodeIds = _newNodeIds();

    final byParent = <String?, List<_MindMapNode>>{};
    for (final node in stage.nodes) {
      byParent.putIfAbsent(node.parentId, () => <_MindMapNode>[]).add(node);
    }
    final treeWidgets = _buildNodeTree(
      parentId: null,
      byParent: byParent,
      visited: <String>{},
      newNodeIds: newNodeIds,
    );

    final maxIndex = stages.length - 1;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 780, maxHeight: 720),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.slideshow_outlined,
                    color: Color(0xFF7350B6),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      displayTitle(widget.evolution.title),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF273142),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                tr(
                  en: 'Stage ${_stageIndex + 1}/${stages.length}: ${displayStageTitle(stage.stageTitle)}',
                  zh: '阶段 ${_stageIndex + 1}/${stages.length}: ${displayStageTitle(stage.stageTitle)}',
                ),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF4A5568),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                displayFocus(stage.focus),
                style: const TextStyle(fontSize: 12, color: Color(0xFF6A7380)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  FilledButton.tonalIcon(
                    onPressed: _togglePlay,
                    icon: Icon(_isPlaying ? Icons.pause : Icons.play_arrow),
                    label: Text(
                      _isPlaying
                          ? tr(en: 'Pause Replay', zh: '暂停回放')
                          : tr(en: 'Play Replay', zh: '播放回放'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: _stageIndex == 0
                        ? null
                        : () => _goToStage(_stageIndex - 1, pause: true),
                    child: Text(tr(en: 'Prev', zh: '上一步')),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: _stageIndex == maxIndex
                        ? null
                        : () => _goToStage(_stageIndex + 1, pause: true),
                    child: Text(tr(en: 'Next', zh: '下一步')),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE8FF),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      tr(
                        en: '+${newNodeIds.length} new node(s)',
                        zh: '+${newNodeIds.length} 个新节点',
                      ),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF7350B6),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (maxIndex > 0)
                Slider(
                  value: _stageIndex.toDouble(),
                  min: 0,
                  max: maxIndex.toDouble(),
                  divisions: maxIndex,
                  onChanged: (value) => _goToStage(value.round(), pause: true),
                ),
              const SizedBox(height: 8),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 260),
                  child: Container(
                    key: ValueKey<int>(_stageIndex),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFD),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: ListView(
                      children: treeWidgets.isEmpty
                          ? [
                              Text(
                                tr(
                                  en: 'No nodes generated for this stage.',
                                  zh: '该阶段未生成节点。',
                                ),
                              ),
                            ]
                          : treeWidgets,
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
}

class _MindMapDialog extends StatelessWidget {
  final _MindMapData mindMap;

  const _MindMapDialog({required this.mindMap});

  List<Widget> _buildNodeTree({
    required String? parentId,
    required Map<String?, List<_MindMapNode>> byParent,
    required Set<String> visited,
    int depth = 0,
  }) {
    final children = byParent[parentId] ?? const <_MindMapNode>[];
    final widgets = <Widget>[];

    for (final node in children) {
      if (visited.contains(node.id)) continue;
      visited.add(node.id);

      widgets.add(
        Padding(
          padding: EdgeInsets.only(left: depth * 14.0, bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                depth == 0
                    ? Icons.radio_button_checked
                    : Icons.subdirectory_arrow_right,
                size: depth == 0 ? 14 : 16,
                color: depth == 0
                    ? const Color(0xFF2E74C9)
                    : const Color(0xFF6A7380),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  node.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: depth == 0 ? FontWeight.w700 : FontWeight.w500,
                    color: const Color(0xFF2F3640),
                  ),
                ),
              ),
            ],
          ),
        ),
      );

      widgets.addAll(
        _buildNodeTree(
          parentId: node.id,
          byParent: byParent,
          visited: visited,
          depth: depth + 1,
        ),
      );
    }
    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String tr({required String en, required String zh}) => isZh ? zh : en;
    String displayTitle(String title) {
      if (!isZh) return title;
      return title.trim() == 'Study Mind Map' ? '学习思维导图' : title;
    }

    final byParent = <String?, List<_MindMapNode>>{};
    for (final node in mindMap.nodes) {
      byParent.putIfAbsent(node.parentId, () => <_MindMapNode>[]).add(node);
    }

    final treeWidgets = _buildNodeTree(
      parentId: null,
      byParent: byParent,
      visited: <String>{},
    );

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.account_tree_outlined,
                    color: Color(0xFF2E74C9),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      displayTitle(mindMap.title),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF273142),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  en: 'Generated from your recent tutor conversation.',
                  zh: '根据你最近与导师的对话生成。',
                ),
                style: const TextStyle(fontSize: 12, color: Color(0xFF7B838E)),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFD),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: ListView(
                    children: treeWidgets.isEmpty
                        ? [Text(tr(en: 'No nodes generated.', zh: '未生成节点。'))]
                        : treeWidgets,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuizDialog extends StatefulWidget {
  final _QuizSet quiz;

  const _QuizDialog({required this.quiz});

  @override
  State<_QuizDialog> createState() => _QuizDialogState();
}

class _QuizDialogState extends State<_QuizDialog> {
  int _index = 0;
  final Map<int, int> _selected = <int, int>{};
  bool _submitted = false;

  int get _score {
    var score = 0;
    for (var i = 0; i < widget.quiz.questions.length; i++) {
      if (_selected[i] == widget.quiz.questions[i].answerIndex) {
        score++;
      }
    }
    return score;
  }

  @override
  Widget build(BuildContext context) {
    final isZh = context.watch<LanguageProvider>().t.isZh;
    String tr({required String en, required String zh}) => isZh ? zh : en;
    String displayTitle(String title) {
      if (!isZh) return title;
      return title.trim() == 'Practice Quiz' ? '练习测验' : title;
    }

    final question = widget.quiz.questions[_index];
    final selected = _selected[_index];
    final total = widget.quiz.questions.length;
    final canSubmit = _selected.length == total;
    final explanationText =
        isZh && question.explanation == 'No explanation provided.'
        ? '未提供解析。'
        : question.explanation;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760, maxHeight: 700),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.quiz_outlined, color: Color(0xFF9A7C12)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      displayTitle(widget.quiz.title),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF273142),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  en: 'Question ${_index + 1} of $total',
                  zh: '第 ${_index + 1} 题 / 共 $total 题',
                ),
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF7B838E),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                question.question,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF2F3640),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  itemCount: question.options.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, optionIndex) {
                    final option = question.options[optionIndex];
                    final isCorrect = optionIndex == question.answerIndex;
                    final isChosen = selected == optionIndex;

                    Color border = const Color(0xFFDDE2E8);
                    Color bg = Colors.white;
                    if (_submitted) {
                      if (isCorrect) {
                        border = const Color(0xFF3FA66B);
                        bg = const Color(0xFFE9F8EF);
                      } else if (isChosen && !isCorrect) {
                        border = const Color(0xFFD15B5B);
                        bg = const Color(0xFFFCEEEE);
                      }
                    } else if (isChosen) {
                      border = const Color(0xFF4B6CB7);
                      bg = const Color(0xFFF2F5FF);
                    }

                    return InkWell(
                      onTap: _submitted
                          ? null
                          : () {
                              setState(() {
                                _selected[_index] = optionIndex;
                              });
                            },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: bg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${String.fromCharCode(65 + optionIndex)}.',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF3A4351),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                option,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF3A4351),
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (_submitted) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFD),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    tr(
                      en: 'Explanation: $explanationText',
                      zh: '解析：$explanationText',
                    ),
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF4A5568),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              if (_submitted)
                Text(
                  tr(en: 'Score: $_score / $total', zh: '得分：$_score / $total'),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2F8F57),
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: _index == 0
                        ? null
                        : () => setState(() {
                            _index--;
                          }),
                    child: Text(tr(en: 'Previous', zh: '上一题')),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: _index >= total - 1
                        ? null
                        : () => setState(() {
                            _index++;
                          }),
                    child: Text(tr(en: 'Next', zh: '下一题')),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: !_submitted
                        ? null
                        : () => setState(() {
                            _submitted = false;
                            _selected.clear();
                            _index = 0;
                          }),
                    child: Text(tr(en: 'Retry', zh: '重试')),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _submitted || !canSubmit
                        ? null
                        : () => setState(() {
                            _submitted = true;
                          }),
                    child: Text(tr(en: 'Submit', zh: '提交')),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _MessageKind { user, assistant }

class _ConversationMessage {
  final _MessageKind kind;
  final String text;

  const _ConversationMessage._({required this.kind, required this.text});

  const _ConversationMessage.user(String text)
    : this._(kind: _MessageKind.user, text: text);

  const _ConversationMessage.assistant(String text)
    : this._(kind: _MessageKind.assistant, text: text);
}

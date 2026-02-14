import '../models/course.dart';

/// Result of a schema migration attempt.
class CourseSchemaMigrationResult {
  final bool success;
  final Map<String, dynamic>? migratedJson;
  final String sourceVersion;
  final String targetVersion;
  final List<String> steps;
  final String message;
  final bool didModify;

  const CourseSchemaMigrationResult({
    required this.success,
    required this.sourceVersion,
    required this.targetVersion,
    required this.steps,
    required this.message,
    required this.didModify,
    this.migratedJson,
  });

  bool get wasMigrated => success && didModify;
}

/// Migrates legacy course JSON into the current schema.
class CourseSchemaMigrator {
  CourseSchemaMigrator._();

  static const String _legacyUnversioned = 'legacy-unversioned';
  static const Set<String> _supportedLegacyVersions = {
    _legacyUnversioned,
    '0.8',
    '0.8.0',
    '0.9',
    '0.9.0',
  };

  static const Map<String, String> _blockTypeAliases = {
    'text': 'text',
    'image': 'image',
    'codeblock': 'code-block',
    'code-block': 'code-block',
    'code_block': 'code-block',
    'codeplayground': 'code-playground',
    'code-playground': 'code-playground',
    'code_playground': 'code-playground',
    'multiplechoice': 'multiple-choice',
    'multiple-choice': 'multiple-choice',
    'multiple_choice': 'multiple-choice',
    'fillblank': 'fill-blank',
    'fill-blank': 'fill-blank',
    'fill_blank': 'fill-blank',
    'truefalse': 'true-false',
    'true-false': 'true-false',
    'true_false': 'true-false',
    'matching': 'matching',
    'animation': 'animation',
    'animationblock': 'animation',
    'animation-block': 'animation',
    'animation_block': 'animation',
    'video': 'video',
  };

  static CourseSchemaMigrationResult migrateToCurrent(
    Map<String, dynamic> sourceJson,
  ) {
    final working = _deepCopy(sourceJson);
    final steps = <String>[];

    final sourceVersion = _detectSourceVersion(working);
    steps.add('Detected schema version: $sourceVersion');
    final isLegacySource =
        sourceVersion == _legacyUnversioned || sourceVersion.startsWith('0.');

    final compatibilityError = _checkVersionCompatibility(sourceVersion);
    if (compatibilityError != null) {
      return CourseSchemaMigrationResult(
        success: false,
        sourceVersion: sourceVersion,
        targetVersion: Course.schemaVersion,
        steps: steps,
        message: compatibilityError,
        didModify: false,
      );
    }

    var changed = false;
    if (isLegacySource) {
      changed = _migrateTopLevel(working, steps) || changed;

      final pages = working['pages'];
      if (pages is! List) {
        return CourseSchemaMigrationResult(
          success: false,
          sourceVersion: sourceVersion,
          targetVersion: Course.schemaVersion,
          steps: steps,
          message: 'Cannot migrate: expected top-level "pages" list',
          didModify: changed,
        );
      }

      changed = _migratePagesAndBlocks(working, steps) || changed;
      changed =
          _ensureSchemaMetadata(working, steps, normalizeVersion: true) ||
          changed;
    } else {
      changed =
          _ensureSchemaMetadata(working, steps, normalizeVersion: false) ||
          changed;
    }

    if (!changed) {
      steps.add('No migration changes were required.');
    }

    return CourseSchemaMigrationResult(
      success: true,
      sourceVersion: sourceVersion,
      targetVersion: Course.schemaVersion,
      steps: steps,
      message: changed
          ? 'Migrated to schema ${Course.schemaVersion}'
          : 'Already compatible with schema ${Course.schemaVersion}',
      didModify: changed,
      migratedJson: working,
    );
  }

  static String _detectSourceVersion(Map<String, dynamic> json) {
    final version = _asString(json['schemaVersion'])?.trim();
    if (version == null || version.isEmpty) return _legacyUnversioned;
    return version;
  }

  static String? _checkVersionCompatibility(String sourceVersion) {
    if (_supportedLegacyVersions.contains(sourceVersion)) return null;
    if (sourceVersion == Course.schemaVersion) return null;

    final normalized = sourceVersion.trim();
    if (normalized.startsWith('1.')) {
      // Accept minor/patch revisions on current major.
      return null;
    }

    return 'Unsupported schemaVersion "$sourceVersion". '
        'Supported sources: legacy-unversioned, 0.8.x, 0.9.x, and 1.x.';
  }

  static bool _migrateTopLevel(Map<String, dynamic> json, List<String> steps) {
    var changed = false;

    if (json['pages'] is! List) {
      for (final alias in const ['modules', 'lessons', 'units']) {
        final value = json[alias];
        if (value is List) {
          json['pages'] = value;
          changed = true;
          steps.add('Mapped top-level "$alias" -> "pages".');
          break;
        }
      }
    }

    final courseId = _asString(json['courseId'])?.trim();
    if (courseId == null || courseId.isEmpty) {
      final legacyId = _asString(json['id'])?.trim();
      if (legacyId != null && legacyId.isNotEmpty) {
        json['courseId'] = legacyId;
        changed = true;
        steps.add('Mapped legacy "id" -> "courseId".');
      } else {
        final generated = 'imported-${DateTime.now().millisecondsSinceEpoch}';
        json['courseId'] = generated;
        changed = true;
        steps.add('Generated missing "courseId": $generated');
      }
    }

    final metadata = _ensureMap(
      json,
      'metadata',
      onCreate: () {
        changed = true;
        steps.add('Created missing "metadata" object.');
      },
    );
    final title = _asString(metadata['title'])?.trim();
    if (title == null || title.isEmpty) {
      final rootTitle = _asString(json['title'])?.trim();
      metadata['title'] = (rootTitle == null || rootTitle.isEmpty)
          ? 'Imported Course'
          : rootTitle;
      changed = true;
      steps.add('Backfilled metadata.title.');
    }

    if (_asString(metadata['description']) == null &&
        _asString(json['description']) != null) {
      metadata['description'] = _asString(json['description'])!;
      changed = true;
      steps.add('Backfilled metadata.description from root description.');
    }

    final author = metadata['author'];
    if (author is String && author.trim().isNotEmpty) {
      metadata['author'] = {'userId': 'legacy', 'displayName': author.trim()};
      changed = true;
      steps.add('Converted metadata.author string to object.');
    } else if (author is! Map) {
      metadata['author'] = {'userId': 'legacy', 'displayName': 'Legacy Import'};
      changed = true;
      steps.add('Created default metadata.author object.');
    }

    final tags = metadata['tags'];
    if (tags is String) {
      metadata['tags'] = tags
          .split(',')
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList();
      changed = true;
      steps.add('Converted metadata.tags string to string list.');
    } else if (tags is! List) {
      metadata['tags'] = <String>[];
      changed = true;
      steps.add('Created default metadata.tags list.');
    }

    if (_asString(metadata['difficulty']) == null) {
      metadata['difficulty'] = 'beginner';
      changed = true;
      steps.add('Backfilled metadata.difficulty to "beginner".');
    }

    final estimatedMinutes = metadata['estimatedMinutes'];
    if (estimatedMinutes is num) {
      final normalizedMinutes = estimatedMinutes.toInt();
      if (normalizedMinutes != estimatedMinutes) {
        metadata['estimatedMinutes'] = normalizedMinutes;
        changed = true;
        steps.add('Normalized metadata.estimatedMinutes to integer.');
      }
    } else if (estimatedMinutes == null) {
      metadata['estimatedMinutes'] = 30;
      changed = true;
      steps.add('Backfilled metadata.estimatedMinutes to 30.');
    }

    final nowIso = DateTime.now().toIso8601String();
    if (_asString(metadata['createdAt']) == null) {
      metadata['createdAt'] = nowIso;
      changed = true;
      steps.add('Backfilled metadata.createdAt.');
    }
    if (_asString(metadata['updatedAt']) == null) {
      metadata['updatedAt'] = nowIso;
      changed = true;
      steps.add('Backfilled metadata.updatedAt.');
    }
    if (_asString(metadata['version']) == null) {
      metadata['version'] = Course.schemaVersion;
      changed = true;
      steps.add('Backfilled metadata.version.');
    }

    final settings = json['settings'];
    if (settings is! Map) {
      json['settings'] = {
        'theme': 'light',
        'primaryColor': 'blue',
        'fontFamily': 'system',
      };
      changed = true;
      steps.add('Created default "settings" object.');
    } else {
      final settingsMap = Map<String, dynamic>.from(settings);
      var settingsChanged = false;
      if (_asString(settingsMap['theme']) == null) {
        settingsMap['theme'] = 'light';
        settingsChanged = true;
      }
      if (_asString(settingsMap['primaryColor']) == null) {
        settingsMap['primaryColor'] = 'blue';
        settingsChanged = true;
      }
      if (_asString(settingsMap['fontFamily']) == null) {
        settingsMap['fontFamily'] = 'system';
        settingsChanged = true;
      }
      if (settingsChanged) {
        json['settings'] = settingsMap;
        changed = true;
        steps.add('Backfilled missing settings fields.');
      }
    }

    return changed;
  }

  static bool _migratePagesAndBlocks(
    Map<String, dynamic> json,
    List<String> steps,
  ) {
    final pagesRaw = json['pages'] as List<dynamic>;
    final normalizedPages = <Map<String, dynamic>>[];
    final usedBlockIds = <String>{};

    var changed = false;
    var pageAliasMappings = 0;
    var blockTypeConversions = 0;
    var generatedBlockIds = 0;

    for (int pageIndex = 0; pageIndex < pagesRaw.length; pageIndex++) {
      final rawPage = pagesRaw[pageIndex];
      final pageMap = rawPage is Map
          ? Map<String, dynamic>.from(rawPage)
          : <String, dynamic>{};

      String? pageId = _asString(pageMap['pageId'])?.trim();
      if (pageId == null || pageId.isEmpty) {
        final legacyPageId = _asString(pageMap['id'])?.trim();
        if (legacyPageId != null && legacyPageId.isNotEmpty) {
          pageId = legacyPageId;
          pageAliasMappings += 1;
          changed = true;
        } else {
          pageId = 'page-${pageIndex + 1}';
          changed = true;
        }
      }

      String? pageTitle = _asString(pageMap['title'])?.trim();
      if (pageTitle == null || pageTitle.isEmpty) {
        final legacyName = _asString(pageMap['name'])?.trim();
        pageTitle = (legacyName == null || legacyName.isEmpty)
            ? 'Page ${pageIndex + 1}'
            : legacyName;
        pageAliasMappings += 1;
        changed = true;
      }

      dynamic blocksRaw = pageMap['blocks'];
      if (blocksRaw is! List) {
        for (final alias in const ['items', 'modules', 'contentBlocks']) {
          final aliasValue = pageMap[alias];
          if (aliasValue is List) {
            blocksRaw = aliasValue;
            pageAliasMappings += 1;
            changed = true;
            break;
          }
        }
      }
      blocksRaw = blocksRaw is List ? blocksRaw : <dynamic>[];

      final normalizedBlocks = <Map<String, dynamic>>[];
      for (int blockIndex = 0; blockIndex < blocksRaw.length; blockIndex++) {
        final rawBlock = blocksRaw[blockIndex];
        final blockMap = rawBlock is Map
            ? Map<String, dynamic>.from(rawBlock)
            : <String, dynamic>{};

        final typeCandidate =
            _asString(blockMap['type']) ??
            _asString(blockMap['blockType']) ??
            _asString(blockMap['kind']) ??
            'text';
        final normalizedType = _normalizeBlockType(typeCandidate);
        if (normalizedType != typeCandidate) {
          blockTypeConversions += 1;
          changed = true;
        }

        var blockId =
            (_asString(blockMap['id']) ?? _asString(blockMap['blockId']))
                ?.trim();
        if (blockId == null ||
            blockId.isEmpty ||
            usedBlockIds.contains(blockId)) {
          blockId = _generateBlockId(
            pageIndex: pageIndex,
            blockIndex: blockIndex,
            usedIds: usedBlockIds,
          );
          generatedBlockIds += 1;
          changed = true;
        }
        usedBlockIds.add(blockId);

        final positionRaw = blockMap['position'];
        int order = blockIndex;
        if (positionRaw is Map) {
          final rawOrder = positionRaw['order'];
          if (rawOrder is int) {
            order = rawOrder;
          } else if (rawOrder is num) {
            order = rawOrder.toInt();
            changed = true;
          }
        }

        final style = blockMap['style'] is Map
            ? Map<String, dynamic>.from(blockMap['style'] as Map)
            : <String, dynamic>{};
        if (_asString(style['spacing']) == null) style['spacing'] = 'md';
        if (_asString(style['alignment']) == null) style['alignment'] = 'left';

        final visibilityRule =
            _asString(blockMap['visibilityRule']) ?? 'always';
        final content = _normalizeBlockContent(
          type: normalizedType,
          blockMap: blockMap,
        );

        normalizedBlocks.add({
          'type': normalizedType,
          'id': blockId,
          'position': {'order': order},
          'style': style,
          'visibilityRule': visibilityRule,
          'content': content,
        });
      }

      for (int i = 0; i < normalizedBlocks.length; i++) {
        final block = normalizedBlocks[i];
        final position = block['position'] as Map<String, dynamic>;
        if (position['order'] != i) {
          position['order'] = i;
          changed = true;
        }
      }

      normalizedPages.add({
        'pageId': pageId,
        'title': pageTitle,
        'blocks': normalizedBlocks,
      });
    }

    if (pageAliasMappings > 0) {
      steps.add('Applied $pageAliasMappings legacy page alias mapping(s).');
    }
    if (blockTypeConversions > 0) {
      steps.add('Converted $blockTypeConversions legacy block type value(s).');
    }
    if (generatedBlockIds > 0) {
      steps.add('Generated $generatedBlockIds missing/duplicate block id(s).');
    }

    if (!_mapEquals(json['pages'], normalizedPages)) {
      json['pages'] = normalizedPages;
      changed = true;
    }

    return changed;
  }

  static Map<String, dynamic> _normalizeBlockContent({
    required String type,
    required Map<String, dynamic> blockMap,
  }) {
    final rawContent = blockMap['content'];
    final content = rawContent is Map
        ? Map<String, dynamic>.from(rawContent)
        : <String, dynamic>{};

    if (type == 'text') {
      final rawValue =
          _asString(content['value']) ??
          _asString(content['text']) ??
          _asString(blockMap['text']) ??
          (rawContent is String ? rawContent : null) ??
          '';
      final format = _asString(content['format']) ?? 'markdown';
      return {
        'format': format == 'plain' ? 'plain' : 'markdown',
        'value': rawValue,
      };
    }

    if (type == 'code-block') {
      return {
        'language':
            _asString(content['language']) ??
            _asString(blockMap['language']) ??
            'python',
        'code': _asString(content['code']) ?? _asString(blockMap['code']) ?? '',
      };
    }

    if (type == 'code-playground') {
      final hints = _normalizeStringList(content['hints']);
      final runnable = content['runnable'] is bool
          ? content['runnable'] as bool
          : true;
      return {
        'language':
            _asString(content['language']) ??
            _asString(blockMap['language']) ??
            'python',
        'initialCode':
            _asString(content['initialCode']) ??
            _asString(content['code']) ??
            _asString(blockMap['code']) ??
            '',
        if (_asString(content['expectedOutput']) != null)
          'expectedOutput': _asString(content['expectedOutput']),
        'hints': hints,
        'runnable': runnable,
      };
    }

    if (type == 'multiple-choice') {
      final question =
          _asString(content['question']) ??
          _asString(blockMap['question']) ??
          '';
      final options = _normalizeChoiceOptions(content['options']);
      final normalizedAnswers = _normalizeCorrectAnswers(
        content: content,
        options: options,
      );
      final multiSelect = content['multiSelect'] is bool
          ? content['multiSelect'] as bool
          : normalizedAnswers.length > 1;
      return {
        'question': question,
        'options': options,
        'correctAnswer': normalizedAnswers.isNotEmpty
            ? normalizedAnswers.first
            : '',
        'correctAnswers': normalizedAnswers.isNotEmpty
            ? (multiSelect ? normalizedAnswers : [normalizedAnswers.first])
            : <String>[],
        'multiSelect': multiSelect,
        if (_asString(content['explanation']) != null)
          'explanation': _asString(content['explanation']),
      };
    }

    if (type == 'fill-blank') {
      return {
        'question':
            _asString(content['question']) ??
            _asString(blockMap['question']) ??
            '',
        'correctAnswer':
            _asString(content['correctAnswer']) ??
            _asString(content['answer']) ??
            _asString(blockMap['correctAnswer']) ??
            '',
        if (_asString(content['hint']) != null)
          'hint': _asString(content['hint']),
      };
    }

    if (type == 'true-false') {
      final rawAnswer = content['correctAnswer'];
      bool normalizedAnswer = true;
      if (rawAnswer is bool) {
        normalizedAnswer = rawAnswer;
      } else if (rawAnswer is String) {
        normalizedAnswer = rawAnswer.trim().toLowerCase() == 'true';
      }
      return {
        'question':
            _asString(content['question']) ??
            _asString(blockMap['question']) ??
            '',
        'correctAnswer': normalizedAnswer,
        if (_asString(content['explanation']) != null)
          'explanation': _asString(content['explanation']),
      };
    }

    if (type == 'matching') {
      return {
        'question':
            _asString(content['question']) ??
            _asString(blockMap['question']) ??
            '',
        'leftItems': _normalizeMatchingItems(content['leftItems'], 'l'),
        'rightItems': _normalizeMatchingItems(content['rightItems'], 'r'),
        'correctPairs': _normalizeMatchingPairs(content['correctPairs']),
        if (_asString(content['explanation']) != null)
          'explanation': _asString(content['explanation']),
      };
    }

    if (type == 'image') {
      return {
        'url': _asString(content['url']) ?? _asString(content['src']) ?? '',
        if (_asString(content['alt']) != null) 'alt': _asString(content['alt']),
        if (_asString(content['caption']) != null)
          'caption': _asString(content['caption']),
      };
    }

    if (type == 'animation') {
      final rawDuration =
          content['durationMs'] ??
          content['duration'] ??
          blockMap['durationMs'];
      final durationMs = rawDuration is num ? rawDuration.toInt() : 2000;
      final rawSpeed = content['speed'] ?? blockMap['speed'];
      final speed = rawSpeed is num ? rawSpeed.toDouble() : 1.0;
      final rawLoop = content['loop'] ?? blockMap['loop'];
      final loop = rawLoop is bool ? rawLoop : true;
      return {
        'preset': _normalizeAnimationPreset(
          _asString(content['preset']) ??
              _asString(content['animationPreset']) ??
              _asString(blockMap['preset']) ??
              _asString(blockMap['animationPreset']) ??
              'bouncing-dot',
        ),
        'durationMs': durationMs,
        'loop': loop,
        'speed': speed,
      };
    }

    if (type == 'video') {
      return {
        'url': _asString(content['url']) ?? _asString(content['src']) ?? '',
        if (_asString(content['title']) != null)
          'title': _asString(content['title']),
      };
    }

    return content;
  }

  static List<Map<String, dynamic>> _normalizeChoiceOptions(
    dynamic rawOptions,
  ) {
    if (rawOptions is! List) {
      return const [
        {'id': 'a', 'text': 'Option A'},
        {'id': 'b', 'text': 'Option B'},
      ];
    }

    final normalized = <Map<String, dynamic>>[];
    for (int i = 0; i < rawOptions.length; i++) {
      final raw = rawOptions[i];
      final fallbackId = String.fromCharCode(97 + i);
      if (raw is String) {
        final text = raw.trim();
        if (text.isEmpty) continue;
        normalized.add({'id': fallbackId, 'text': text});
        continue;
      }
      if (raw is! Map) continue;

      final map = Map<String, dynamic>.from(raw);
      final id = (_asString(map['id']) ?? fallbackId).trim();
      final text =
          (_asString(map['text']) ??
                  _asString(map['label']) ??
                  _asString(map['value']) ??
                  '')
              .trim();
      if (text.isEmpty) continue;
      normalized.add({'id': id.isEmpty ? fallbackId : id, 'text': text});
    }

    if (normalized.length < 2) {
      return const [
        {'id': 'a', 'text': 'Option A'},
        {'id': 'b', 'text': 'Option B'},
      ];
    }
    return normalized;
  }

  static List<String> _normalizeCorrectAnswers({
    required Map<String, dynamic> content,
    required List<Map<String, dynamic>> options,
  }) {
    final optionIds = options.map((option) => option['id'] as String).toList();
    final optionIdSet = optionIds.toSet();

    final normalized = <String>[];
    final seen = <String>{};

    final rawCorrectAnswers = content['correctAnswers'];
    if (rawCorrectAnswers is List) {
      for (final raw in rawCorrectAnswers) {
        final answer = _asString(raw)?.trim();
        if (answer == null || answer.isEmpty) continue;
        if (optionIdSet.contains(answer) && seen.add(answer)) {
          normalized.add(answer);
          continue;
        }
        final matchByText = _matchOptionIdByText(answer, options);
        if (matchByText != null && seen.add(matchByText)) {
          normalized.add(matchByText);
        }
      }
    } else if (rawCorrectAnswers is String) {
      final answer = rawCorrectAnswers.trim();
      if (answer.isNotEmpty) {
        if (optionIdSet.contains(answer) && seen.add(answer)) {
          normalized.add(answer);
        } else {
          final matchByText = _matchOptionIdByText(answer, options);
          if (matchByText != null && seen.add(matchByText)) {
            normalized.add(matchByText);
          }
        }
      }
    }

    final rawCorrectAnswer = content['correctAnswer'];
    if (rawCorrectAnswer is String) {
      final answer = rawCorrectAnswer.trim();
      if (answer.isNotEmpty) {
        if (optionIdSet.contains(answer) && seen.add(answer)) {
          normalized.add(answer);
        } else {
          final matchByText = _matchOptionIdByText(answer, options);
          if (matchByText != null && seen.add(matchByText)) {
            normalized.add(matchByText);
          }
        }
      }
    } else if (rawCorrectAnswer is num) {
      final index = rawCorrectAnswer.toInt();
      if (index >= 0 && index < optionIds.length) {
        final id = optionIds[index];
        if (seen.add(id)) normalized.add(id);
      }
    }

    if (normalized.isEmpty && optionIds.isNotEmpty) {
      normalized.add(optionIds.first);
    }

    return normalized;
  }

  static String? _matchOptionIdByText(
    String candidate,
    List<Map<String, dynamic>> options,
  ) {
    final normalized = candidate.trim().toLowerCase();
    if (normalized.isEmpty) return null;
    for (final option in options) {
      final text = (option['text'] as String).trim().toLowerCase();
      if (text == normalized) return option['id'] as String;
    }
    return null;
  }

  static List<Map<String, dynamic>> _normalizeMatchingItems(
    dynamic rawItems,
    String prefix,
  ) {
    if (rawItems is! List) return const [];
    final normalized = <Map<String, dynamic>>[];
    for (int i = 0; i < rawItems.length; i++) {
      final raw = rawItems[i];
      if (raw is String) {
        final text = raw.trim();
        if (text.isEmpty) continue;
        normalized.add({'id': '$prefix${i + 1}', 'text': text});
        continue;
      }
      if (raw is! Map) continue;

      final map = Map<String, dynamic>.from(raw);
      final id = (_asString(map['id']) ?? '$prefix${i + 1}').trim();
      final text = (_asString(map['text']) ?? _asString(map['label']) ?? '')
          .trim();
      if (text.isEmpty) continue;
      normalized.add({'id': id.isEmpty ? '$prefix${i + 1}' : id, 'text': text});
    }
    return normalized;
  }

  static List<Map<String, dynamic>> _normalizeMatchingPairs(dynamic rawPairs) {
    if (rawPairs is! List) return const [];
    final normalized = <Map<String, dynamic>>[];
    for (final raw in rawPairs) {
      if (raw is! Map) continue;
      final map = Map<String, dynamic>.from(raw);
      final left = _asString(map['leftId'])?.trim();
      final right = _asString(map['rightId'])?.trim();
      if (left == null || left.isEmpty || right == null || right.isEmpty) {
        continue;
      }
      normalized.add({'leftId': left, 'rightId': right});
    }
    return normalized;
  }

  static bool _ensureSchemaMetadata(
    Map<String, dynamic> json,
    List<String> steps, {
    required bool normalizeVersion,
  }) {
    var changed = false;

    if (_asString(json[r'$schema']) != Course.schemaUrl) {
      json[r'$schema'] = Course.schemaUrl;
      changed = true;
      steps.add('Normalized \$schema to current schema URL.');
    }

    if (normalizeVersion &&
        _asString(json['schemaVersion']) != Course.schemaVersion) {
      json['schemaVersion'] = Course.schemaVersion;
      changed = true;
      steps.add('Set schemaVersion to ${Course.schemaVersion}.');
    }

    return changed;
  }

  static Map<String, dynamic> _deepCopy(Map<String, dynamic> source) {
    final result = <String, dynamic>{};
    for (final entry in source.entries) {
      result[entry.key] = _deepCopyValue(entry.value);
    }
    return result;
  }

  static dynamic _deepCopyValue(dynamic value) {
    if (value is Map) {
      return value.map(
        (key, val) => MapEntry(key.toString(), _deepCopyValue(val)),
      );
    }
    if (value is List) {
      return value.map(_deepCopyValue).toList();
    }
    return value;
  }

  static Map<String, dynamic> _ensureMap(
    Map<String, dynamic> json,
    String key, {
    required void Function() onCreate,
  }) {
    final raw = json[key];
    if (raw is Map) {
      final normalized = Map<String, dynamic>.from(raw);
      if (!identical(raw, normalized)) {
        json[key] = normalized;
      }
      return normalized;
    }
    onCreate();
    final created = <String, dynamic>{};
    json[key] = created;
    return created;
  }

  static String _normalizeBlockType(String rawType) {
    final normalized = rawType.trim().toLowerCase();
    if (normalized.isEmpty) return 'text';
    return _blockTypeAliases[normalized] ?? 'text';
  }

  static String _generateBlockId({
    required int pageIndex,
    required int blockIndex,
    required Set<String> usedIds,
  }) {
    var seq = 1;
    while (true) {
      final candidate = 'block-p${pageIndex + 1}-b${blockIndex + 1}-$seq';
      if (usedIds.add(candidate)) return candidate;
      seq += 1;
    }
  }

  static List<String> _normalizeStringList(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<String>()
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  static String _normalizeAnimationPreset(String rawPreset) {
    final normalized = rawPreset.trim().toLowerCase();
    switch (normalized) {
      case 'pulse-bars':
      case 'pulsebars':
      case 'bars':
      case 'wave-bars':
        return 'pulse-bars';
      case 'bouncing-dot':
      case 'bouncingdot':
      case 'bounce':
      case 'dot':
      default:
        return 'bouncing-dot';
    }
  }

  static String? _asString(dynamic value) => value is String ? value : null;

  static bool _mapEquals(dynamic left, dynamic right) {
    if (left is List && right is List) {
      if (left.length != right.length) return false;
      for (int i = 0; i < left.length; i++) {
        if (!_mapEquals(left[i], right[i])) return false;
      }
      return true;
    }
    if (left is Map && right is Map) {
      if (left.length != right.length) return false;
      for (final key in left.keys) {
        if (!right.containsKey(key)) return false;
        if (!_mapEquals(left[key], right[key])) return false;
      }
      return true;
    }
    return left == right;
  }
}

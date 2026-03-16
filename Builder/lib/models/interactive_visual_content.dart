/// InteractiveVisualContent — unified visual simulation block model.
/// Replaces the legacy AnimationContent as the canonical visual block.
/// This is a part of block.dart's library so it can implement BlockContent
/// without a circular import.
part of 'block.dart';

/// Modes for interactive-visual blocks
class VisualMode {
  static const String presentation = 'presentation';
  static const String interactive = 'interactive';
  static const String guided = 'guided';
  static const String assessment = 'assessment';
  static const Set<String> all = {
    presentation,
    interactive,
    guided,
    assessment,
  };
}

/// Layout preset
class VisualLayoutPreset {
  static const String split = 'split'; // controls left/right + scene
  static const String stack = 'stack'; // controls top/bottom + scene
  static const String sceneOnly = 'scene-only'; // just the scene
  static const Set<String> all = {split, stack, sceneOnly};
}

/// Theme tone
class VisualThemeTone {
  static const String lightScience = 'light-science';
  static const String chalk = 'chalk';
  static const String lab = 'lab';
  static const Set<String> all = {lightScience, chalk, lab};
}

/// A visual control descriptor (slider, button, toggle, etc.)
class VisualControl {
  static const String typeSlider = 'slider';
  static const String typeButton = 'button';
  static const String typeToggle = 'toggle';
  static const String typeStepper = 'stepper';
  static const String typeDropdown = 'dropdown';

  final String id;
  final String type;
  final String label;
  final String? stateKey; // which state key this control drives
  final double? min;
  final double? max;
  final double? step;
  final dynamic defaultValue;
  final List<String>? options; // for dropdown
  final String? action; // for button: 'play'|'pause'|'reset'|'step'|'check'|'randomize'
  final String? unit; // e.g. 'K', 'atm', 'm³'

  const VisualControl({
    required this.id,
    required this.type,
    required this.label,
    this.stateKey,
    this.min,
    this.max,
    this.step,
    this.defaultValue,
    this.options,
    this.action,
    this.unit,
  });

  factory VisualControl.fromJson(Map<String, dynamic> json) {
    return VisualControl(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? typeSlider,
      label: json['label'] as String? ?? '',
      stateKey: json['stateKey'] as String?,
      min: (json['min'] as num?)?.toDouble(),
      max: (json['max'] as num?)?.toDouble(),
      step: (json['step'] as num?)?.toDouble(),
      defaultValue: json['defaultValue'],
      options: (json['options'] as List<dynamic>?)?.cast<String>(),
      action: json['action'] as String?,
      unit: json['unit'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'id': id, 'type': type, 'label': label};
    if (stateKey != null) m['stateKey'] = stateKey;
    if (min != null) m['min'] = min;
    if (max != null) m['max'] = max;
    if (step != null) m['step'] = step;
    if (defaultValue != null) m['defaultValue'] = defaultValue;
    if (options != null) m['options'] = options;
    if (action != null) m['action'] = action;
    if (unit != null) m['unit'] = unit;
    return m;
  }
}

/// A formula descriptor for display
class VisualFormula {
  final String id;
  final String expression; // e.g. 'PV = nRT'
  final String? description;
  final Map<String, String>? variableLabels; // e.g. {'P': 'Pressure', 'V': 'Volume'}

  const VisualFormula({
    required this.id,
    required this.expression,
    this.description,
    this.variableLabels,
  });

  factory VisualFormula.fromJson(Map<String, dynamic> json) {
    final rawLabels = json['variableLabels'];
    return VisualFormula(
      id: json['id'] as String? ?? '',
      expression: json['expression'] as String? ?? '',
      description: json['description'] as String?,
      variableLabels:
          rawLabels is Map
              ? Map<String, String>.from(
                rawLabels.map((k, v) => MapEntry(k.toString(), v.toString())),
              )
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'id': id, 'expression': expression};
    if (description != null) m['description'] = description;
    if (variableLabels != null) m['variableLabels'] = variableLabels;
    return m;
  }
}

/// A check predicate for assessment mode
class VisualCheck {
  final String id;
  final String description;
  final String stateKey;
  final String operator; // 'eq'|'gt'|'lt'|'gte'|'lte'|'range'
  final dynamic target;
  final dynamic targetMax; // for 'range'
  final String? feedbackCorrect;
  final String? feedbackIncorrect;

  const VisualCheck({
    required this.id,
    required this.description,
    required this.stateKey,
    required this.operator,
    required this.target,
    this.targetMax,
    this.feedbackCorrect,
    this.feedbackIncorrect,
  });

  factory VisualCheck.fromJson(Map<String, dynamic> json) {
    return VisualCheck(
      id: json['id'] as String? ?? '',
      description: json['description'] as String? ?? '',
      stateKey: json['stateKey'] as String? ?? '',
      operator: json['operator'] as String? ?? 'eq',
      target: json['target'],
      targetMax: json['targetMax'],
      feedbackCorrect: json['feedbackCorrect'] as String?,
      feedbackIncorrect: json['feedbackIncorrect'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{
      'id': id,
      'description': description,
      'stateKey': stateKey,
      'operator': operator,
      'target': target,
    };
    if (targetMax != null) m['targetMax'] = targetMax;
    if (feedbackCorrect != null) m['feedbackCorrect'] = feedbackCorrect;
    if (feedbackIncorrect != null) m['feedbackIncorrect'] = feedbackIncorrect;
    return m;
  }

  /// Evaluate this check against a given state map
  bool evaluate(Map<String, dynamic> state) {
    final value = state[stateKey];
    if (value == null) return false;
    final num? v =
        value is num ? value : num.tryParse(value.toString());
    final num? t =
        target is num
            ? target as num
            : num.tryParse(target?.toString() ?? '');
    if (v == null || t == null) return value.toString() == target?.toString();
    switch (operator) {
      case 'eq':
        return (v - t).abs() < 0.001;
      case 'gt':
        return v > t;
      case 'lt':
        return v < t;
      case 'gte':
        return v >= t;
      case 'lte':
        return v <= t;
      case 'range':
        final num? tMax =
            targetMax is num
                ? targetMax as num
                : num.tryParse(targetMax?.toString() ?? '');
        return tMax != null && v >= t && v <= tMax;
      default:
        return false;
    }
  }
}

/// Playback configuration
class VisualPlayback {
  final bool autoplay;
  final bool allowStep;
  final bool allowReset;
  final int transitionMs;

  const VisualPlayback({
    this.autoplay = false,
    this.allowStep = true,
    this.allowReset = true,
    this.transitionMs = 200,
  });

  factory VisualPlayback.fromJson(Map<String, dynamic> json) {
    return VisualPlayback(
      autoplay: json['autoplay'] as bool? ?? false,
      allowStep: json['allowStep'] as bool? ?? true,
      allowReset: json['allowReset'] as bool? ?? true,
      transitionMs: json['transitionMs'] as int? ?? 200,
    );
  }

  Map<String, dynamic> toJson() => {
    'autoplay': autoplay,
    'allowStep': allowStep,
    'allowReset': allowReset,
    'transitionMs': transitionMs,
  };

  VisualPlayback copyWith({
    bool? autoplay,
    bool? allowStep,
    bool? allowReset,
    int? transitionMs,
  }) => VisualPlayback(
    autoplay: autoplay ?? this.autoplay,
    allowStep: allowStep ?? this.allowStep,
    allowReset: allowReset ?? this.allowReset,
    transitionMs: transitionMs ?? this.transitionMs,
  );
}

/// The canonical content model for interactive-visual blocks.
/// Replaces AnimationContent as the unified visual block.
class InteractiveVisualContent implements BlockContent {
  static const String engineVersion = 'sim-v1';
  static const String templateGeneric = 'generic';
  static const String templateIdealGasPiston = 'ideal-gas-piston';
  static const String templateSortingBars = 'sorting-bars';
  static const String templateVariableBindingMemory = 'variable-binding-memory';
  static const String templateFunctionPlot = 'function-plot';
  static const String templatePendulum = 'pendulum';
  static const String templateWave = 'wave';
  static const String templateProjectile = 'projectile';
  static const String templatePythagorean = 'pythagorean';
  static const String templateUnitCircle = 'unit-circle';
  static const Set<String> knownTemplates = {
    templateGeneric,
    templateIdealGasPiston,
    templateSortingBars,
    templateVariableBindingMemory,
    templateFunctionPlot,
    templatePendulum,
    templateWave,
    templateProjectile,
    templatePythagorean,
    templateUnitCircle,
  };

  final String version;
  final String mode;
  final String template;
  final String title;
  final String? description;

  // Layout
  final String layoutPreset; // 'split' | 'stack' | 'scene-only'
  final String? controlsPosition; // 'left' | 'right' | 'bottom'
  final String? formulaPosition; // 'top' | 'left' | 'hidden'

  // Theme
  final String themeTone; // 'light-science' | 'chalk' | 'lab'
  final String? accentColor;

  // State
  final Map<String, dynamic> initialState;
  final List<Map<String, dynamic>> derivedState; // derived state rules

  // Controls, formulas, checks
  final List<VisualControl> controls;
  final List<VisualFormula> formulas;
  final List<VisualCheck> checks;

  // Scene (template-specific data)
  final Map<String, dynamic> scene;

  // Bindings: stateKey -> visual property paths
  final Map<String, dynamic> bindings;

  // Actions available
  final List<String> actions;

  // Playback
  final VisualPlayback playback;

  // Meta
  final String? aiPrompt;
  final Map<String, dynamic>? generationMeta;

  // Legacy fallback: customHtml from old animation blocks
  final String? legacyCustomHtml;

  const InteractiveVisualContent({
    this.version = engineVersion,
    this.mode = VisualMode.presentation,
    this.template = templateGeneric,
    this.title = '',
    this.description,
    this.layoutPreset = VisualLayoutPreset.split,
    this.controlsPosition = 'left',
    this.formulaPosition = 'top',
    this.themeTone = VisualThemeTone.lightScience,
    this.accentColor,
    this.initialState = const {},
    this.derivedState = const [],
    this.controls = const [],
    this.formulas = const [],
    this.checks = const [],
    this.scene = const {},
    this.bindings = const {},
    this.actions = const [],
    this.playback = const VisualPlayback(),
    this.aiPrompt,
    this.generationMeta,
    this.legacyCustomHtml,
  });

  factory InteractiveVisualContent.fromJson(Map<String, dynamic> json) {
    final controlsRaw = json['controls'];
    final formulasRaw = json['formulas'];
    final checksRaw = json['checks'];
    final derivedRaw = json['derivedState'];
    final actionsRaw = json['actions'];
    final generationMetaRaw = json['generationMeta'];

    return InteractiveVisualContent(
      version: json['version'] as String? ?? engineVersion,
      mode: _normalizeMode(json['mode'] as String?),
      template: json['template'] as String? ?? templateGeneric,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      layoutPreset: _normalizeLayoutPreset(json['layoutPreset'] as String?),
      controlsPosition: json['controlsPosition'] as String?,
      formulaPosition: json['formulaPosition'] as String?,
      themeTone: _normalizeThemeTone(json['themeTone'] as String?),
      accentColor: json['accentColor'] as String?,
      initialState: _asStringDynamicMap(json['initialState']) ?? {},
      derivedState:
          derivedRaw is List
              ? derivedRaw
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
              : [],
      controls:
          controlsRaw is List
              ? controlsRaw
                  .whereType<Map>()
                  .map(
                    (e) => VisualControl.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
      formulas:
          formulasRaw is List
              ? formulasRaw
                  .whereType<Map>()
                  .map(
                    (e) => VisualFormula.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
      checks:
          checksRaw is List
              ? checksRaw
                  .whereType<Map>()
                  .map(
                    (e) => VisualCheck.fromJson(Map<String, dynamic>.from(e)),
                  )
                  .toList()
              : [],
      scene: _asStringDynamicMap(json['scene']) ?? {},
      bindings: _asStringDynamicMap(json['bindings']) ?? {},
      actions: actionsRaw is List ? actionsRaw.cast<String>() : [],
      playback:
          json['playback'] is Map
              ? VisualPlayback.fromJson(
                Map<String, dynamic>.from(json['playback'] as Map),
              )
              : const VisualPlayback(),
      aiPrompt: json['aiPrompt'] as String?,
      generationMeta:
          generationMetaRaw is Map
              ? Map<String, dynamic>.from(generationMetaRaw)
              : null,
      legacyCustomHtml: json['legacyCustomHtml'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{
      'version': version,
      'mode': mode,
      'template': template,
      'title': title,
      'layoutPreset': layoutPreset,
      'themeTone': themeTone,
      'initialState': initialState,
      'controls': controls.map((c) => c.toJson()).toList(),
      'formulas': formulas.map((f) => f.toJson()).toList(),
      'checks': checks.map((c) => c.toJson()).toList(),
      'scene': scene,
      'bindings': bindings,
      'actions': actions,
      'playback': playback.toJson(),
    };
    if (description != null) m['description'] = description;
    if (controlsPosition != null) m['controlsPosition'] = controlsPosition;
    if (formulaPosition != null) m['formulaPosition'] = formulaPosition;
    if (accentColor != null) m['accentColor'] = accentColor;
    if (derivedState.isNotEmpty) m['derivedState'] = derivedState;
    if (aiPrompt != null) m['aiPrompt'] = aiPrompt;
    if (generationMeta != null) m['generationMeta'] = generationMeta;
    if (legacyCustomHtml != null) m['legacyCustomHtml'] = legacyCustomHtml;
    return m;
  }

  InteractiveVisualContent copyWith({
    String? version,
    String? mode,
    String? template,
    String? title,
    String? description,
    String? layoutPreset,
    String? controlsPosition,
    String? formulaPosition,
    String? themeTone,
    String? accentColor,
    Map<String, dynamic>? initialState,
    List<Map<String, dynamic>>? derivedState,
    List<VisualControl>? controls,
    List<VisualFormula>? formulas,
    List<VisualCheck>? checks,
    Map<String, dynamic>? scene,
    Map<String, dynamic>? bindings,
    List<String>? actions,
    VisualPlayback? playback,
    String? aiPrompt,
    Map<String, dynamic>? generationMeta,
    String? legacyCustomHtml,
    bool clearLegacyCustomHtml = false,
    bool clearAiPrompt = false,
  }) {
    return InteractiveVisualContent(
      version: version ?? this.version,
      mode: _normalizeMode(mode ?? this.mode),
      template: template ?? this.template,
      title: title ?? this.title,
      description: description ?? this.description,
      layoutPreset: _normalizeLayoutPreset(layoutPreset ?? this.layoutPreset),
      controlsPosition: controlsPosition ?? this.controlsPosition,
      formulaPosition: formulaPosition ?? this.formulaPosition,
      themeTone: _normalizeThemeTone(themeTone ?? this.themeTone),
      accentColor: accentColor ?? this.accentColor,
      initialState: initialState ?? this.initialState,
      derivedState: derivedState ?? this.derivedState,
      controls: controls ?? this.controls,
      formulas: formulas ?? this.formulas,
      checks: checks ?? this.checks,
      scene: scene ?? this.scene,
      bindings: bindings ?? this.bindings,
      actions: actions ?? this.actions,
      playback: playback ?? this.playback,
      aiPrompt: clearAiPrompt ? null : (aiPrompt ?? this.aiPrompt),
      generationMeta: generationMeta ?? this.generationMeta,
      legacyCustomHtml:
          clearLegacyCustomHtml
              ? null
              : (legacyCustomHtml ?? this.legacyCustomHtml),
    );
  }

  /// Migrate legacy AnimationContent JSON to InteractiveVisualContent
  static InteractiveVisualContent fromLegacyAnimationJson(
    Map<String, dynamic> json,
  ) {
    final customHtml = json['customHtml'] as String?;
    final aiPrompt = json['aiPrompt'] as String?;
    return InteractiveVisualContent(
      version: engineVersion,
      mode: VisualMode.presentation,
      template: templateGeneric,
      title: '',
      layoutPreset: VisualLayoutPreset.sceneOnly,
      themeTone: VisualThemeTone.lightScience,
      initialState: const {},
      playback: const VisualPlayback(autoplay: true),
      aiPrompt: aiPrompt,
      legacyCustomHtml: customHtml,
    );
  }

  static String _normalizeMode(String? mode) {
    return VisualMode.all.contains(mode) ? mode! : VisualMode.presentation;
  }

  static String _normalizeLayoutPreset(String? preset) {
    return VisualLayoutPreset.all.contains(preset)
        ? preset!
        : VisualLayoutPreset.split;
  }

  static String _normalizeThemeTone(String? tone) {
    return VisualThemeTone.all.contains(tone)
        ? tone!
        : VisualThemeTone.lightScience;
  }

  static Map<String, dynamic>? _asStringDynamicMap(dynamic raw) {
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }
}

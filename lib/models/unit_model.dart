/// Interactive teaching unit data model
class UnitModel {
  final String id;
  final String title;
  final UnitType type;
  final String description;
  final String? difficulty;
  final String? category;
  final UiConfig uiConfig;
  final Validation validation;
  final Feedback feedback;
  final Metadata? metadata;

  const UnitModel({
    required this.id,
    required this.title,
    required this.type,
    required this.description,
    this.difficulty,
    this.category,
    required this.uiConfig,
    required this.validation,
    required this.feedback,
    this.metadata,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) {
    return UnitModel(
      id: json['id'] as String,
      title: json['title'] as String,
      type: UnitType.fromString(json['type'] as String),
      description: json['description'] as String,
      difficulty: json['difficulty'] as String?,
      category: json['category'] as String?,
      uiConfig: UiConfig.fromJson(json['ui_config'] as Map<String, dynamic>),
      validation: Validation.fromJson(json['validation'] as Map<String, dynamic>),
      feedback: Feedback.fromJson(json['feedback'] as Map<String, dynamic>),
      metadata: json['metadata'] != null
          ? Metadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type.value,
      'description': description,
      'difficulty': difficulty,
      'category': category,
      'ui_config': uiConfig.toJson(),
      'validation': validation.toJson(),
      'feedback': feedback.toJson(),
      'metadata': metadata?.toJson(),
    };
  }
}

/// Unit type enumeration
enum UnitType {
  slider('slider'),
  choice('choice'),
  input('input'),
  sorting('sorting');

  final String value;
  const UnitType(this.value);

  static UnitType fromString(String value) {
    return UnitType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => UnitType.slider,
    );
  }
}

/// UI configuration
class UiConfig {
  final SliderConfig? slider;
  final ChoiceConfig? choice;
  final InputConfig? input;
  final SortingConfig? sorting;
  final MediaConfig? media;

  const UiConfig({
    this.slider,
    this.choice,
    this.input,
    this.sorting,
    this.media,
  });

  factory UiConfig.fromJson(Map<String, dynamic> json) {
    return UiConfig(
      slider: json['slider'] != null
          ? SliderConfig.fromJson(json['slider'] as Map<String, dynamic>)
          : null,
      choice: json['choice'] != null
          ? ChoiceConfig.fromJson(json['choice'] as Map<String, dynamic>)
          : null,
      input: json['input'] != null
          ? InputConfig.fromJson(json['input'] as Map<String, dynamic>)
          : null,
      sorting: json['sorting'] != null
          ? SortingConfig.fromJson(json['sorting'] as Map<String, dynamic>)
          : null,
      media: json['media'] != null
          ? MediaConfig.fromJson(json['media'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (slider != null) 'slider': slider!.toJson(),
      if (choice != null) 'choice': choice!.toJson(),
      if (input != null) 'input': input!.toJson(),
      if (sorting != null) 'sorting': sorting!.toJson(),
      if (media != null) 'media': media!.toJson(),
    };
  }
}

/// Slider configuration
class SliderConfig {
  final double min;
  final double max;
  final double step;
  final double defaultValue;
  final String unit;
  final bool showValue;
  final String? trackColor;
  final String? activeColor;
  final String? thumbColor;
  final SliderLabels? labels;

  const SliderConfig({
    required this.min,
    required this.max,
    required this.step,
    required this.defaultValue,
    required this.unit,
    this.showValue = true,
    this.trackColor,
    this.activeColor,
    this.thumbColor,
    this.labels,
  });

  factory SliderConfig.fromJson(Map<String, dynamic> json) {
    return SliderConfig(
      min: (json['min'] as num).toDouble(),
      max: (json['max'] as num).toDouble(),
      step: (json['step'] as num).toDouble(),
      defaultValue: (json['default_value'] as num).toDouble(),
      unit: json['unit'] as String,
      showValue: json['show_value'] as bool? ?? true,
      trackColor: json['track_color'] as String?,
      activeColor: json['active_color'] as String?,
      thumbColor: json['thumb_color'] as String?,
      labels: json['labels'] != null
          ? SliderLabels.fromJson(json['labels'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'min': min,
      'max': max,
      'step': step,
      'default_value': defaultValue,
      'unit': unit,
      'show_value': showValue,
      'track_color': trackColor,
      'active_color': activeColor,
      'thumb_color': thumbColor,
      'labels': labels?.toJson(),
    };
  }
}

/// Slider labels
class SliderLabels {
  final String? minLabel;
  final String? maxLabel;

  const SliderLabels({this.minLabel, this.maxLabel});

  factory SliderLabels.fromJson(Map<String, dynamic> json) {
    return SliderLabels(
      minLabel: json['min_label'] as String?,
      maxLabel: json['max_label'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'min_label': minLabel,
      'max_label': maxLabel,
    };
  }
}

/// Choice question configuration
class ChoiceConfig {
  final String layout;
  final bool allowMultiple;
  final bool shuffleOptions;
  final bool showOptionIndex;
  final List<ChoiceOption> options;

  const ChoiceConfig({
    this.layout = 'vertical',
    this.allowMultiple = false,
    this.shuffleOptions = false,
    this.showOptionIndex = true,
    required this.options,
  });

  factory ChoiceConfig.fromJson(Map<String, dynamic> json) {
    return ChoiceConfig(
      layout: json['layout'] as String? ?? 'vertical',
      allowMultiple: json['allow_multiple'] as bool? ?? false,
      shuffleOptions: json['shuffle_options'] as bool? ?? false,
      showOptionIndex: json['show_option_index'] as bool? ?? true,
      options: (json['options'] as List<dynamic>)
          .map((e) => ChoiceOption.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'layout': layout,
      'allow_multiple': allowMultiple,
      'shuffle_options': shuffleOptions,
      'show_option_index': showOptionIndex,
      'options': options.map((e) => e.toJson()).toList(),
    };
  }
}

/// Choice option
class ChoiceOption {
  final String id;
  final String text;
  final String? icon;
  final String? imageUrl;

  const ChoiceOption({
    required this.id,
    required this.text,
    this.icon,
    this.imageUrl,
  });

  factory ChoiceOption.fromJson(Map<String, dynamic> json) {
    return ChoiceOption(
      id: json['id'] as String,
      text: json['text'] as String,
      icon: json['icon'] as String?,
      imageUrl: json['image_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'icon': icon,
      'image_url': imageUrl,
    };
  }
}

/// Input field configuration
class InputConfig {
  final String inputType;
  final String placeholder;
  final int maxLength;
  final String keyboardType;
  final String? prefix;
  final String? suffix;

  const InputConfig({
    required this.inputType,
    required this.placeholder,
    this.maxLength = 100,
    this.keyboardType = 'text',
    this.prefix,
    this.suffix,
  });

  factory InputConfig.fromJson(Map<String, dynamic> json) {
    return InputConfig(
      inputType: json['input_type'] as String,
      placeholder: json['placeholder'] as String,
      maxLength: json['max_length'] as int? ?? 100,
      keyboardType: json['keyboard_type'] as String? ?? 'text',
      prefix: json['prefix'] as String?,
      suffix: json['suffix'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'input_type': inputType,
      'placeholder': placeholder,
      'max_length': maxLength,
      'keyboard_type': keyboardType,
      'prefix': prefix,
      'suffix': suffix,
    };
  }
}

/// Sorting configuration
class SortingConfig {
  final String layout;
  final bool draggable;
  final List<SortingItem> items;

  const SortingConfig({
    this.layout = 'vertical',
    this.draggable = true,
    required this.items,
  });

  factory SortingConfig.fromJson(Map<String, dynamic> json) {
    return SortingConfig(
      layout: json['layout'] as String? ?? 'vertical',
      draggable: json['draggable'] as bool? ?? true,
      items: (json['items'] as List<dynamic>)
          .map((e) => SortingItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'layout': layout,
      'draggable': draggable,
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

/// Sorting item
class SortingItem {
  final String id;
  final String text;

  const SortingItem({required this.id, required this.text});

  factory SortingItem.fromJson(Map<String, dynamic> json) {
    return SortingItem(
      id: json['id'] as String,
      text: json['text'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
    };
  }
}

/// Media configuration
class MediaConfig {
  final String type;
  final String url;
  final String? altText;

  const MediaConfig({
    required this.type,
    required this.url,
    this.altText,
  });

  factory MediaConfig.fromJson(Map<String, dynamic> json) {
    return MediaConfig(
      type: json['type'] as String,
      url: json['url'] as String,
      altText: json['alt_text'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'url': url,
      'alt_text': altText,
    };
  }
}

/// Validation configuration
class Validation {
  final double? targetValue;
  final double? tolerance;
  final String validationType;
  final String? correctOptionId;
  final dynamic correctAnswer;
  final List<String>? correctOrder;
  final ValidRange? validRange;

  const Validation({
    this.targetValue,
    this.tolerance,
    required this.validationType,
    this.correctOptionId,
    this.correctAnswer,
    this.correctOrder,
    this.validRange,
  });

  factory Validation.fromJson(Map<String, dynamic> json) {
    return Validation(
      targetValue: (json['target_value'] as num?)?.toDouble(),
      tolerance: (json['tolerance'] as num?)?.toDouble(),
      validationType: json['validation_type'] as String,
      correctOptionId: json['correct_option_id'] as String?,
      correctAnswer: json['correct_answer'],
      correctOrder: (json['correct_order'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      validRange: json['valid_range'] != null
          ? ValidRange.fromJson(json['valid_range'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'target_value': targetValue,
      'tolerance': tolerance,
      'validation_type': validationType,
      'correct_option_id': correctOptionId,
      'correct_answer': correctAnswer,
      'correct_order': correctOrder,
      'valid_range': validRange?.toJson(),
    };
  }
}

/// Valid range
class ValidRange {
  final double min;
  final double max;

  const ValidRange({required this.min, required this.max});

  factory ValidRange.fromJson(Map<String, dynamic> json) {
    return ValidRange(
      min: (json['min'] as num).toDouble(),
      max: (json['max'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'min': min,
      'max': max,
    };
  }
}

/// Feedback configuration
class Feedback {
  final String successMsg;
  final String? failMsg;
  final String? failMsgTooHigh;
  final String? failMsgTooLow;
  final String? hint;
  final String? explanation;

  const Feedback({
    required this.successMsg,
    this.failMsg,
    this.failMsgTooHigh,
    this.failMsgTooLow,
    this.hint,
    this.explanation,
  });

  factory Feedback.fromJson(Map<String, dynamic> json) {
    return Feedback(
      successMsg: json['success_msg'] as String,
      failMsg: json['fail_msg'] as String?,
      failMsgTooHigh: json['fail_msg_too_high'] as String?,
      failMsgTooLow: json['fail_msg_too_low'] as String?,
      hint: json['hint'] as String?,
      explanation: json['explanation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success_msg': successMsg,
      'fail_msg': failMsg,
      'fail_msg_too_high': failMsgTooHigh,
      'fail_msg_too_low': failMsgTooLow,
      'hint': hint,
      'explanation': explanation,
    };
  }
}

/// Metadata
class Metadata {
  final String? createdAt;
  final String? updatedAt;
  final String? author;
  final List<String>? tags;

  const Metadata({
    this.createdAt,
    this.updatedAt,
    this.author,
    this.tags,
  });

  factory Metadata.fromJson(Map<String, dynamic> json) {
    return Metadata(
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      author: json['author'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'created_at': createdAt,
      'updated_at': updatedAt,
      'author': author,
      'tags': tags,
    };
  }
}

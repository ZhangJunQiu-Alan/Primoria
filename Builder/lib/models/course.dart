import 'page.dart';
import '../services/id_generator.dart';

/// 课程作者信息
class CourseAuthor {
  final String userId;
  final String displayName;

  const CourseAuthor({
    required this.userId,
    required this.displayName,
  });

  factory CourseAuthor.fromJson(Map<String, dynamic> json) {
    return CourseAuthor(
      userId: json['userId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'displayName': displayName,
      };
}

/// 课程元数据
class CourseMetadata {
  final String title;
  final String description;
  final CourseAuthor author;
  final List<String> tags;
  final String difficulty; // 'beginner' | 'intermediate' | 'advanced'
  final int estimatedMinutes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String version;

  const CourseMetadata({
    required this.title,
    required this.description,
    required this.author,
    required this.tags,
    required this.difficulty,
    required this.estimatedMinutes,
    required this.createdAt,
    required this.updatedAt,
    required this.version,
  });

  factory CourseMetadata.create({
    String title = '未命名课程',
    String description = '',
  }) {
    final now = DateTime.now();
    return CourseMetadata(
      title: title,
      description: description,
      author: const CourseAuthor(userId: 'local', displayName: '本地用户'),
      tags: [],
      difficulty: 'beginner',
      estimatedMinutes: 0,
      createdAt: now,
      updatedAt: now,
      version: '1.0.0',
    );
  }

  factory CourseMetadata.fromJson(Map<String, dynamic> json) {
    return CourseMetadata(
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      author: CourseAuthor.fromJson(
          json['author'] as Map<String, dynamic>? ?? {}),
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      difficulty: json['difficulty'] as String? ?? 'beginner',
      estimatedMinutes: json['estimatedMinutes'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
      version: json['version'] as String? ?? '1.0.0',
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'author': author.toJson(),
        'tags': tags,
        'difficulty': difficulty,
        'estimatedMinutes': estimatedMinutes,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'version': version,
      };

  CourseMetadata copyWith({
    String? title,
    String? description,
    CourseAuthor? author,
    List<String>? tags,
    String? difficulty,
    int? estimatedMinutes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? version,
  }) {
    return CourseMetadata(
      title: title ?? this.title,
      description: description ?? this.description,
      author: author ?? this.author,
      tags: tags ?? this.tags,
      difficulty: difficulty ?? this.difficulty,
      estimatedMinutes: estimatedMinutes ?? this.estimatedMinutes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      version: version ?? this.version,
    );
  }
}

/// 课程设置
class CourseSettings {
  final String theme; // 'light' | 'dark'
  final String primaryColor;
  final String fontFamily;

  const CourseSettings({
    this.theme = 'light',
    this.primaryColor = 'blue',
    this.fontFamily = 'system',
  });

  factory CourseSettings.fromJson(Map<String, dynamic> json) {
    return CourseSettings(
      theme: json['theme'] as String? ?? 'light',
      primaryColor: json['primaryColor'] as String? ?? 'blue',
      fontFamily: json['fontFamily'] as String? ?? 'system',
    );
  }

  Map<String, dynamic> toJson() => {
        'theme': theme,
        'primaryColor': primaryColor,
        'fontFamily': fontFamily,
      };
}

/// 课程模型 - 对应 PRD 5.1 JSON Schema
class Course {
  static const String schemaVersion = '1.0.0';
  static const String schemaUrl =
      'https://primoria.com/course-schema/v1.json';

  final String courseId;
  final CourseMetadata metadata;
  final CourseSettings settings;
  final List<CoursePage> pages;

  const Course({
    required this.courseId,
    required this.metadata,
    required this.settings,
    required this.pages,
  });

  /// 创建默认新课程
  factory Course.create({String title = '未命名课程'}) {
    return Course(
      courseId: IdGenerator.courseId(),
      metadata: CourseMetadata.create(title: title),
      settings: const CourseSettings(),
      pages: [CoursePage.create(title: '第 1 页')],
    );
  }

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      courseId: json['courseId'] as String,
      metadata:
          CourseMetadata.fromJson(json['metadata'] as Map<String, dynamic>),
      settings:
          CourseSettings.fromJson(json['settings'] as Map<String, dynamic>? ?? {}),
      pages: (json['pages'] as List<dynamic>)
          .map((e) => CoursePage.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        '\$schema': schemaUrl,
        'schemaVersion': schemaVersion,
        'courseId': courseId,
        'metadata': metadata.toJson(),
        'settings': settings.toJson(),
        'pages': pages.map((p) => p.toJson()).toList(),
      };

  Course copyWith({
    String? courseId,
    CourseMetadata? metadata,
    CourseSettings? settings,
    List<CoursePage>? pages,
  }) {
    return Course(
      courseId: courseId ?? this.courseId,
      metadata: metadata ?? this.metadata,
      settings: settings ?? this.settings,
      pages: pages ?? this.pages,
    );
  }

  /// 更新元数据（自动更新 updatedAt）
  Course updateMetadata(CourseMetadata Function(CourseMetadata) update) {
    final updatedMeta = update(metadata).copyWith(updatedAt: DateTime.now());
    return copyWith(metadata: updatedMeta);
  }

  /// 添加页面
  Course addPage(CoursePage page) {
    return copyWith(pages: [...pages, page]);
  }

  /// 删除页面
  Course removePage(String pageId) {
    return copyWith(pages: pages.where((p) => p.pageId != pageId).toList());
  }

  /// 更新页面
  Course updatePage(CoursePage updatedPage) {
    final updatedPages = pages.map((p) {
      if (p.pageId == updatedPage.pageId) return updatedPage;
      return p;
    }).toList();
    return copyWith(pages: updatedPages);
  }

  /// 获取页面
  CoursePage? getPage(int index) {
    if (index < 0 || index >= pages.length) return null;
    return pages[index];
  }
}

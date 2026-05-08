import { SCHEMA_VERSION, type Course } from '@primoria/schema';
import type { LessonBlock, LessonRuntimeData } from '@/shared/lesson/types';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';

export type DemoSubject = {
  id: string;
  name: string;
  color_hex: string;
};

export type DemoCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  difficulty_level: string;
  estimated_minutes: number;
  tags: string[];
  subject_id: string;
  subjects: DemoSubject;
  published_at: string;
};

export type DemoEnrollment = {
  course_id: string;
  status: string;
  progress_bp: number;
  courses: DemoCourse;
  started_at?: string | null;
  completed_at?: string | null;
  last_accessed_at?: string | null;
};

export type DemoProfile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  cover_image_url: string;
  role: string;
  created_at: string;
  pinned_achievement_ids: string[];
};

export type DemoAchievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  earned_at: string | null;
};

export type DemoParentChild = {
  child_id: string;
  child_name: string;
  role: string;
  current_streak: number;
  total_xp: number;
  lessons_completed: number;
};

export type DemoCourseLessonSummary = {
  id: string;
  title: string;
  sort_key: number;
  xp_reward: number;
  duration_seconds: number;
};

type DemoBlock = LessonBlock & {
  visibilityRule?: 'always' | 'hidden';
};

type DemoLessonPage = {
  page_id: string;
  order: number;
  title?: string;
  blocks: DemoBlock[];
};

type DemoLessonDefinition = DemoCourseLessonSummary & {
  pages: DemoLessonPage[];
};

type DemoCourseBundle = {
  course: DemoCourse;
  snapshot: Course;
  lessons: DemoLessonDefinition[];
};

function textBlock(id: string, order: number, text: string): DemoBlock {
  return {
    id,
    type: 'text',
    position: { order },
    visibilityRule: 'always',
    content: {
      format: 'richtext',
      value: { ops: [{ insert: `${text}\n` }] },
    },
  };
}

function multipleChoiceBlock(
  id: string,
  order: number,
  question: string,
  options: Array<{ id: string; text: string; isCorrect: boolean }>,
  allowMultiple = false,
): DemoBlock {
  return {
    id,
    type: 'multiple-choice',
    position: { order },
    visibilityRule: 'always',
    content: {
      question,
      allowMultiple,
      options,
    },
  };
}

function fillBlankBlock(
  id: string,
  order: number,
  template: string,
  answer: string,
  alternatives?: string[],
): DemoBlock {
  return {
    id,
    type: 'fill-blank',
    position: { order },
    visibilityRule: 'always',
    content: {
      template,
      blanks: [{ id: `${id}-blank`, answer, alternatives }],
    },
  };
}

function matchingBlock(
  id: string,
  order: number,
  pairs: Array<{ id: string; left: string; right: string }>,
): DemoBlock {
  return {
    id,
    type: 'matching',
    position: { order },
    visibilityRule: 'always',
    content: { pairs },
  };
}

function sortingBlock(id: string, order: number, prompt: string, items: string[], correctOrder: string[]): DemoBlock {
  return {
    id,
    type: 'sorting',
    position: { order },
    visibilityRule: 'always',
    content: {
      prompt,
      items,
      correctOrder,
    },
  };
}

function codePlaygroundBlock(
  id: string,
  order: number,
  language: string,
  starterCode: string,
  initialCode?: string,
): DemoBlock {
  return {
    id,
    type: 'code-playground',
    position: { order },
    visibilityRule: 'always',
    content: {
      language,
      starterCode,
      initialCode: initialCode ?? starterCode,
    },
  };
}

function interactiveVisualBlock(id: string, order: number, template: string, title: string): DemoBlock {
  return {
    id,
    type: 'interactive-visual',
    position: { order },
    visibilityRule: 'always',
    content: {
      template,
      title,
    },
  };
}

function buildCourseBundle(input: {
  courseId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  tags: string[];
  subject: DemoSubject;
  publishedAt: string;
  lessons: DemoLessonDefinition[];
}): DemoCourseBundle {
  const thumbnailUrl = resolveLocalCourseThumbnailUrl({
    slug: input.slug,
    title: input.title,
    thumbnailUrl: null,
  });

  const course: DemoCourse = {
    id: input.courseId,
    title: input.title,
    slug: input.slug,
    description: input.description,
    thumbnail_url: thumbnailUrl,
    difficulty_level: input.difficulty,
    estimated_minutes: input.estimatedMinutes,
    tags: input.tags,
    subject_id: input.subject.id,
    subjects: input.subject,
    published_at: input.publishedAt,
  };

  const snapshot: Course = {
    $schema: 'https://primoria.com/course-schema/v1.json',
    schema_version: SCHEMA_VERSION,
    course_id: input.courseId,
    metadata: {
      title: input.title,
      description: input.description,
      difficulty_level: input.difficulty,
      estimated_minutes: input.estimatedMinutes,
      tags: input.tags,
      thumbnail: thumbnailUrl ?? undefined,
    },
    lessons: input.lessons.map((lesson) => ({
      lesson_id: lesson.id,
      title: lesson.title,
      pages: lesson.pages as unknown as Course['lessons'][number]['pages'],
    })),
  };

  return {
    course,
    snapshot,
    lessons: input.lessons,
  };
}

export const demoSubjects: DemoSubject[] = [
  { id: 'subject-physics', name: 'Physics', color_hex: '#D19A5F' },
  { id: 'subject-cs', name: 'Computer Science', color_hex: '#7A9E7E' },
  { id: 'subject-data-ai', name: 'Data Science & AI', color_hex: '#9481A8' },
];

const reactViewerBundle = buildCourseBundle({
  courseId: 'course-demo-react-viewer',
  title: 'React Viewer Foundations',
  slug: 'react-viewer-foundations',
  description: 'A demo course that exercises the rebuilt learner runtime.',
  difficulty: 'beginner',
  estimatedMinutes: 22,
  tags: ['react', 'viewer', 'migration'],
  subject: demoSubjects[1],
  publishedAt: '2026-03-01T00:00:00Z',
  lessons: [
    {
      id: 'lesson-demo-1',
      title: 'Foundations',
      sort_key: 0,
      xp_reward: 120,
      duration_seconds: 600,
      pages: [
        {
          page_id: 'page-demo-1',
          order: 0,
          blocks: [
            textBlock('intro', 0, 'Welcome to the React learner runtime.'),
            multipleChoiceBlock('mc', 1, 'Which stack powers the new learner app?', [
              { id: 'a', text: 'React + TypeScript + Vite', isCorrect: true },
              { id: 'b', text: 'Flutter only', isCorrect: false },
            ]),
            {
              ...textBlock('gated', 2, 'The gated block is now visible.'),
              visibilityRule: 'always',
            },
          ],
        },
        {
          page_id: 'page-demo-2',
          order: 1,
          blocks: [
            multipleChoiceBlock(
              'multi',
              0,
              'Which features belong to the learner shell?',
              [
                { id: 'a', text: 'Home', isCorrect: true },
                { id: 'b', text: 'Library', isCorrect: true },
                { id: 'c', text: 'Course editor canvas', isCorrect: false },
              ],
              true,
            ),
            fillBlankBlock('fill', 1, 'The React viewer remains ___ first.', 'web', ['web-first']),
            matchingBlock('matching', 2, [
              { id: 'pair-1', left: 'Home', right: 'Progress' },
              { id: 'pair-2', left: 'Library', right: 'Catalog' },
            ]),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-2',
      title: 'Advanced Demo Blocks',
      sort_key: 1,
      xp_reward: 160,
      duration_seconds: 720,
      pages: [
        {
          page_id: 'page-demo-3',
          order: 0,
          blocks: [
            codePlaygroundBlock('code', 0, 'ts', 'const viewer = "react";'),
            interactiveVisualBlock('visual', 1, 'sorting-bars', 'Sorting bars'),
          ],
        },
      ],
    },
  ],
});

const physicsBundle = buildCourseBundle({
  courseId: 'course-demo-physics-motion',
  title: '运动与力学观察',
  slug: 'motion-and-mechanics-observation',
  description: '用图像、受力图和能量判断，把力学里最常见的三类问题看得更清楚。',
  difficulty: 'beginner',
  estimatedMinutes: 48,
  tags: ['physics', 'mechanics', 'graphs'],
  subject: demoSubjects[0],
  publishedAt: '2026-04-04T08:00:00Z',
  lessons: [
    {
      id: 'lesson-demo-physics-1',
      title: '用图像读懂速度与位移',
      sort_key: 0,
      xp_reward: 120,
      duration_seconds: 540,
      pages: [
        {
          page_id: 'physics-1-page-1',
          order: 0,
          title: '图像和运动',
          blocks: [
            textBlock(
              'physics-1-intro',
              0,
              '位移-时间图的斜率表示速度。先看线条是变陡、变平，还是保持恒定，再判断运动状态。',
            ),
            multipleChoiceBlock('physics-1-mc', 1, '位移-时间图是一条向上且斜率恒定的直线，这意味着什么？', [
              { id: 'a', text: '物体静止不动', isCorrect: false },
              { id: 'b', text: '物体做匀速前进', isCorrect: true },
              { id: 'c', text: '物体速度不断增大', isCorrect: false },
            ]),
          ],
        },
        {
          page_id: 'physics-1-page-2',
          order: 1,
          title: '读图步骤',
          blocks: [
            interactiveVisualBlock('physics-1-visual', 0, 'motion-graph-observer', '观察位移图和速度变化'),
            matchingBlock('physics-1-match', 1, [
              { id: 'p1', left: '斜率为零', right: '速度为零' },
              { id: 'p2', left: '斜率变大', right: '速度增大' },
              { id: 'p3', left: '斜率为负', right: '向反方向运动' },
            ]),
          ],
        },
        {
          page_id: 'physics-1-page-3',
          order: 2,
          title: '一句总结',
          blocks: [fillBlankBlock('physics-1-fill', 0, '读位移-时间图时，先看斜率，再判断 ___ 。', '速度')],
        },
      ],
    },
    {
      id: 'lesson-demo-physics-2',
      title: '受力分析与牛顿定律',
      sort_key: 1,
      xp_reward: 130,
      duration_seconds: 600,
      pages: [
        {
          page_id: 'physics-2-page-1',
          order: 0,
          title: '受力图',
          blocks: [
            textBlock(
              'physics-2-intro',
              0,
              '受力分析时先找研究对象，再列出真实存在的力，最后判断合力方向和加速度方向。',
            ),
            sortingBlock(
              'physics-2-sort',
              1,
              '把受力分析的顺序排正确',
              ['判断合力', '选研究对象', '画出各个力'],
              ['选研究对象', '画出各个力', '判断合力'],
            ),
          ],
        },
        {
          page_id: 'physics-2-page-2',
          order: 1,
          title: '牛顿第二定律',
          blocks: [
            multipleChoiceBlock('physics-2-mc', 0, '如果合力方向向右，那么物体的加速度方向通常是？', [
              { id: 'a', text: '向左', isCorrect: false },
              { id: 'b', text: '向右', isCorrect: true },
              { id: 'c', text: '与质量方向相同', isCorrect: false },
            ]),
            fillBlankBlock('physics-2-fill', 1, '牛顿第二定律常写成 F = m × ___ 。', 'a', ['加速度']),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-physics-3',
      title: '能量守恒与实验判断',
      sort_key: 2,
      xp_reward: 150,
      duration_seconds: 660,
      pages: [
        {
          page_id: 'physics-3-page-1',
          order: 0,
          title: '能量视角',
          blocks: [
            textBlock(
              'physics-3-intro',
              0,
              '当题目出现高度、速度、弹簧形变时，可以优先切换到能量视角：动能、重力势能和弹性势能如何转化。',
            ),
            multipleChoiceBlock('physics-3-mc', 1, '忽略阻力时，小球从高处滑下，重力势能主要转化为什么？', [
              { id: 'a', text: '热量', isCorrect: false },
              { id: 'b', text: '动能', isCorrect: true },
              { id: 'c', text: '质量', isCorrect: false },
            ]),
          ],
        },
        {
          page_id: 'physics-3-page-2',
          order: 1,
          title: '实验判断',
          blocks: [
            fillBlankBlock('physics-3-fill', 0, '实验误差较小时，机械能总量可以近似看作 ___ 。', '守恒'),
            matchingBlock('physics-3-match', 1, [
              { id: 'p1', left: '高度增加', right: '重力势能增加' },
              { id: 'p2', left: '速度增加', right: '动能增加' },
              { id: 'p3', left: '弹簧压缩', right: '弹性势能增加' },
            ]),
          ],
        },
      ],
    },
  ],
});

const computerScienceBundle = buildCourseBundle({
  courseId: 'course-demo-cs-web-thinking',
  title: '编程思维与网页交互',
  slug: 'programming-thinking-and-web-interaction',
  description: '从变量和条件开始，再进入网页结构、按钮交互和调试修复，把编程直觉搭起来。',
  difficulty: 'beginner',
  estimatedMinutes: 54,
  tags: ['coding', 'web', 'debugging'],
  subject: demoSubjects[1],
  publishedAt: '2026-04-04T08:02:00Z',
  lessons: [
    {
      id: 'lesson-demo-cs-1',
      title: '变量、条件与流程',
      sort_key: 0,
      xp_reward: 110,
      duration_seconds: 540,
      pages: [
        {
          page_id: 'cs-1-page-1',
          order: 0,
          title: '变量是什么',
          blocks: [
            textBlock(
              'cs-1-intro',
              0,
              '变量像一个带名字的抽屉，用来保存当前需要反复读取或更新的信息。条件语句则决定程序接下来走哪条路。',
            ),
            multipleChoiceBlock('cs-1-mc', 1, '下面哪一项最适合作为变量的用途？', [
              { id: 'a', text: '保存用户当前分数', isCorrect: true },
              { id: 'b', text: '替代所有按钮', isCorrect: false },
              { id: 'c', text: '让代码自动运行更快', isCorrect: false },
            ]),
          ],
        },
        {
          page_id: 'cs-1-page-2',
          order: 1,
          title: '流程判断',
          blocks: [
            sortingBlock(
              'cs-1-sort',
              0,
              '把一段最基础的判断流程排成顺序',
              ['执行对应动作', '检查条件', '准备输入数据'],
              ['准备输入数据', '检查条件', '执行对应动作'],
            ),
            fillBlankBlock('cs-1-fill', 1, '当条件为 true 时，程序会进入对应的 ___ 分支。', 'if'),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-cs-2',
      title: '网页结构与按钮交互',
      sort_key: 1,
      xp_reward: 140,
      duration_seconds: 660,
      pages: [
        {
          page_id: 'cs-2-page-1',
          order: 0,
          title: '结构与交互',
          blocks: [
            textBlock(
              'cs-2-intro',
              0,
              '网页里常见的标题、段落、按钮都属于结构。真正让按钮“点了会变”的，是背后绑定的交互逻辑。',
            ),
            matchingBlock('cs-2-match', 1, [
              { id: 'p1', left: '<h1>', right: '页面主标题' },
              { id: 'p2', left: '<button>', right: '可点击动作' },
              { id: 'p3', left: '<p>', right: '说明文本' },
            ]),
          ],
        },
        {
          page_id: 'cs-2-page-2',
          order: 1,
          title: '按钮点击',
          blocks: [
            codePlaygroundBlock(
              'cs-2-code',
              0,
              'js',
              "const buttonLabel = '开始学习';\nfunction handleClick() {\n  return buttonLabel;\n}",
              "const buttonLabel = '开始学习';\nfunction handleClick() {\n  return `${buttonLabel}，进入下一步`;\n}",
            ),
            multipleChoiceBlock('cs-2-mc', 1, '按钮交互最关键的部分通常是什么？', [
              { id: 'a', text: '点击后触发的逻辑', isCorrect: true },
              { id: 'b', text: '按钮外框一定是圆角', isCorrect: false },
              { id: 'c', text: '按钮必须放在页面最上面', isCorrect: false },
            ]),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-cs-3',
      title: '调试：从报错到修复',
      sort_key: 2,
      xp_reward: 150,
      duration_seconds: 720,
      pages: [
        {
          page_id: 'cs-3-page-1',
          order: 0,
          title: '定位问题',
          blocks: [
            textBlock(
              'cs-3-intro',
              0,
              '调试不是“凭感觉改一遍”，而是先观察报错位置，再缩小范围，最后验证修复是否真的解决问题。',
            ),
            multipleChoiceBlock('cs-3-mc', 1, '看到报错信息后，第一步更合理的是？', [
              { id: 'a', text: '先看报错位置和变量名', isCorrect: true },
              { id: 'b', text: '立刻把整页代码重写', isCorrect: false },
              { id: 'c', text: '关闭浏览器重新打开', isCorrect: false },
            ]),
          ],
        },
        {
          page_id: 'cs-3-page-2',
          order: 1,
          title: '修复闭环',
          blocks: [
            fillBlankBlock('cs-3-fill', 0, '修完 bug 后，最后一步应该是重新 ___ 结果。', '验证', ['检查']),
            sortingBlock(
              'cs-3-sort',
              1,
              '把调试动作排成合理顺序',
              ['验证修复', '阅读报错信息', '修改有问题的代码'],
              ['阅读报错信息', '修改有问题的代码', '验证修复'],
            ),
          ],
        },
      ],
    },
  ],
});

const dataAiBundle = buildCourseBundle({
  courseId: 'course-demo-data-ai-basics',
  title: '数据与 AI 入门',
  slug: 'data-and-ai-basics',
  description: '把数据、特征、预测和 prompt 评估连成一条线，理解 AI 系统最基础的工作方式。',
  difficulty: 'intermediate',
  estimatedMinutes: 52,
  tags: ['data', 'ai', 'prompting'],
  subject: demoSubjects[2],
  publishedAt: '2026-04-04T08:04:00Z',
  lessons: [
    {
      id: 'lesson-demo-data-1',
      title: '数据、标签与特征',
      sort_key: 0,
      xp_reward: 120,
      duration_seconds: 570,
      pages: [
        {
          page_id: 'data-1-page-1',
          order: 0,
          title: '数据的三个角色',
          blocks: [
            textBlock(
              'data-1-intro',
              0,
              '特征是模型看到的输入，标签是我们希望模型学会预测的答案。数据质量越稳定，模型越容易学到有效规律。',
            ),
            matchingBlock('data-1-match', 1, [
              { id: 'p1', left: '特征', right: '模型用来观察的输入' },
              { id: 'p2', left: '标签', right: '训练阶段的目标答案' },
              { id: 'p3', left: '样本', right: '一条完整的数据记录' },
            ]),
          ],
        },
        {
          page_id: 'data-1-page-2',
          order: 1,
          title: '判断输入',
          blocks: [
            multipleChoiceBlock('data-1-mc', 0, '如果要预测房价，下面哪一项更像“特征”？', [
              { id: 'a', text: '房屋面积', isCorrect: true },
              { id: 'b', text: '模型训练完成的时间', isCorrect: false },
              { id: 'c', text: '老师给的分数', isCorrect: false },
            ]),
            fillBlankBlock('data-1-fill', 1, '训练模型时，标签就是希望模型输出的 ___ 。', '答案'),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-data-2',
      title: '模型如何做预测',
      sort_key: 1,
      xp_reward: 135,
      duration_seconds: 630,
      pages: [
        {
          page_id: 'data-2-page-1',
          order: 0,
          title: '预测流程',
          blocks: [
            textBlock(
              'data-2-intro',
              0,
              '预测不是“猜一下”，而是把新输入送进已经学到规律的模型，再输出一个最可能的结果。',
            ),
            sortingBlock(
              'data-2-sort',
              1,
              '把一次预测流程排成顺序',
              ['模型输出结果', '输入新的样本', '模型读取训练好的规律'],
              ['输入新的样本', '模型读取训练好的规律', '模型输出结果'],
            ),
          ],
        },
        {
          page_id: 'data-2-page-2',
          order: 1,
          title: '结果判断',
          blocks: [
            multipleChoiceBlock('data-2-mc', 0, '为什么测试集很重要？', [
              { id: 'a', text: '它可以帮助判断模型泛化表现', isCorrect: true },
              { id: 'b', text: '它让模型自动有更多参数', isCorrect: false },
              { id: 'c', text: '它可以替代所有训练数据', isCorrect: false },
            ]),
          ],
        },
      ],
    },
    {
      id: 'lesson-demo-data-3',
      title: 'Prompt 设计与结果检查',
      sort_key: 2,
      xp_reward: 150,
      duration_seconds: 690,
      pages: [
        {
          page_id: 'data-3-page-1',
          order: 0,
          title: '把任务说清楚',
          blocks: [
            textBlock(
              'data-3-intro',
              0,
              'Prompt 的核心不是“写得复杂”，而是把目标、格式和限制条件讲清楚，让模型更容易给出可检查的结果。',
            ),
            fillBlankBlock('data-3-fill', 1, '一个更稳的 prompt，通常会明确输出 ___ 和限制条件。', '格式', ['结构']),
          ],
        },
        {
          page_id: 'data-3-page-2',
          order: 1,
          title: '检查结果',
          blocks: [
            multipleChoiceBlock('data-3-mc', 0, '拿到模型结果后，哪一步更关键？', [
              { id: 'a', text: '检查是否满足任务要求和事实约束', isCorrect: true },
              { id: 'b', text: '默认模型一定完全正确', isCorrect: false },
              { id: 'c', text: '只看字数够不够长', isCorrect: false },
            ]),
            matchingBlock('data-3-match', 1, [
              { id: 'p1', left: '目标', right: '这次要模型完成什么' },
              { id: 'p2', left: '格式', right: '输出长什么样' },
              { id: 'p3', left: '检查', right: '结果有没有偏题或失真' },
            ]),
          ],
        },
      ],
    },
  ],
});

export const demoCourseBundles: DemoCourseBundle[] = [
  reactViewerBundle,
  physicsBundle,
  computerScienceBundle,
  dataAiBundle,
];

export const demoCourseSnapshot: Course = reactViewerBundle.snapshot;

export const demoCourses: DemoCourse[] = demoCourseBundles.map((bundle) => bundle.course);

export const demoEnrollments: DemoEnrollment[] = [
  {
    course_id: reactViewerBundle.course.id,
    status: 'in_progress',
    progress_bp: 5200,
    started_at: '2026-03-29T09:00:00Z',
    last_accessed_at: '2026-04-03T19:10:00Z',
    courses: reactViewerBundle.course,
  },
];

export const demoProfile: DemoProfile = {
  id: 'demo-user',
  username: 'Demo Learner',
  bio: 'Using the local viewer fixture mode.',
  avatar_url: '',
  cover_image_url: '',
  role: 'user',
  created_at: '2026-01-15T00:00:00Z',
  pinned_achievement_ids: ['achievement-streak'],
};

export const demoAchievements: DemoAchievement[] = [
  {
    id: 'achievement-streak',
    slug: 'streak_7',
    name: 'Hot Streak',
    description: 'Keep a 7-day learning streak alive.',
    category: 'streak',
    rarity: 'rare',
    earned_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'achievement-first-course',
    slug: 'first_course',
    name: 'Feedback Loop',
    description: 'Complete your first course.',
    category: 'learning',
    rarity: 'common',
    earned_at: null,
  },
];

export const demoStats = {
  current_streak: 9,
  longest_streak: 14,
  courses_completed: 1,
  lessons_completed: 6,
  total_xp: 1320,
  total_study_minutes: 186,
};

export const demoFollowCounts = {
  following: 8,
  followers: 13,
};

export const demoXpHistory = new Map<string, number>([
  ['2026-03-24', 80],
  ['2026-03-25', 120],
  ['2026-03-26', 160],
  ['2026-03-27', 0],
  ['2026-03-28', 220],
  ['2026-03-29', 180],
  ['2026-03-30', 140],
]);

export const demoParentChildren: DemoParentChild[] = [
  {
    child_id: 'demo-child-1',
    child_name: 'Ava',
    role: 'user',
    current_streak: 6,
    total_xp: 840,
    lessons_completed: 11,
  },
  {
    child_id: 'demo-child-2',
    child_name: 'Noah',
    role: 'user',
    current_streak: 3,
    total_xp: 520,
    lessons_completed: 7,
  },
];

export const demoParentReports: Record<string, Record<string, unknown>> = {
  'demo-child-1': {
    child_id: 'demo-child-1',
    summary: {
      study_minutes: 142,
      lessons_completed: 11,
      streak: 6,
      top_subject: 'Physics',
    },
    daily_breakdown: [
      { date: '2026-03-24', minutes: 24, xp: 120 },
      { date: '2026-03-25', minutes: 18, xp: 80 },
      { date: '2026-03-26', minutes: 30, xp: 140 },
    ],
  },
  'demo-child-2': {
    child_id: 'demo-child-2',
    summary: {
      study_minutes: 88,
      lessons_completed: 7,
      streak: 3,
      top_subject: 'Computer Science',
    },
    daily_breakdown: [
      { date: '2026-03-24', minutes: 10, xp: 40 },
      { date: '2026-03-25', minutes: 22, xp: 100 },
      { date: '2026-03-26', minutes: 18, xp: 60 },
    ],
  },
};

const demoCourseBundleById = new Map(demoCourseBundles.map((bundle) => [bundle.course.id, bundle]));
const demoLessonIndex = new Map(
  demoCourseBundles.flatMap((bundle) =>
    bundle.lessons.map((lesson) => [
      lesson.id,
      {
        courseId: bundle.course.id,
        lesson,
      },
    ]),
  ),
);

export function getDemoCourseLessons(courseId: string): DemoCourseLessonSummary[] | null {
  const bundle = demoCourseBundleById.get(courseId);
  if (!bundle) {
    return null;
  }

  return bundle.lessons.map(({ id, title, sort_key, xp_reward, duration_seconds }) => ({
    id,
    title,
    sort_key,
    xp_reward,
    duration_seconds,
  }));
}

export function getDemoCourseIdForLesson(lessonId: string): string | null {
  return demoLessonIndex.get(lessonId)?.courseId ?? null;
}

export function createDemoLessonRuntime(lessonId: string): LessonRuntimeData | null {
  const entry = demoLessonIndex.get(lessonId);
  if (!entry) {
    return null;
  }

  const { courseId, lesson } = entry;
  return {
    lessonId: lesson.id,
    courseId,
    title: lesson.title,
    pages: lesson.pages.map((page, index) => ({
      page_id: page.page_id,
      order: page.order,
      title: page.title ?? `${lesson.title} · 第 ${index + 1} 页`,
      blocks: page.blocks,
    })),
    xpReward: lesson.xp_reward,
    durationSeconds: lesson.duration_seconds,
  };
}

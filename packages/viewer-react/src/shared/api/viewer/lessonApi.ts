import { migrateCourseJson, parseCourse, type Block, type Course } from '@primoria/schema';
import type { LessonBlock, LessonPage, LessonRuntimeData, SortingBlock } from '@/shared/lesson/types';
import type { ViewerLessonCompletion } from '@/shared/api/viewer/types';
import { loadDemoViewerData, loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { normalizeType, toObject, toString, usesViewerFixtures } from '@/shared/api/viewer/core';
import { getDefaultVisibilityRule } from '@/shared/lesson/blockVisibility';
import { resolveVideoProvider } from '@/shared/media/videoSource';
import { supabase } from '@/shared/api/supabase';

function buildTextBlock(id: string, order: number, text: string): Block {
  return {
    id,
    type: 'text',
    position: { order },
    content: {
      format: 'richtext',
      value: { ops: [{ insert: `${text}\n` }] },
    },
  };
}

function resolveVisibilityRule(rawBlock: Record<string, unknown>, order: number) {
  const visibilityRule = toString(rawBlock.visibilityRule || rawBlock.visibility_rule);
  if (visibilityRule === 'hidden' || visibilityRule === 'always') {
    return visibilityRule;
  }
  if (
    visibilityRule === 'afterPreviousCorrect' ||
    visibilityRule === 'after_previous_correct' ||
    visibilityRule === 'after-previous-correct'
  ) {
    return 'always';
  }
  return getDefaultVisibilityRule(order);
}

function withVisibilityRule<T extends LessonBlock>(block: T, rawBlock: Record<string, unknown>): T {
  return {
    ...block,
    visibilityRule: resolveVisibilityRule(rawBlock, block.position.order),
  };
}

function normalizeDbBlock(rawBlock: Record<string, unknown>, order: number): LessonBlock {
  const content = toObject(rawBlock.content);
  const type = normalizeType(rawBlock.type);
  const blockId = toString(rawBlock.block_id || rawBlock.id) || `legacy-${order}`;

  if (type === 'sorting') {
    const items = Array.isArray(content.items) ? content.items.map((item) => toString(item)).filter(Boolean) : [];
    const correctOrder =
      Array.isArray(content.correct_order) || Array.isArray(content.correctOrder)
        ? ((content.correct_order ?? content.correctOrder) as unknown[])
            .map((item) => toString(item))
            .filter(Boolean)
        : [...items];
    const block: SortingBlock = {
      id: blockId,
      type: 'sorting',
      position: { order },
      content: {
        prompt: toString(content.prompt || content.question || rawBlock.title) || 'Sort the items',
        items,
        correctOrder,
        successMsg: toString(content.successMsg || content.success_message || content.success),
        failMsg: toString(content.failMsg || content.fail_message || content.failure),
      },
    };
    return withVisibilityRule(block, rawBlock);
  }

  if (type === 'multiple-choice' || type === 'multiplechoice') {
    const optionsSource = Array.isArray(content.options)
      ? content.options
      : Array.isArray(content.choices)
      ? content.choices
      : [];
    const options = optionsSource.map((option, index) => {
      const optionRecord = toObject(option);
      const id = toString(optionRecord.id) || `option-${index}`;
      const text = toString(optionRecord.text || optionRecord.label || optionRecord.value);
      const correctIds = Array.isArray(content.correctAnswers)
        ? (content.correctAnswers as unknown[]).map((item) => toString(item))
        : [];
      const correctIndex = typeof content.correctIndex === 'number' ? content.correctIndex : -1;
      const isCorrect =
        optionRecord.isCorrect === true ||
        correctIds.includes(id) ||
        (correctIndex >= 0 && correctIndex === index);
      return { id, text, isCorrect };
    });

    return withVisibilityRule({
      id: blockId,
      type: 'multiple-choice',
      position: { order },
      content: {
        question: toString(content.question || content.prompt || rawBlock.title),
        allowMultiple: content.multi_select === true || content.allowMultiple === true,
        options,
        explanation: toString(
          content.explanation || content.feedback || content.feedbackText || content.rationale,
        ),
      },
    }, rawBlock);
  }

  if (type === 'fill-blank' || type === 'input') {
    return withVisibilityRule({
      id: blockId,
      type: 'fill-blank',
      position: { order },
      content: {
        template: toString(content.template || content.prompt || 'Fill in the blank: ___'),
        blanks: [
          {
            id: `${blockId}-blank-1`,
            answer: toString(content.answer || content.correctAnswer || ''),
            alternatives: Array.isArray(content.alternatives)
              ? (content.alternatives as unknown[]).map((item) => toString(item))
              : undefined,
          },
        ],
      },
    }, rawBlock);
  }

  if (type === 'matching') {
    const pairs = Array.isArray(content.pairs)
      ? content.pairs
      : Array.isArray(content.edges)
      ? (content.edges as unknown[]).map((edge, index) => {
          const record = toObject(edge);
          return {
            id: toString(record.id) || `edge-${index}`,
            left: toString(record.from || record.source || record.left),
            right: toString(record.to || record.target || record.right),
          };
        })
      : [];
    return withVisibilityRule({
      id: blockId,
      type: 'matching',
      position: { order },
      content: {
        pairs,
      },
    }, rawBlock);
  }

  if (type === 'true-false') {
    return withVisibilityRule({
      id: blockId,
      type: 'true-false',
      position: { order },
      content: {
        statement: toString(content.statement || content.prompt || rawBlock.title),
        isTrue: Boolean(content.isTrue ?? content.answer ?? true),
        explanation: toString(
          content.explanation || content.feedback || content.feedbackText || content.rationale,
        ),
      },
    }, rawBlock);
  }

  if (type === 'video') {
    const url = toString(content.url || content.video_url);
    return withVisibilityRule({
      id: blockId,
      type: 'video',
      position: { order },
      content: {
        url,
        provider: resolveVideoProvider(content.provider, url),
      },
    }, rawBlock);
  }

  if (type === 'interactive-visual') {
    return withVisibilityRule({
      id: blockId,
      type: 'interactive-visual',
      position: { order },
      content: {
        template: toString(content.template || 'generic'),
        title: toString(content.title || rawBlock.title || 'Interactive Visual'),
        description: toString(content.description),
        aiPrompt: toString(content.aiPrompt || content.ai_prompt),
        version: toString(content.version),
        themeTone: toString(content.themeTone || content.theme_tone),
        generatedHtml: toString(content.generatedHtml || content.generated_html),
      },
    }, rawBlock);
  }

  if (type === 'code-execution') {
    return withVisibilityRule({
      id: blockId,
      type: 'code-execution',
      position: { order },
      content: {
        language: toString(content.language || 'python'),
        code: toString(content.source_code || content.sourceCode || content.code),
      },
    }, rawBlock);
  }

  if (type === 'code-playground') {
    return withVisibilityRule({
      id: blockId,
      type: 'code-playground',
      position: { order },
      content: {
        language: toString(content.language || 'python'),
        starterCode: toString(content.starterCode || content.initialCode || content.code),
        initialCode: toString(content.initialCode || content.starterCode || content.code),
      },
    }, rawBlock);
  }

  if (type === 'image') {
    return withVisibilityRule({
      id: blockId,
      type: 'image',
      position: { order },
      content: {
        url: toString(content.url),
        altText: toString(content.altText || content.alt),
      },
    }, rawBlock);
  }

  if (type === 'function-flow') {
    return withVisibilityRule({
      id: blockId,
      type: 'function-flow',
      position: { order },
      content: {
        nodes: Array.isArray(content.nodes) ? content.nodes : [],
        edges: Array.isArray(content.edges) ? content.edges : [],
      },
    }, rawBlock);
  }

  return withVisibilityRule(
    buildTextBlock(blockId, order, toString(content.text || content.body || rawBlock.type || 'Unsupported block')),
    rawBlock,
  );
}

function normalizePage(rawPage: Record<string, unknown>, index: number, fallbackTitle: string): LessonPage {
  const blocks = Array.isArray(rawPage.blocks)
    ? rawPage.blocks.map((block, blockIndex) =>
        normalizeDbBlock(
          {
            ...toObject(block),
            type: toObject(block).type,
            content: toObject(block).content,
          },
          blockIndex,
        ),
      )
    : [];

  return {
    page_id: toString(rawPage.page_id || rawPage.pageId) || `page-${index}`,
    order: typeof rawPage.order === 'number' ? rawPage.order : index,
    title: toString(rawPage.title) || fallbackTitle,
    blocks,
  };
}

function selectLessonPages(raw: unknown, lessonId: string, lessonTitle: string): LessonPage[] {
  if (Array.isArray(raw)) {
    return [
      {
        page_id: `${lessonId}-legacy`,
        order: 0,
        title: lessonTitle,
        blocks: raw.map((block, index) => normalizeDbBlock(toObject(block), index)),
      },
    ];
  }

  const map = toObject(raw);
  if (Array.isArray(map.lessons)) {
    const lesson =
      map.lessons
        .map((item) => toObject(item))
        .find((candidate) => {
          const candidateId = toString(candidate.lesson_id || candidate.lessonId || candidate.pageId || candidate.id);
          return candidateId === lessonId || toString(candidate.title) === lessonTitle;
        }) ?? toObject(map.lessons[0]);

    if (Array.isArray(lesson.pages)) {
      return lesson.pages.map((page, index) => normalizePage(toObject(page), index, lessonTitle));
    }

    if (Array.isArray(lesson.blocks)) {
      return [
        {
          page_id: `${lessonId}-wrapped`,
          order: 0,
          title: toString(lesson.title) || lessonTitle,
          blocks: lesson.blocks.map((block, index) => normalizeDbBlock(toObject(block), index)),
        },
      ];
    }
  }

  if (Array.isArray(map.pages)) {
    return map.pages.map((page, index) => normalizePage(toObject(page), index, lessonTitle));
  }

  if (Array.isArray(map.blocks)) {
    return [
      {
        page_id: `${lessonId}-single`,
        order: 0,
        title: lessonTitle,
        blocks: map.blocks.map((block, index) => normalizeDbBlock(toObject(block), index)),
      },
    ];
  }

  try {
    const course = parseCourse(migrateCourseJson(map)) as Course;
    const lesson = course.lessons.find((candidate) => candidate.lesson_id === lessonId) ?? course.lessons[0];
    return lesson.pages.map((page) => ({
      page_id: page.page_id,
      order: page.order,
      title: lesson.title,
      blocks: page.blocks.map((block) => ({
        ...block,
        visibilityRule: block.visibilityRule ?? getDefaultVisibilityRule(block.position.order),
      })),
    }));
  } catch {
    return [];
  }
}

export async function fetchLessonRuntime(lessonId: string): Promise<LessonRuntimeData | null> {
  if (usesViewerFixtures()) {
    const { createDemoLessonRuntime } = await loadDemoViewerData();
    return createDemoLessonRuntime(lessonId);
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('id, course_id, title, content_json, xp_reward, duration_seconds')
    .eq('id', lessonId)
    .single();
  if (error) {
    throw error;
  }

  let content = data.content_json as unknown;
  if (typeof content === 'string' && content.trim()) {
    try {
      content = JSON.parse(content);
    } catch {
      content = {};
    }
  }

  const pages = selectLessonPages(content, String(data.id), String(data.title || 'Lesson'));
  if (pages.length === 0) {
    return null;
  }

  return {
    lessonId: String(data.id),
    courseId: typeof data.course_id === 'string' ? data.course_id : undefined,
    title: String(data.title || 'Lesson'),
    pages,
    xpReward: Number(data.xp_reward ?? 0),
    durationSeconds: Number(data.duration_seconds ?? 0),
  };
}

export async function completeLesson(_userId: string, lessonId: string, stats: Record<string, number>) {
  if (usesViewerFixtures()) {
    const { completeFixtureLesson } = await loadFixtureStore();
    return completeFixtureLesson(
      lessonId,
      Number(stats.correctCount ?? 0),
      Number(stats.totalCount ?? 0),
      Number(stats.timeSpentSeconds ?? 0),
    );
  }

  const { data, error } = await supabase.rpc('complete_lesson_and_award_xp', {
    p_lesson_id: lessonId,
    p_score: stats.score ?? 0,
    p_seconds: stats.timeSpentSeconds ?? 0,
    p_correct_count: stats.correctCount ?? 0,
    p_total_count: stats.totalCount ?? 0,
  });
  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    xp_earned: Number(payload.xp_earned ?? 0),
    total_xp: Number(payload.total_xp ?? 0),
    base_xp: Number(payload.base_xp ?? 0),
    accuracy_xp: Number(payload.accuracy_xp ?? 0),
    streak_xp: Number(payload.streak_xp ?? 0),
    first_today_xp: Number(payload.first_today_xp ?? 0),
    accuracy_pct: Number(payload.accuracy_pct ?? 0),
    already_completed: payload.already_completed === true,
    course_completed: payload.course_completed === true,
    unlocked_achievements: Array.isArray(payload.unlocked_achievements)
      ? (payload.unlocked_achievements as ViewerLessonCompletion['unlocked_achievements'])
      : [],
  } satisfies ViewerLessonCompletion;
}

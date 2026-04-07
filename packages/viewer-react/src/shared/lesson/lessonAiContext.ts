import { isQuestionBlock } from '@/shared/lesson/blockVisibility';
import type { LessonRuntimeData, LessonBlock } from '@/shared/lesson/types';
import { richTextToPlainText } from '@/shared/lesson/richText';
import type { DerivedLessonPageState, LessonPageSessionState, QuestionEvaluation, QuestionResponse } from '@/shared/lesson/questionFlow';

export type LessonAiContextPayload = {
  surface: 'lesson-runtime';
  lessonTitle: string;
  pageIndex: number;
  pageCount: number;
  pageTitle?: string;
  pageContent: string;
  learnerState?: string;
};

export function buildLessonAiContext({
  data,
  currentPageIndex,
  blocks,
  pageSession,
  pageState,
}: {
  data: LessonRuntimeData;
  currentPageIndex: number;
  blocks: LessonBlock[];
  pageSession: LessonPageSessionState;
  pageState: DerivedLessonPageState;
}): LessonAiContextPayload {
  const visibleBlocks = blocks.filter((_, index) => pageState.visibleBlockIndexes.has(index));
  const page = data.pages
    .slice()
    .sort((a, b) => a.order - b.order)[currentPageIndex];

  const pageContent = visibleBlocks
    .map((block) => serializeVisibleBlock(block))
    .filter(Boolean)
    .join('\n\n');
  const learnerState = visibleBlocks
    .filter((block) => isQuestionBlock(block))
    .map((block) => serializeLearnerState(block, pageSession.responses[block.id], pageSession.evaluations[block.id]))
    .filter(Boolean)
    .join('\n\n');

  return {
    surface: 'lesson-runtime',
    lessonTitle: data.title,
    pageIndex: currentPageIndex + 1,
    pageCount: data.pages.length,
    pageTitle: page?.title?.trim() || undefined,
    pageContent,
    learnerState: learnerState || undefined,
  };
}

function serializeVisibleBlock(block: LessonBlock) {
  switch (block.type) {
    case 'text': {
      const text = richTextToPlainText((block.content as { value?: unknown }).value);
      return text ? `正文\n${text}` : '';
    }
    case 'multiple-choice': {
      const content = block.content as {
        question?: string;
        options?: Array<{ text?: string }>;
      };
      const options = Array.isArray(content.options)
        ? content.options.map((option, index) => `${index + 1}. ${String(option.text ?? '').trim()}`).filter(Boolean)
        : [];
      return compactLines([
        '选择题',
        String(content.question ?? '').trim(),
        options.length ? `选项:\n${options.join('\n')}` : '',
      ]);
    }
    case 'true-false': {
      const content = block.content as { statement?: string };
      return compactLines(['判断题', String(content.statement ?? '').trim(), '选项: 正确 / 错误']);
    }
    case 'fill-blank': {
      const content = block.content as { template?: string };
      return compactLines(['填空题', String(content.template ?? '').trim()]);
    }
    case 'matching': {
      const content = block.content as { pairs?: Array<{ left?: string; right?: string }> };
      const pairs = Array.isArray(content.pairs)
        ? content.pairs
            .map((pair) => `${String(pair.left ?? '').trim()} ↔ ${String(pair.right ?? '').trim()}`)
            .filter((line) => line !== '↔')
        : [];
      return compactLines(['匹配题', pairs.join('\n')]);
    }
    case 'sorting': {
      const prompt = String(block.content.prompt ?? '').trim();
      const items = Array.isArray(block.content.items)
        ? block.content.items.map((item, index) => `${index + 1}. ${item}`)
        : [];
      return compactLines(['排序题', prompt, items.length ? `项目:\n${items.join('\n')}` : '']);
    }
    case 'image': {
      const content = block.content as { altText?: string; alt?: string; url?: string };
      return compactLines(['图片', String(content.altText ?? content.alt ?? content.url ?? '').trim()]);
    }
    case 'video': {
      const content = block.content as { title?: string; url?: string };
      return compactLines(['视频', String(content.title ?? content.url ?? '').trim()]);
    }
    case 'code-block':
    case 'code-playground':
    case 'code-execution': {
      const content = block.content as { language?: string; code?: string; starterCode?: string; initialCode?: string };
      return compactLines([
        '代码',
        `语言: ${String(content.language ?? 'text').trim()}`,
        String(content.code ?? content.starterCode ?? content.initialCode ?? '').trim(),
      ]);
    }
    default: {
      const content = block.content as { title?: string };
      return compactLines([`内容区块 (${block.type})`, String(content.title ?? '').trim()]);
    }
  }
}

function serializeLearnerState(
  block: LessonBlock,
  response: QuestionResponse,
  evaluation?: QuestionEvaluation,
) {
  const answer = serializeResponse(block, response);
  const feedback = evaluation
    ? compactLines([
        `判定: ${evaluation.isCorrect ? '正确' : '错误'}`,
        evaluation.explanation ? `解释: ${evaluation.explanation}` : '',
      ])
    : '';

  const lines = compactLines([
    `题目 ${block.id}`,
    answer ? `当前作答: ${answer}` : '当前作答: 未作答',
    feedback,
  ]);
  return lines;
}

function serializeResponse(block: LessonBlock, response: QuestionResponse) {
  switch (block.type) {
    case 'multiple-choice': {
      const content = block.content as { options?: Array<{ id: string; text?: string }> };
      if (!Array.isArray(response)) {
        return '';
      }
      const labels = response
        .map((selectedId) => content.options?.find((option) => option.id === selectedId)?.text ?? selectedId)
        .filter(Boolean);
      return labels.join(', ');
    }
    case 'true-false':
      return typeof response === 'boolean' ? (response ? '正确' : '错误') : '';
    case 'fill-blank':
      return Array.isArray(response) ? response.map((value) => String(value ?? '').trim()).filter(Boolean).join(' | ') : '';
    case 'matching':
      return response && !Array.isArray(response) && typeof response === 'object'
        ? Object.entries(response)
            .map(([leftId, rightValue]) => `${leftId}: ${String(rightValue ?? '').trim()}`)
            .join(', ')
        : '';
    case 'sorting':
      return Array.isArray(response) ? response.join(' -> ') : '';
    default:
      return '';
  }
}

function compactLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean).join('\n');
}

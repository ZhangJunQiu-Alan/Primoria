import { describe, expect, it } from 'vitest';
import { resolveLocalCourseThumbnailUrl } from '@/shared/utils/localCourseCovers';

describe('resolveLocalCourseThumbnailUrl', () => {
  it('returns the local smoke course cover for the legacy publish smoke title', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        title: 'Primoria Viewer Publish Smoke Course',
        thumbnailUrl: null,
      }),
    ).toContain('/course-covers/react-viewer-smoke.svg');
  });

  it('returns the local data ai cover when the database thumbnail is empty', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        slug: 'data-and-ai-basics',
        title: '数据与 AI 入门',
        thumbnailUrl: '',
      }),
    ).toContain('/course-covers/data-ai-basics.svg');
  });

  it('preserves explicit thumbnail urls', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        slug: 'data-and-ai-basics',
        title: '数据与 AI 入门',
        thumbnailUrl: 'https://example.com/existing-cover.png',
      }),
    ).toBe('https://example.com/existing-cover.png');
  });
});

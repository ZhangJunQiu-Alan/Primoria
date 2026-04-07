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

  it('returns the local cover for the seeded python debugging course', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        slug: 'python-debugging-studio-70000000',
        title: 'Python Debugging Studio',
        thumbnailUrl: null,
      }),
    ).toContain('/course-covers/python-debugging-studio.svg');
  });

  it('returns the local cover for the seeded physics lab course', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        slug: 'physics-motion-and-forces-lab-70000000',
        title: 'Physics Motion and Forces Lab',
        thumbnailUrl: null,
      }),
    ).toContain('/course-covers/physics-motion-forces-lab.svg');
  });

  it('returns the local cover for the seeded data ai workshop course', () => {
    expect(
      resolveLocalCourseThumbnailUrl({
        slug: 'data-and-ai-foundations-workshop-70000000',
        title: 'Data and AI Foundations Workshop',
        thumbnailUrl: null,
      }),
    ).toContain('/course-covers/data-ai-foundations-workshop.svg');
  });
});

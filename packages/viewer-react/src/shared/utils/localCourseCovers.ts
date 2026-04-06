import { publicAssetPath } from '@/shared/utils/publicAsset';

type LocalCourseCover = {
  assetPath: string;
  slugs?: string[];
  titles?: string[];
};

const LOCAL_COURSE_COVERS: LocalCourseCover[] = [
  {
    assetPath: 'course-covers/react-viewer-smoke.svg',
    slugs: ['react-viewer-foundations', 'primoria-viewer-publish-smoke-course'],
    titles: ['React Viewer Foundations', 'Primoria Viewer Publish Smoke Course'],
  },
  {
    assetPath: 'course-covers/data-ai-basics.svg',
    slugs: ['data-and-ai-basics'],
    titles: ['数据与 AI 入门', '数据与AI入门'],
  },
  {
    assetPath: 'course-covers/web-interaction.svg',
    slugs: ['programming-thinking-and-web-interaction'],
    titles: ['编程思维与网页交互'],
  },
  {
    assetPath: 'course-covers/motion-mechanics.svg',
    slugs: ['motion-and-mechanics-observation'],
    titles: ['运动与力学观察'],
  },
];

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

export function resolveLocalCourseThumbnailUrl(input: {
  slug?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
}) {
  const explicit = input.thumbnailUrl?.trim();
  if (explicit) {
    return explicit;
  }

  const normalizedSlug = normalizeKey(input.slug);
  const normalizedTitle = normalizeKey(input.title);

  const match = LOCAL_COURSE_COVERS.find((entry) => {
    const slugMatch = normalizedSlug
      ? entry.slugs?.some((slug) => normalizeKey(slug) === normalizedSlug)
      : false;
    const titleMatch = normalizedTitle
      ? entry.titles?.some((title) => normalizeKey(title) === normalizedTitle)
      : false;
    return Boolean(slugMatch || titleMatch);
  });

  return match ? publicAssetPath(match.assetPath) : null;
}

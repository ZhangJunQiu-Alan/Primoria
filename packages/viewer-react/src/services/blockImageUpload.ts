import { supabase } from '@/lib/supabase';

const BLOCK_MEDIA_BUCKETS = {
  image: ['course-block-media', 'course-block-images'],
  video: ['course-block-media', 'course-block-videos', 'course-block-images'],
} as const;
const FALLBACK_MEDIA_BUCKETS = ['course-thumbnails', 'avatars'] as const;

interface UploadBlockMediaArgs {
  file: File;
  userId: string;
  courseId: string;
  lessonId: string;
  pageId: string;
  blockId: string;
  kind: 'image' | 'video';
}

export async function uploadBlockMedia({
  file,
  userId,
  courseId,
  lessonId,
  pageId,
  blockId,
  kind,
}: UploadBlockMediaArgs) {
  const extension = getFileExtension(file.name, file.type, kind);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''), kind);
  const path = `${userId}/${courseId}/${lessonId}/${pageId}/${blockId}/${Date.now()}-${safeName}.${extension}`;
  const contentType = file.type || mimeTypeFromExtension(extension);

  const bucketsToTry = [...BLOCK_MEDIA_BUCKETS[kind], ...FALLBACK_MEDIA_BUCKETS];
  for (const bucket of bucketsToTry) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    if (isBucketMissingError(error) && bucket !== bucketsToTry[bucketsToTry.length - 1]) {
      continue;
    }

    throw normalizeUploadError(error, kind);
  }

  throw new Error(`${capitalize(kind)} upload failed.`);
}

export async function uploadBlockImage(
  args: Omit<UploadBlockMediaArgs, 'kind'>,
) {
  return uploadBlockMedia({ ...args, kind: 'image' });
}

function getFileExtension(fileName: string, mimeType: string, kind: 'image' | 'video') {
  const fromName = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
  if (fromName) {
    return fromName.replace(/[^a-z0-9]+/g, '') || defaultExtension(kind);
  }

  if (mimeType.includes('/')) {
    const fromMime = mimeType.split('/').pop()?.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (fromMime) {
      return fromMime === 'quicktime' ? 'mov' : fromMime;
    }
  }

  return defaultExtension(kind);
}

function defaultExtension(kind: 'image' | 'video') {
  return kind === 'video' ? 'mp4' : 'jpg';
}

function sanitizeFileName(value: string, kind: 'image' | 'video') {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || kind
  );
}

function mimeTypeFromExtension(extension: string) {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'mp4':
    case 'm4v':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
    case 'ogv':
      return 'video/ogg';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    default:
      return 'application/octet-stream';
  }
}

function isBucketMissingError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { message?: unknown; error?: unknown };
  const message = typeof maybeError.message === 'string' ? maybeError.message : '';
  const detail = typeof maybeError.error === 'string' ? maybeError.error : '';
  const haystack = `${message} ${detail}`.toLowerCase();

  return haystack.includes('bucket not found');
}

function normalizeUploadError(error: unknown, kind: 'image' | 'video') {
  if (isBucketMissingError(error)) {
    return new Error(
      `Storage is not configured for ${kind} uploads on this project. Please ask an admin to run the latest Supabase storage migrations.`,
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`${capitalize(kind)} upload failed.`);
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

import { supabase } from '@/lib/supabase';

const BLOCK_IMAGE_BUCKET = 'course-block-images';
const FALLBACK_IMAGE_BUCKETS = ['course-thumbnails', 'avatars'] as const;

export async function uploadBlockImage({
  file,
  userId,
  courseId,
  lessonId,
  pageId,
  blockId,
}: {
  file: File;
  userId: string;
  courseId: string;
  lessonId: string;
  pageId: string;
  blockId: string;
}) {
  const extension = getFileExtension(file.name, file.type);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const path = `${userId}/${courseId}/${lessonId}/${pageId}/${blockId}/${Date.now()}-${safeName}.${extension}`;
  const contentType = file.type || mimeTypeFromExtension(extension);

  const bucketsToTry = [BLOCK_IMAGE_BUCKET, ...FALLBACK_IMAGE_BUCKETS];
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

    // If this project doesn't have the preferred bucket yet, try the next bucket.
    if (isBucketMissingError(error) && bucket !== bucketsToTry[bucketsToTry.length - 1]) {
      continue;
    }

    throw normalizeUploadError(error);
  }

  throw new Error('Image upload failed.');
}

function getFileExtension(fileName: string, mimeType: string) {
  const fromName = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
  if (fromName) {
    return fromName;
  }

  if (mimeType === 'image/png') {
    return 'png';
  }
  if (mimeType === 'image/webp') {
    return 'webp';
  }
  if (mimeType === 'image/gif') {
    return 'gif';
  }

  return 'jpg';
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';
}

function mimeTypeFromExtension(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
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

function normalizeUploadError(error: unknown) {
  if (isBucketMissingError(error)) {
    return new Error(
      'Storage is not configured for image uploads on this project. Please ask an admin to run the latest Supabase storage migrations.',
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Image upload failed.');
}

import { supabase } from '@/lib/supabase';

const BLOCK_IMAGE_BUCKET = 'course-block-images';

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

  const { error } = await supabase.storage.from(BLOCK_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || mimeTypeFromExtension(extension),
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BLOCK_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
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

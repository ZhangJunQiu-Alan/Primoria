import { supabase } from '@/shared/api/supabase';

const MINDMAP_IMAGE_BUCKET = 'course-block-images';

export async function uploadMindMapImage({
  file,
  userId,
  mindMapId,
  nodeId,
}: {
  file: File;
  userId: string;
  mindMapId: string;
  nodeId: string;
}) {
  const extension = getFileExtension(file.name, file.type);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const path = `${userId}/ai-tutor/mindmaps/${mindMapId}/${nodeId}/${Date.now()}-${safeName}.${extension}`;
  const contentType = file.type || mimeTypeFromExtension(extension);

  const { error } = await supabase.storage.from(MINDMAP_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType,
    upsert: false,
  });

  if (error) {
    throw normalizeUploadError(error);
  }

  const { data } = supabase.storage.from(MINDMAP_IMAGE_BUCKET).getPublicUrl(path);
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

function normalizeUploadError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return new Error('Image upload failed.');
  }

  const record = error as { message?: unknown; error?: unknown };
  const message = typeof record.message === 'string' ? record.message : '';
  const detail = typeof record.error === 'string' ? record.error : '';
  const haystack = `${message} ${detail}`.toLowerCase();

  if (haystack.includes('bucket not found')) {
    return new Error(
      'Storage is not configured for image uploads on this project. Please ask an admin to run the latest Supabase storage migrations.',
    );
  }

  return error instanceof Error ? error : new Error('Image upload failed.');
}

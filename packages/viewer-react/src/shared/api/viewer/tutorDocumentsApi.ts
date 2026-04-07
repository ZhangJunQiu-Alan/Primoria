import type { Database } from '../../../../../db/src';
import type { CreateQuizFromDocsRequest, CreateQuizFromDocsResponse, TutorDocument } from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { supabase } from '@/shared/api/supabase';

type TutorDocumentRow = Database['public']['Tables']['tutor_documents']['Row'];
const QUIZ_SERVICE_UNAVAILABLE_CODE = 'TUTOR_QUIZ_SERVICE_UNAVAILABLE';

function normalizeTutorDocument(row: Partial<TutorDocumentRow>): TutorDocument {
  return {
    id: String(row.id ?? ''),
    filename: String(row.filename ?? ''),
    mime_type: String(row.mime_type ?? ''),
    extracted_chars: Number(row.extracted_chars ?? 0),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

function normalizeQuizResponse(value: unknown): CreateQuizFromDocsResponse {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const courseId = typeof payload.courseId === 'string' ? payload.courseId : '';
  const courseTitle = typeof payload.courseTitle === 'string' ? payload.courseTitle : '';

  if (!courseId || !courseTitle) {
    throw new Error('AI Tutor returned an invalid quiz course response.');
  }

  return { courseId, courseTitle };
}

function isResponse(value: unknown): value is Response {
  return typeof Response !== 'undefined' && value instanceof Response;
}

async function readFunctionErrorResponse(response: Response) {
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.clone().json()) as Record<string, unknown>;
      const message = ['error', 'message', 'details', 'hint']
        .map((key) => payload[key])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .trim();

      if (message) {
        return message;
      }
    }

    return (await response.clone().text()).trim();
  } catch {
    return '';
  }
}

function createQuizServiceUnavailableError(message: string, status?: number) {
  return Object.assign(new Error(message), {
    code: QUIZ_SERVICE_UNAVAILABLE_CODE,
    status,
  });
}

function isMissingQuizFunction(status: number, message: string) {
  const normalized = message.toLowerCase();
  return (
    status === 404 ||
    (normalized.includes('function') && normalized.includes('not found')) ||
    normalized.includes('edge function not found')
  );
}

async function normalizeQuizInvocationError(error: unknown): Promise<never> {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const name = typeof record?.name === 'string' ? record.name : '';
  const context = record?.context;
  const response = isResponse(context) ? context : null;
  const responseMessage = response ? await readFunctionErrorResponse(response) : '';
  const rawMessage = error instanceof Error ? error.message.trim() : '';
  const message = responseMessage || rawMessage;

  if (name === 'FunctionsFetchError' || name === 'FunctionsRelayError') {
    throw createQuizServiceUnavailableError(message || 'Failed to send a request to the Edge Function');
  }

  if (response) {
    if (isMissingQuizFunction(response.status, message)) {
      throw createQuizServiceUnavailableError(message || 'Edge Function returned a non-2xx status code', response.status);
    }

    if (responseMessage) {
      throw new Error(responseMessage);
    }
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('Unable to create quiz course.');
}

async function requireTutorUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const userId = data.user?.id?.trim();
  if (!userId) {
    throw new Error('请先登录后再上传资料。');
  }

  return userId;
}

async function getTutorAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data.session?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Please sign in before generating a quiz.');
  }

  return accessToken;
}

export async function fetchTutorDocuments() {
  if (usesViewerFixtures()) {
    return [] as TutorDocument[];
  }

  const { data, error } = await supabase
    .from('tutor_documents')
    .select('id, filename, mime_type, extracted_chars, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeTutorDocument(row as Partial<TutorDocumentRow>));
}

export async function createTutorDocument(payload: {
  filename: string;
  mimeType: string;
  extractedText: string;
}) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持资料上传。');
  }

  const normalizedText = payload.extractedText.trim();
  if (!normalizedText) {
    throw new Error('无法从该资料中提取可用文本。');
  }
  const userId = await requireTutorUserId();

  const { data, error } = await supabase
    .from('tutor_documents')
    .insert({
      user_id: userId,
      filename: payload.filename.trim(),
      mime_type: payload.mimeType.trim(),
      extracted_text: normalizedText,
      extracted_chars: normalizedText.length,
    })
    .select('id, filename, mime_type, extracted_chars, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeTutorDocument(data as Partial<TutorDocumentRow>);
}

export async function deleteTutorDocument(documentId: string) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持资料删除。');
  }

  const { error } = await supabase.from('tutor_documents').delete().eq('id', documentId);
  if (error) {
    throw error;
  }
}

export async function createQuizFromDocs(payload: CreateQuizFromDocsRequest) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持文档测验生成。');
  }

  const accessToken = await getTutorAccessToken();
  const { data, error } = await supabase.functions.invoke('viewer-ai-quiz-from-docs', {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    await normalizeQuizInvocationError(error);
  }

  return normalizeQuizResponse(data);
}

import type { Database, Json } from '../../../../../db/src';
import {
  createDefaultMindMapLayout,
  createDefaultMindMapTheme,
  normalizeMindMapLayout,
  normalizeMindMapMarkers,
  normalizeMindMapNodeStyle,
  normalizeMindMapTheme,
} from '@/features/ai-tutor/mindMapAppearance';
import type {
  CreateMindMapFromDocsRequest,
  CreateMindMapFromDocsResponse,
  CreateQuizFromDocsRequest,
  CreateQuizFromDocsResponse,
  LegacyMindMapNode,
  MindMapDocument,
  MindMapLink,
  MindMapNode,
  MindMapSummary,
  TutorDocument,
} from '@/shared/api/viewer/types';
import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { supabase } from '@/shared/api/supabase';
import { countMeaningfulChars } from '@/shared/utils/textStats';

type TutorDocumentRow = Database['public']['Tables']['tutor_documents']['Row'];
type MindMapRow = Database['public']['Tables']['ai_tutor_mindmaps']['Row'];
type StoredMindMapDocument = {
  theme: MindMapDocument['theme'];
  layout: MindMapDocument['layout'];
  rootNodeId: string;
  nodes: Record<string, MindMapNode>;
};

const QUIZ_SERVICE_UNAVAILABLE_CODE = 'TUTOR_QUIZ_SERVICE_UNAVAILABLE';
const MINDMAP_SERVICE_UNAVAILABLE_CODE = 'TUTOR_MINDMAP_SERVICE_UNAVAILABLE';
export const TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE = 'TUTOR_DISPLAY_TITLE_UNAVAILABLE';
const TUTOR_DOCUMENT_SELECT_FIELDS =
  'id, filename, display_title, mime_type, extracted_chars, created_at, updated_at';
const LEGACY_TUTOR_DOCUMENT_SELECT_FIELDS =
  'id, filename, mime_type, extracted_chars, created_at, updated_at';

type QueryResult = {
  data: unknown;
  error: unknown;
};

function readBackendErrorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (!error || typeof error !== 'object') {
    return '';
  }

  const record = error as Record<string, unknown>;
  return ['message', 'details', 'hint', 'error_description']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim();
}

function isMissingDisplayTitleColumnError(error: unknown) {
  const message = readBackendErrorText(error).toLowerCase();
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : '';

  return (
    code === '42703' ||
    (message.includes('display_title') &&
      (message.includes('schema cache') ||
        message.includes('column') ||
        message.includes('does not exist') ||
        message.includes('could not find')))
  );
}

async function runTutorDocumentQueryWithLegacyFallback(
  queryFactory: (selectFields: string) => PromiseLike<QueryResult>,
): Promise<unknown> {
  const primaryResult = await Promise.resolve(queryFactory(TUTOR_DOCUMENT_SELECT_FIELDS));
  if (!primaryResult.error) {
    return primaryResult.data;
  }

  if (!isMissingDisplayTitleColumnError(primaryResult.error)) {
    throw primaryResult.error;
  }

  const fallbackResult = await Promise.resolve(queryFactory(LEGACY_TUTOR_DOCUMENT_SELECT_FIELDS));
  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  return fallbackResult.data;
}

function createDisplayTitleUnavailableError() {
  return Object.assign(new Error('Display title updates require the latest Supabase database migration.'), {
    code: TUTOR_DISPLAY_TITLE_UNAVAILABLE_CODE,
  });
}

function normalizeTutorDocument(row: Partial<TutorDocumentRow>): TutorDocument {
  return {
    id: String(row.id ?? ''),
    filename: String(row.filename ?? ''),
    display_title: typeof row.display_title === 'string' ? row.display_title : null,
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

function isLegacyMindMapNode(value: unknown): value is LegacyMindMapNode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as { id?: unknown; label?: unknown; children?: unknown };
  if (typeof node.id !== 'string' || typeof node.label !== 'string') {
    return false;
  }

  if (node.children === undefined) {
    return true;
  }

  return Array.isArray(node.children) && node.children.every((child) => isLegacyMindMapNode(child));
}

function isMindMapLink(value: unknown): value is MindMapLink {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const link = value as { id?: unknown; label?: unknown; url?: unknown };
  return (
    typeof link.id === 'string' &&
    typeof link.label === 'string' &&
    typeof link.url === 'string'
  );
}

function isMindMapNode(value: unknown): value is MindMapNode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as Record<string, unknown>;
  return (
    typeof node.id === 'string' &&
    (typeof node.parentId === 'string' || node.parentId === null) &&
    Array.isArray(node.childIds) &&
    node.childIds.every((childId) => typeof childId === 'string') &&
    typeof node.label === 'string' &&
    typeof node.collapsed === 'boolean' &&
    (typeof node.icon === 'string' || node.icon === null) &&
    Array.isArray(node.tags) &&
    node.tags.every((tag) => typeof tag === 'string') &&
    (node.markers === undefined || (Array.isArray(node.markers) && node.markers.every((marker) => typeof marker === 'string'))) &&
    (node.style === undefined || (typeof node.style === 'object' && node.style !== null)) &&
    typeof node.noteHtml === 'string' &&
    (typeof node.imageUrl === 'string' || node.imageUrl === null) &&
    Array.isArray(node.links) &&
    node.links.every((link) => isMindMapLink(link)) &&
    Array.isArray(node.documentRefs) &&
    node.documentRefs.every((documentId) => typeof documentId === 'string')
  );
}

function normalizeMindMapNodeRecord(nodes: Record<string, MindMapNode>) {
  return Object.fromEntries(
    Object.entries(nodes).map(([nodeId, node]) => [
      nodeId,
      {
        ...node,
        childIds: [...node.childIds],
        tags: [...node.tags],
        markers: normalizeMindMapMarkers(node.markers),
        style: normalizeMindMapNodeStyle(node.style),
        links: node.links.map((link) => ({ ...link })),
        documentRefs: [...node.documentRefs],
      },
    ]),
  );
}

function isMindMapNodeRecord(value: unknown): value is Record<string, MindMapNode> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((node) => isMindMapNode(node));
}

function normalizeMindMapResponse(value: unknown): CreateMindMapFromDocsResponse {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const mindMapId = typeof payload.mindMapId === 'string' ? payload.mindMapId.trim() : '';
  const root = payload.root;

  if (!title || !mindMapId || !isLegacyMindMapNode(root)) {
    throw new Error('AI Tutor returned an invalid mind map response.');
  }

  return {
    title,
    mindMapId,
    root,
  };
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

function createServiceUnavailableError(code: string, message: string, status?: number) {
  return Object.assign(new Error(message), {
    code,
    status,
  });
}

function isMissingFunction(status: number, message: string) {
  const normalized = message.toLowerCase();
  return (
    status === 404 ||
    (normalized.includes('function') && normalized.includes('not found')) ||
    normalized.includes('edge function not found')
  );
}

async function normalizeDocsToolInvocationError(error: unknown, options: {
  unavailableCode: string;
  fallbackMessage: string;
}): Promise<never> {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const name = typeof record?.name === 'string' ? record.name : '';
  const context = record?.context;
  const response = isResponse(context) ? context : null;
  const responseMessage = response ? await readFunctionErrorResponse(response) : '';
  const rawMessage = error instanceof Error ? error.message.trim() : '';
  const message = responseMessage || rawMessage;

  if (name === 'FunctionsFetchError' || name === 'FunctionsRelayError') {
    throw createServiceUnavailableError(
      options.unavailableCode,
      message || 'Failed to send a request to the Edge Function',
    );
  }

  if (response) {
    if (isMissingFunction(response.status, message)) {
      throw createServiceUnavailableError(
        options.unavailableCode,
        message || 'Edge Function returned a non-2xx status code',
        response.status,
      );
    }

    if (responseMessage) {
      throw new Error(responseMessage);
    }
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(options.fallbackMessage);
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

function normalizeMindMapStorage(value: Json, rowId: string): StoredMindMapDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Mind map ${rowId} has an invalid document payload.`);
  }

  const payload = value as { theme?: unknown; layout?: unknown; rootNodeId?: unknown; nodes?: unknown };
  if (typeof payload.rootNodeId !== 'string' || !isMindMapNodeRecord(payload.nodes)) {
    throw new Error(`Mind map ${rowId} has an invalid document payload.`);
  }

  if (!payload.nodes[payload.rootNodeId]) {
    throw new Error(`Mind map ${rowId} is missing its root node.`);
  }

  return {
    theme: normalizeMindMapTheme(payload.theme ?? createDefaultMindMapTheme()),
    layout: normalizeMindMapLayout(payload.layout ?? createDefaultMindMapLayout()),
    rootNodeId: payload.rootNodeId,
    nodes: normalizeMindMapNodeRecord(payload.nodes),
  };
}

function normalizeMindMapRow(row: Partial<MindMapRow>): MindMapDocument {
  const id = typeof row.id === 'string' ? row.id : '';
  const title = typeof row.title === 'string' ? row.title : '';
  const sourceDocumentIds = Array.isArray(row.source_document_ids)
    ? row.source_document_ids.filter((value): value is string => typeof value === 'string')
    : [];
  const userPrompt = typeof row.user_prompt === 'string' ? row.user_prompt : '';
  const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : '';

  if (!id || !title || !createdAt || !updatedAt) {
    throw new Error('Mind map row is missing required fields.');
  }

  const storage = normalizeMindMapStorage(row.document as Json, id);
  return {
    id,
    title,
    sourceDocumentIds,
    userPrompt,
    theme: storage.theme,
    layout: storage.layout,
    rootNodeId: storage.rootNodeId,
    nodes: storage.nodes,
    createdAt,
    updatedAt,
  };
}

function toMindMapSummary(document: MindMapDocument): MindMapSummary {
  return {
    id: document.id,
    title: document.title,
    sourceDocumentIds: document.sourceDocumentIds,
    nodeCount: Object.keys(document.nodes).length,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function serializeMindMapDocument(payload: {
  theme: MindMapDocument['theme'];
  layout: MindMapDocument['layout'];
  rootNodeId: string;
  nodes: Record<string, MindMapNode>;
}) {
  return {
    theme: payload.theme,
    layout: payload.layout,
    rootNodeId: payload.rootNodeId,
    nodes: payload.nodes,
  } satisfies Json;
}

export async function fetchTutorDocuments() {
  if (usesViewerFixtures()) {
    return [] as TutorDocument[];
  }

  const data = await runTutorDocumentQueryWithLegacyFallback((selectFields) =>
    supabase
      .from('tutor_documents')
      .select(selectFields)
      .order('created_at', { ascending: false }),
  );

  return ((data as Array<Partial<TutorDocumentRow>> | null | undefined) ?? []).map((row) =>
    normalizeTutorDocument(row),
  );
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

  const insertPayload = {
    user_id: userId,
    filename: payload.filename.trim(),
    mime_type: payload.mimeType.trim(),
    extracted_text: normalizedText,
    extracted_chars: countMeaningfulChars(normalizedText),
  };
  const data = await runTutorDocumentQueryWithLegacyFallback((selectFields) =>
    supabase
      .from('tutor_documents')
      .insert(insertPayload)
      .select(selectFields)
      .single(),
  );

  return normalizeTutorDocument((data as Partial<TutorDocumentRow> | null | undefined) ?? {});
}

export async function updateTutorDocumentTitle(documentId: string, displayTitle: string) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持资料标题修改。');
  }

  const nextDisplayTitle = displayTitle.trim();
  const { data, error } = await supabase
    .from('tutor_documents')
    .update({
      display_title: nextDisplayTitle.length ? nextDisplayTitle : null,
    })
    .eq('id', documentId)
    .select(TUTOR_DOCUMENT_SELECT_FIELDS)
    .single();

  if (error) {
    if (isMissingDisplayTitleColumnError(error)) {
      throw createDisplayTitleUnavailableError();
    }
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

export async function listMindMaps() {
  if (usesViewerFixtures()) {
    return [] as MindMapSummary[];
  }

  const { data, error } = await supabase
    .from('ai_tutor_mindmaps')
    .select('id, title, source_document_ids, user_prompt, document, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toMindMapSummary(normalizeMindMapRow(row as Partial<MindMapRow>)));
}

export async function fetchMindMap(mindMapId: string) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持思维导图编辑。');
  }

  const { data, error } = await supabase
    .from('ai_tutor_mindmaps')
    .select('id, title, source_document_ids, user_prompt, document, created_at, updated_at')
    .eq('id', mindMapId)
    .single();

  if (error) {
    throw error;
  }

  return normalizeMindMapRow(data as Partial<MindMapRow>);
}

export async function updateMindMap(
  mindMapId: string,
  payload:
    | MindMapDocument
    | {
      title?: string;
      sourceDocumentIds?: string[];
      userPrompt?: string;
      theme?: MindMapDocument['theme'];
      layout?: MindMapDocument['layout'];
      rootNodeId: string;
      nodes: Record<string, MindMapNode>;
    },
) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持思维导图保存。');
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const sourceDocumentIds = Array.isArray(payload.sourceDocumentIds) ? payload.sourceDocumentIds : [];
  const userPrompt = typeof payload.userPrompt === 'string' ? payload.userPrompt : '';

  const { data, error } = await supabase
    .from('ai_tutor_mindmaps')
    .update({
      title,
      source_document_ids: sourceDocumentIds,
      user_prompt: userPrompt,
      document: serializeMindMapDocument({
        theme: normalizeMindMapTheme(payload.theme ?? createDefaultMindMapTheme()),
        layout: normalizeMindMapLayout(payload.layout ?? createDefaultMindMapLayout()),
        rootNodeId: payload.rootNodeId,
        nodes: payload.nodes,
      }),
    })
    .eq('id', mindMapId)
    .select('id, title, source_document_ids, user_prompt, document, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return normalizeMindMapRow(data as Partial<MindMapRow>);
}

export async function deleteMindMap(mindMapId: string) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持思维导图删除。');
  }

  const { error } = await supabase.from('ai_tutor_mindmaps').delete().eq('id', mindMapId);
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
    await normalizeDocsToolInvocationError(error, {
      unavailableCode: QUIZ_SERVICE_UNAVAILABLE_CODE,
      fallbackMessage: 'Unable to create quiz course.',
    });
  }

  return normalizeQuizResponse(data);
}

export async function createMindMapFromDocs(payload: CreateMindMapFromDocsRequest) {
  if (usesViewerFixtures()) {
    throw new Error('演示模式暂不支持文档思维导图生成。');
  }

  const accessToken = await getTutorAccessToken();
  const { data, error } = await supabase.functions.invoke('viewer-ai-mindmap-from-docs', {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    await normalizeDocsToolInvocationError(error, {
      unavailableCode: MINDMAP_SERVICE_UNAVAILABLE_CODE,
      fallbackMessage: 'Unable to create mind map.',
    });
  }

  return normalizeMindMapResponse(data);
}

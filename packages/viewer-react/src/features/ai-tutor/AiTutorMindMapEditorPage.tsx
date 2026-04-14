import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Link2,
  Trash2,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  addChildMindMapNode,
  addSiblingMindMapNode,
  getMindMapRootNode,
  isMindMapDescendant,
  moveMindMapNode,
  normalizeMindMapDocumentForSave,
  promoteMindMapNode,
  removeMindMapNode,
  renameMindMapNode,
  toggleMindMapNodeCollapsed,
  updateMindMapNode,
  type MindMapDropPosition,
} from '@/features/ai-tutor/mindMapDocument';
import { uploadMindMapImage } from '@/features/ai-tutor/uploadMindMapImage';
import {
  fetchMindMap,
  fetchTutorDocuments,
  updateMindMap,
} from '@/shared/api/viewer/tutorDocumentsApi';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError } from '@/shared/platform/observability';
import { useAppSelector } from '@/shared/state/store';
import type { MindMapDocument, MindMapLink, MindMapNode, TutorDocument } from '@/shared/api/viewer/types';

function editorCopy(language: 'zh-CN' | 'en') {
  if (language === 'zh-CN') {
    return {
      back: '返回 AI 导师',
      loading: '正在加载思维导图…',
      unavailable: '这张思维导图暂时不可用。',
      saving: '保存中…',
      saved: '已保存',
      saveError: '保存失败',
      untitledNode: '未命名节点',
      addChild: '子主题',
      addSibling: '同级主题',
      promote: '提升一级',
      deleteNode: '删除节点',
      collapse: '折叠分支',
      expand: '展开分支',
      title: '标题',
      icon: '图标',
      tags: '标签',
      tagsPlaceholder: '用逗号分隔多个标签',
      note: '备注',
      notePlaceholder: '在这里补充解释、例子或复习要点…',
      links: '链接',
      addLink: '新增链接',
      linkLabel: '名称',
      linkUrl: 'URL',
      image: '图片',
      uploadImage: '上传图片',
      removeImage: '移除图片',
      documents: '资料引用',
      staleDocuments: '失效引用',
      invalidUrl: '无效链接不会被保存。',
      imageUploading: '图片上传中…',
      saveErrorBody: '修改还保留在本地页面里，可以继续编辑后重试。',
      noDocuments: '当前没有可引用的资料。',
    };
  }

  return {
    back: 'Back to AI Tutor',
    loading: 'Loading mind map…',
    unavailable: 'This mind map is unavailable.',
    saving: 'Saving…',
    saved: 'Saved',
    saveError: 'Save failed',
    untitledNode: 'Untitled node',
    addChild: 'Add child',
    addSibling: 'Add sibling',
    promote: 'Promote',
    deleteNode: 'Delete node',
    collapse: 'Collapse branch',
    expand: 'Expand branch',
    title: 'Title',
    icon: 'Icon',
    tags: 'Tags',
    tagsPlaceholder: 'Separate tags with commas',
    note: 'Notes',
    notePlaceholder: 'Add examples, reminders, or context here…',
    links: 'Links',
    addLink: 'Add link',
    linkLabel: 'Label',
    linkUrl: 'URL',
    image: 'Image',
    uploadImage: 'Upload image',
    removeImage: 'Remove image',
    documents: 'Referenced documents',
    staleDocuments: 'Unavailable references',
    invalidUrl: 'Invalid links are stripped before save.',
    imageUploading: 'Uploading image…',
    saveErrorBody: 'Changes are still kept locally in the page so you can keep editing.',
    noDocuments: 'No uploaded documents are available yet.',
  };
}

function isEditableElement(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function saveStatusTone(status: 'saving' | 'saved' | 'error') {
  if (status === 'saved') {
    return 'text-[#4f7655]';
  }
  if (status === 'error') {
    return 'text-[#a04b4b]';
  }
  return 'text-[#8b7d72]';
}

function updateLinkAtIndex(links: MindMapLink[], index: number, patch: Partial<MindMapLink>) {
  return links.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link));
}

function NoteEditor({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (nextValue: string) => void;
}) {
  const lastSavedRef = useRef(value);
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
      ],
      content: value,
      immediatelyRender: false,
      onUpdate({ editor: instance }) {
        const nextValue = instance.getHTML();
        lastSavedRef.current = nextValue;
        onChange(nextValue);
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (value !== lastSavedRef.current) {
      editor.commands.setContent(value || '<p></p>', false);
      lastSavedRef.current = value;
    }
  }, [editor, value]);

  return (
    <div className="rounded-[18px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-3 py-3">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none min-h-[160px] text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#a9968a] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

function DropZone({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`my-2 h-3 rounded-full border border-dashed transition ${active ? 'border-[#7a9e7e] bg-[#eef6ed]' : 'border-transparent bg-transparent'}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}

function MindMapCanvasNode({
  document,
  nodeId,
  selectedNodeId,
  editingNodeId,
  editingLabel,
  draggingNodeId,
  dropTarget,
  setSelectedNodeId,
  setEditingNodeId,
  setEditingLabel,
  onCommitEditing,
  onAddChild,
  onAddSibling,
  onDelete,
  onToggleCollapse,
  onPromote,
  onDragStart,
  onDragEnd,
  onDragOverTarget,
  onDropTarget,
  labels,
  canvasRef,
}: {
  document: MindMapDocument;
  nodeId: string;
  selectedNodeId: string;
  editingNodeId: string | null;
  editingLabel: string;
  draggingNodeId: string | null;
  dropTarget: { nodeId: string; position: MindMapDropPosition } | null;
  setSelectedNodeId: (nodeId: string) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setEditingLabel: (value: string) => void;
  onCommitEditing: () => void;
  onAddChild: (nodeId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onPromote: (nodeId: string) => void;
  onDragStart: (nodeId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOverTarget: (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLDivElement>) => void;
  onDropTarget: (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLDivElement>) => void;
  labels: ReturnType<typeof editorCopy>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const node = document.nodes[nodeId];
  if (!node) {
    return null;
  }

  const isRoot = nodeId === document.rootNodeId;
  const isSelected = nodeId === selectedNodeId;
  const isEditing = nodeId === editingNodeId;
  const hasChildren = node.childIds.length > 0;

  return (
    <div className="relative flex flex-col">
      {!isRoot ? (
        <DropZone
          active={dropTarget?.nodeId === nodeId && dropTarget.position === 'before'}
          onDragOver={onDragOverTarget(nodeId, 'before')}
          onDrop={onDropTarget(nodeId, 'before')}
        />
      ) : null}

      <div className="flex items-start gap-8">
        <div className="relative">
          <div
            className={`group relative min-w-[14rem] max-w-[18rem] rounded-[24px] border px-4 py-3 shadow-[0_14px_28px_rgba(90,70,50,0.08)] transition ${isSelected ? 'border-[#7a9e7e] bg-[linear-gradient(145deg,#f5fbf4_0%,#edf6eb_100%)]' : isRoot ? 'border-[#d3c2a8] bg-[linear-gradient(145deg,#fff8ef_0%,#f1e3cb_100%)]' : 'border-[#ddd3c3] bg-[rgba(255,252,247,0.95)]'} ${draggingNodeId === nodeId ? 'opacity-45' : ''}`}
            draggable={!isRoot}
            onDragStart={onDragStart(nodeId)}
            onDragEnd={onDragEnd}
            onClick={() => {
              setSelectedNodeId(nodeId);
              canvasRef.current?.focus();
            }}
            onDoubleClick={() => {
              setSelectedNodeId(nodeId);
              setEditingNodeId(nodeId);
              setEditingLabel(node.label);
            }}
            onDragOver={onDragOverTarget(nodeId, 'inside')}
            onDrop={onDropTarget(nodeId, 'inside')}
          >
            <div className="flex items-start gap-3">
              {!isRoot ? (
                <div className="mt-1 cursor-grab text-[#9d8e82] active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {hasChildren ? (
                    <button
                      type="button"
                      className="mt-1 shrink-0 text-[#8b7d72]"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleCollapse(nodeId);
                      }}
                      aria-label={node.collapsed ? labels.expand : labels.collapse}
                    >
                      {node.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingLabel}
                        onChange={(event) => setEditingLabel(event.target.value)}
                        onBlur={onCommitEditing}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            onCommitEditing();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setEditingNodeId(null);
                            setEditingLabel(node.label);
                          }
                        }}
                        className="w-full border-0 bg-transparent text-[1rem] font-semibold leading-7 text-[#3d342a] outline-none"
                      />
                    ) : (
                      <div className="text-[1rem] font-semibold leading-7 text-[#3d342a]">
                        {node.icon ? <span className="mr-2">{node.icon}</span> : null}
                        {node.label || labels.untitledNode}
                      </div>
                    )}

                    {node.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {node.tags.map((tag) => (
                          <span
                            key={`${nodeId}-${tag}`}
                            className="rounded-full border border-[#d7dfcc] bg-[#f6faf1] px-2 py-0.5 text-[0.68rem] font-semibold text-[#6a7a5f]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {node.imageUrl ? (
                      <img
                        src={node.imageUrl}
                        alt={node.label}
                        className="mt-3 h-20 w-full rounded-[16px] border border-[#ddd3c3] object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                className="rounded-full border border-[#d9cdbd] bg-white/85 px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddChild(nodeId);
                }}
              >
                {labels.addChild}
              </button>
              {!isRoot ? (
                <button
                  type="button"
                  className="rounded-full border border-[#d9cdbd] bg-white/85 px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddSibling(nodeId);
                  }}
                >
                  {labels.addSibling}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {hasChildren && !node.collapsed ? (
          <div className="relative flex flex-col gap-5 pl-8 before:absolute before:bottom-5 before:left-0 before:top-5 before:w-px before:bg-[#d9cdbd]">
            {node.childIds.map((childId) => (
              <div
                key={childId}
                className="relative before:absolute before:left-[-2rem] before:top-8 before:h-px before:w-8 before:bg-[#d9cdbd]"
              >
                <MindMapCanvasNode
                  document={document}
                  nodeId={childId}
                  selectedNodeId={selectedNodeId}
                  editingNodeId={editingNodeId}
                  editingLabel={editingLabel}
                  draggingNodeId={draggingNodeId}
                  dropTarget={dropTarget}
                  setSelectedNodeId={setSelectedNodeId}
                  setEditingNodeId={setEditingNodeId}
                  setEditingLabel={setEditingLabel}
                  onCommitEditing={onCommitEditing}
                  onAddChild={onAddChild}
                  onAddSibling={onAddSibling}
                  onDelete={onDelete}
                  onToggleCollapse={onToggleCollapse}
                  onPromote={onPromote}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOverTarget={onDragOverTarget}
                  onDropTarget={onDropTarget}
                  labels={labels}
                  canvasRef={canvasRef}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!isRoot ? (
        <DropZone
          active={dropTarget?.nodeId === nodeId && dropTarget.position === 'after'}
          onDragOver={onDragOverTarget(nodeId, 'after')}
          onDrop={onDropTarget(nodeId, 'after')}
        />
      ) : null}

      {isSelected ? (
        <div className="mt-2 flex flex-wrap gap-2 pl-1">
          <button
            type="button"
            className="rounded-full border border-[#d9cdbd] bg-[rgba(255,252,247,0.88)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
            onClick={() => onAddChild(nodeId)}
          >
            {labels.addChild}
          </button>
          {!isRoot ? (
            <>
              <button
                type="button"
                className="rounded-full border border-[#d9cdbd] bg-[rgba(255,252,247,0.88)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
                onClick={() => onAddSibling(nodeId)}
              >
                {labels.addSibling}
              </button>
              <button
                type="button"
                className="rounded-full border border-[#d9cdbd] bg-[rgba(255,252,247,0.88)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
                onClick={() => onPromote(nodeId)}
              >
                {labels.promote}
              </button>
              <button
                type="button"
                className="rounded-full border border-[#eccaca] bg-[rgba(255,245,245,0.95)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#9d5555]"
                onClick={() => onDelete(nodeId)}
              >
                {labels.deleteNode}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AiTutorMindMapEditorPage() {
  const language = useProductLanguage();
  const labels = editorCopy(language);
  const { mindMapId } = useParams<{ mindMapId: string }>();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const [document, setDocument] = useState<MindMapDocument | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: MindMapDropPosition } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSerializedRef = useRef('');
  const latestDocumentRef = useRef<MindMapDocument | null>(null);
  const saveInFlightRef = useRef(false);
  const savePendingRef = useRef(false);

  const documentQuery = useQuery({
    queryKey: ['ai-tutor', 'mindmap', mindMapId ?? 'missing'],
    enabled: Boolean(mindMapId),
    queryFn: () => fetchMindMap(mindMapId!),
    staleTime: 30_000,
  });

  const documentsQuery = useQuery({
    queryKey: ['ai-tutor', 'documents', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: fetchTutorDocuments,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (nextDocument: MindMapDocument) => updateMindMap(nextDocument.id, nextDocument),
  });

  useEffect(() => {
    latestDocumentRef.current = document;
  }, [document]);

  useEffect(() => {
    if (!documentQuery.data) {
      return;
    }

    setDocument(documentQuery.data);
    setSelectedNodeId((current) => current || documentQuery.data.rootNodeId);
    lastSavedSerializedRef.current = JSON.stringify(documentQuery.data);
    setSaveStatus('saved');
    setSaveErrorMessage(null);
  }, [documentQuery.data]);

  useEffect(() => {
    if (!document || document.nodes[selectedNodeId]) {
      return;
    }

    setSelectedNodeId(document.rootNodeId);
  }, [document, selectedNodeId]);

  const availableDocuments = documentsQuery.data ?? [];
  const availableDocumentIds = useMemo(
    () => new Set(availableDocuments.map((item) => item.id)),
    [availableDocuments],
  );
  const selectedNode = document ? document.nodes[selectedNodeId] ?? null : null;
  const rootNode = document ? getMindMapRootNode(document) : null;

  const hasUnsavedChanges = useMemo(() => {
    if (!document) {
      return false;
    }

    const prepared = normalizeMindMapDocumentForSave(document, availableDocumentIds);
    return JSON.stringify(prepared) !== lastSavedSerializedRef.current || saveInFlightRef.current;
  }, [availableDocumentIds, document]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const commitSave = async (snapshot: MindMapDocument) => {
    if (saveInFlightRef.current) {
      savePendingRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setSaveStatus('saving');
    setSaveErrorMessage(null);
    const prepared = normalizeMindMapDocumentForSave(snapshot, availableDocumentIds);
    const serializedSnapshot = JSON.stringify(prepared);

    try {
      const savedDocument = await saveMutation.mutateAsync(prepared);
      lastSavedSerializedRef.current = JSON.stringify(savedDocument);
      queryClient.setQueryData(['ai-tutor', 'mindmap', savedDocument.id], savedDocument);
      queryClient.setQueryData(['ai-tutor', 'mindmaps', userId ?? 'anon'], (current: unknown) => {
        if (!Array.isArray(current)) {
          return current;
        }

        const nextSummary = {
          id: savedDocument.id,
          title: savedDocument.title,
          sourceDocumentIds: savedDocument.sourceDocumentIds,
          nodeCount: Object.keys(savedDocument.nodes).length,
          createdAt: savedDocument.createdAt,
          updatedAt: savedDocument.updatedAt,
        };

        const filtered = current.filter((item) => {
          if (!item || typeof item !== 'object') {
            return false;
          }
          return (item as { id?: unknown }).id !== savedDocument.id;
        });
        return [nextSummary, ...filtered];
      });

      const latestPrepared = latestDocumentRef.current
        ? normalizeMindMapDocumentForSave(latestDocumentRef.current, availableDocumentIds)
        : null;
      if (latestPrepared && JSON.stringify(latestPrepared) === serializedSnapshot) {
        setDocument(savedDocument);
      }
      setSaveStatus('saved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : labels.saveError;
      setSaveStatus('error');
      setSaveErrorMessage(errorMessage);
      captureViewerError(error, { area: 'ai_tutor_mindmap_save', mindMapId });
    } finally {
      saveInFlightRef.current = false;

      if (savePendingRef.current && latestDocumentRef.current) {
        savePendingRef.current = false;
        const latestPrepared = normalizeMindMapDocumentForSave(latestDocumentRef.current, availableDocumentIds);
        if (JSON.stringify(latestPrepared) !== lastSavedSerializedRef.current) {
          void commitSave(latestPrepared);
        }
      }
    }
  };

  useEffect(() => {
    if (!document) {
      return undefined;
    }

    const prepared = normalizeMindMapDocumentForSave(document, availableDocumentIds);
    const serialized = JSON.stringify(prepared);
    if (serialized === lastSavedSerializedRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void commitSave(prepared);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [availableDocumentIds, document]);

  const updateSelectedNode = (patch: Partial<MindMapNode>) => {
    if (!document || !selectedNode) {
      return;
    }

    setDocument(updateMindMapNode(document, selectedNode.id, patch));
  };

  const handleCommitEditing = () => {
    if (!document || !editingNodeId) {
      return;
    }

    setDocument(renameMindMapNode(document, editingNodeId, editingLabel));
    setEditingNodeId(null);
  };

  const handleAddChild = (nodeId: string) => {
    if (!document) {
      return;
    }

    const result = addChildMindMapNode(document, nodeId);
    if (!result.nodeId) {
      return;
    }

    setDocument(result.document);
    setSelectedNodeId(result.nodeId);
    setEditingNodeId(result.nodeId);
    setEditingLabel('');
  };

  const handleAddSibling = (nodeId: string) => {
    if (!document) {
      return;
    }

    const result = addSiblingMindMapNode(document, nodeId);
    if (!result.nodeId) {
      return;
    }

    setDocument(result.document);
    setSelectedNodeId(result.nodeId);
    setEditingNodeId(result.nodeId);
    setEditingLabel('');
  };

  const handleDelete = (nodeId: string) => {
    if (!document) {
      return;
    }

    const nextDocument = removeMindMapNode(document, nodeId);
    setDocument(nextDocument);
    setSelectedNodeId(nextDocument.rootNodeId);
  };

  const handlePromote = (nodeId: string) => {
    if (!document) {
      return;
    }

    setDocument(promoteMindMapNode(document, nodeId));
  };

  const handleToggleCollapse = (nodeId: string) => {
    if (!document) {
      return;
    }

    setDocument(toggleMindMapNodeCollapsed(document, nodeId));
  };

  const handleDragOverTarget = (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLDivElement>) => {
    if (!document || !draggingNodeId) {
      return;
    }

    if (
      draggingNodeId === targetId ||
      draggingNodeId === document.rootNodeId ||
      (position !== 'inside' && targetId === document.rootNodeId) ||
      isMindMapDescendant(document, draggingNodeId, targetId)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDropTarget({ nodeId: targetId, position });
  };

  const handleDropTarget = (targetId: string, position: MindMapDropPosition) => (event: React.DragEvent<HTMLDivElement>) => {
    if (!document || !draggingNodeId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextDocument = moveMindMapNode(document, draggingNodeId, targetId, position);
    setDocument(nextDocument);
    setSelectedNodeId(draggingNodeId);
    setDraggingNodeId(null);
    setDropTarget(null);
  };

  const handleNodeDragStart = (nodeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    setDraggingNodeId(nodeId);
  };

  const handleNodeDragEnd = () => {
    setDraggingNodeId(null);
    setDropTarget(null);
  };

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!document || !selectedNode || isEditableElement(event.target)) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedNode.id !== document.rootNodeId) {
        handleAddSibling(selectedNode.id);
      }
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        handlePromote(selectedNode.id);
      } else {
        handleAddChild(selectedNode.id);
      }
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (selectedNode.id !== document.rootNodeId) {
        event.preventDefault();
        handleDelete(selectedNode.id);
      }
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !document || !selectedNode || !userId) {
      return;
    }

    setImageUploadError(null);
    try {
      setSaveStatus('saving');
      const imageUrl = await uploadMindMapImage({
        file,
        userId,
        mindMapId: document.id,
        nodeId: selectedNode.id,
      });
      updateSelectedNode({ imageUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.imageUploading;
      setImageUploadError(message);
      captureViewerError(error, { area: 'ai_tutor_mindmap_image_upload', mindMapId: document.id, nodeId: selectedNode.id });
    }
  };

  if (!mindMapId) {
    return <Navigate to="/ai-tutor" replace />;
  }

  if (documentQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-medium text-[#8b7d72]">
        {labels.loading}
      </div>
    );
  }

  if (documentQuery.error || !document || !selectedNode || !rootNode) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1380px] flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
          <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
            <span className="flex items-center gap-2">
              <ArrowLeft size={16} />
              {labels.back}
            </span>
          </Link>
        </div>
        <div className="viewer-surface flex flex-1 items-center justify-center bg-[rgba(254,250,245,0.94)] p-8">
          <div className="text-center">
            <div className="text-[1.6rem] font-semibold text-[#3d342a]">{labels.unavailable}</div>
          </div>
        </div>
      </div>
    );
  }

  const staleDocumentRefs = selectedNode.documentRefs.filter((documentId) => !availableDocumentIds.has(documentId));

  return (
    <div className="mx-auto flex h-full w-full max-w-[1480px] flex-col overflow-hidden px-4 py-4 md:px-5">
      <div className="flex items-center justify-between rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
        <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
          <span className="flex items-center gap-2">
            <ArrowLeft size={16} />
            {labels.back}
          </span>
        </Link>
        <div className={`text-sm font-semibold ${saveStatusTone(saveStatus)}`}>
          {saveStatus === 'saving' ? labels.saving : saveStatus === 'error' ? labels.saveError : labels.saved}
        </div>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_348px]">
        <section className="viewer-surface min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(255,252,247,0.95)_0%,rgba(246,240,229,0.94)_100%)]">
          <div
            ref={canvasRef}
            tabIndex={0}
            className="viewer-scrollbar-hidden h-full overflow-auto p-6 outline-none md:p-8"
            onKeyDown={handleCanvasKeyDown}
          >
            <div className="inline-flex min-w-full items-start pb-12 pr-12 pt-2">
              <MindMapCanvasNode
                document={document}
                nodeId={document.rootNodeId}
                selectedNodeId={selectedNodeId}
                editingNodeId={editingNodeId}
                editingLabel={editingLabel}
                draggingNodeId={draggingNodeId}
                dropTarget={dropTarget}
                setSelectedNodeId={setSelectedNodeId}
                setEditingNodeId={setEditingNodeId}
                setEditingLabel={setEditingLabel}
                onCommitEditing={handleCommitEditing}
                onAddChild={handleAddChild}
                onAddSibling={handleAddSibling}
                onDelete={handleDelete}
                onToggleCollapse={handleToggleCollapse}
                onPromote={handlePromote}
                onDragStart={handleNodeDragStart}
                onDragEnd={handleNodeDragEnd}
                onDragOverTarget={handleDragOverTarget}
                onDropTarget={handleDropTarget}
                labels={labels}
                canvasRef={canvasRef}
              />
            </div>
          </div>
        </section>

        <aside className="viewer-surface viewer-scrollbar-hidden min-h-0 overflow-auto bg-[rgba(254,250,245,0.95)] p-4 md:p-5">
          <div className="space-y-5">
            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.title}</div>
              <input
                value={selectedNode.label}
                onChange={(event) => {
                  if (!document) {
                    return;
                  }
                  setDocument(renameMindMapNode(document, selectedNode.id, event.target.value || labels.untitledNode));
                }}
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.92rem] font-semibold text-[#3d342a] outline-none"
              />
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary justify-center"
                onClick={() => handleAddChild(selectedNode.id)}
              >
                {labels.addChild}
              </button>
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handleAddSibling(selectedNode.id)}
                disabled={selectedNode.id === document.rootNodeId}
              >
                {labels.addSibling}
              </button>
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handlePromote(selectedNode.id)}
                disabled={selectedNode.id === document.rootNodeId || selectedNode.parentId === document.rootNodeId}
              >
                {labels.promote}
              </button>
              <button
                type="button"
                className="viewer-botanical-button viewer-botanical-button--secondary justify-center disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handleDelete(selectedNode.id)}
                disabled={selectedNode.id === document.rootNodeId}
              >
                {labels.deleteNode}
              </button>
            </section>

            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.icon}</div>
              <input
                value={selectedNode.icon ?? ''}
                onChange={(event) => updateSelectedNode({ icon: event.target.value || null })}
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.92rem] font-medium text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.tags}</div>
              <input
                value={selectedNode.tags.join(', ')}
                placeholder={labels.tagsPlaceholder}
                onChange={(event) =>
                  updateSelectedNode({
                    tags: event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.92rem] font-medium text-[#3d342a] outline-none"
              />
            </section>

            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.note}</div>
              <div className="mt-2">
                <NoteEditor
                  key={selectedNode.id}
                  value={selectedNode.noteHtml}
                  placeholder={labels.notePlaceholder}
                  onChange={(nextValue) => updateSelectedNode({ noteHtml: nextValue })}
                />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.links}</div>
                <button
                  type="button"
                  className="rounded-full border border-[#d9cdbd] bg-[rgba(255,252,247,0.88)] px-2.5 py-1 text-[0.72rem] font-semibold text-[#6f6156]"
                  onClick={() =>
                    updateSelectedNode({
                      links: [
                        ...selectedNode.links,
                        { id: `link-${crypto.randomUUID()}`, label: '', url: '' },
                      ],
                    })
                  }
                >
                  {labels.addLink}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {selectedNode.links.map((link, index) => (
                  <div key={link.id} className="rounded-[18px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] p-3">
                    <div className="grid gap-2">
                      <input
                        value={link.label}
                        placeholder={labels.linkLabel}
                        onChange={(event) =>
                          updateSelectedNode({
                            links: updateLinkAtIndex(selectedNode.links, index, { label: event.target.value }),
                          })
                        }
                        className="w-full rounded-[12px] border border-[#e1d7c8] bg-white/70 px-3 py-2 text-[0.86rem] font-medium text-[#3d342a] outline-none"
                      />
                      <div className="flex gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-[#e1d7c8] bg-white/70 px-3 py-2">
                          <Link2 size={15} className="text-[#8b7d72]" />
                          <input
                            value={link.url}
                            placeholder={labels.linkUrl}
                            onChange={(event) =>
                              updateSelectedNode({
                                links: updateLinkAtIndex(selectedNode.links, index, { url: event.target.value }),
                              })
                            }
                            className="min-w-0 flex-1 border-0 bg-transparent text-[0.82rem] font-medium text-[#3d342a] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/70 text-[#9d8e82]"
                          onClick={() =>
                            updateSelectedNode({
                              links: selectedNode.links.filter((_, linkIndex) => linkIndex !== index),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[0.74rem] font-medium text-[#8b7d72]">{labels.invalidUrl}</div>
            </section>

            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.image}</div>
              <div className="mt-3 rounded-[18px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] p-3">
                {selectedNode.imageUrl ? (
                  <img
                    src={selectedNode.imageUrl}
                    alt={selectedNode.label}
                    className="h-36 w-full rounded-[16px] border border-[#ddd3c3] object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-[16px] border border-dashed border-[#ddcfbe] text-[0.82rem] font-medium text-[#8b7d72]">
                    {labels.uploadImage}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <label className="viewer-botanical-button viewer-botanical-button--secondary cursor-pointer">
                    <span className="flex items-center gap-2">
                      <ImagePlus size={16} />
                      {labels.uploadImage}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        void handleImageUpload(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {selectedNode.imageUrl ? (
                    <button
                      type="button"
                      className="viewer-botanical-button viewer-botanical-button--secondary"
                      onClick={() => updateSelectedNode({ imageUrl: null })}
                    >
                      {labels.removeImage}
                    </button>
                  ) : null}
                </div>
                {imageUploadError ? (
                  <div className="mt-2 text-[0.78rem] font-medium text-[#a04b4b]">{imageUploadError}</div>
                ) : null}
              </div>
            </section>

            <section>
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8b7d72]">{labels.documents}</div>
              <div className="mt-3 rounded-[18px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] p-3">
                {availableDocuments.length ? (
                  <div className="space-y-2">
                    {availableDocuments.map((item: TutorDocument) => (
                      <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#e1d7c8] bg-white/70 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedNode.documentRefs.includes(item.id)}
                          onChange={() =>
                            updateSelectedNode({
                              documentRefs: selectedNode.documentRefs.includes(item.id)
                                ? selectedNode.documentRefs.filter((documentId) => documentId !== item.id)
                                : [...selectedNode.documentRefs, item.id],
                            })
                          }
                          className="mt-1 h-4 w-4 rounded border-[#cdbda8] text-[#7a9e7e] focus:ring-[#7a9e7e]"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[0.82rem] font-semibold text-[#3d342a]">{item.filename}</div>
                          <div className="mt-1 text-[0.72rem] font-medium text-[#8b7d72]">{item.mime_type.toUpperCase()}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-[0.82rem] font-medium text-[#8b7d72]">{labels.noDocuments}</div>
                )}

                {staleDocumentRefs.length ? (
                  <div className="mt-4 rounded-[14px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-3 py-2">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9d5555]">{labels.staleDocuments}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {staleDocumentRefs.map((documentId) => (
                        <span
                          key={documentId}
                          className="rounded-full border border-[#e7bcbc] bg-white/75 px-2 py-0.5 text-[0.72rem] font-medium text-[#9d5555]"
                        >
                          {documentId}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {saveStatus === 'error' ? (
              <section className="rounded-[18px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-4 py-3 text-[#9d5555]">
                <div className="flex items-center gap-2 text-[0.82rem] font-semibold">
                  <AlertCircle size={16} />
                  {labels.saveError}
                </div>
                <div className="mt-2 text-[0.78rem] font-medium leading-6">
                  {saveErrorMessage || labels.saveErrorBody}
                </div>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

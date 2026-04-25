import { Bot, ChevronDown, ChevronUp, GitBranch, LoaderCircle, PenLine, SendHorizontal, Trash2, Upload } from 'lucide-react';
import { artifactTitle, formatDocumentType, interpolateCount, resolveDocumentTitle, TOOL_ORDER } from '@/features/ai-tutor/aiTutorUtils';
import type {
  AiTutorCopyLike,
  PendingTutorUpload,
  TutorStatusNotice,
  TutorToolKind,
  TutorToolRuntime,
} from '@/features/ai-tutor/aiTutorTypes';
import { TutorMarkdown } from '@/shared/ai-tutor/TutorMarkdown';
import type { MindMapSummary, QuizOutputLanguage, TutorDocument } from '@/shared/api/viewer/types';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

export function AiTutorConversationPane({
  copy,
  language,
  personaCopy,
  suggestedPrompts,
  hasStartedConversation,
  transcript,
  isSending,
  handleSend,
}: {
  copy: AiTutorCopyLike;
  language: 'zh-CN' | 'en';
  personaCopy: { welcomeTitle: string; prompts: string[] };
  suggestedPrompts: string[];
  hasStartedConversation: boolean;
  transcript: Array<{ role: 'user' | 'model'; text: string }>;
  isSending: boolean;
  handleSend: (text: string) => Promise<void>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-5 pb-4 pt-0 md:px-6 md:pb-5">
      <div className="flex h-full min-h-0 flex-col gap-4">
        {!hasStartedConversation ? (
          <>
            <div className="rounded-[26px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(247,242,231,0.88)_100%)] px-5 py-5 shadow-[0_14px_32px_rgba(90,70,50,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-[3.45rem] w-[3.45rem] shrink-0 items-center justify-center rounded-[18px] border border-[#e4d2b6] bg-[linear-gradient(145deg,#f4ddbc_0%,#d4b896_100%)] text-white shadow-[0_10px_24px_rgba(196,149,106,0.2)]">
                  <Bot size={28} />
                </div>
                <div>
                  <p className="viewer-botanical-eyebrow">{copy.aiTutor.deskEyebrow}</p>
                  <h1
                    className="mt-4 text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                    style={{ fontFamily: '"Cormorant Garamond", serif' }}
                  >
                    {personaCopy.welcomeTitle}
                  </h1>
                </div>
              </div>
            </div>

            <div className="shrink-0 space-y-2.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="flex w-full items-center rounded-[20px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.88)] px-4 py-3.5 text-left text-[0.86rem] font-semibold text-[#4d4239] shadow-[0_8px_18px_rgba(90,70,50,0.05)] transition hover:border-[#d2c5b2] hover:bg-[#fffdf9] disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void handleSend(prompt)}
                  disabled={isSending}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1" />
          </>
        ) : (
          <div className="viewer-scrollbar-hidden min-h-0 flex-1 overflow-auto pr-1">
            <div className="space-y-3 rounded-[22px] border border-[#e2d7c9] bg-[rgba(255,250,245,0.84)] p-4">
              {transcript.map((message, index) => {
                const isPendingModel =
                  isSending && index === transcript.length - 1 && message.role === 'model' && !message.text.trim();
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === 'user'
                        ? 'ml-auto max-w-[82%] rounded-[20px] border border-[#b9d1bc] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] px-4 py-3 text-[0.88rem] font-medium leading-6 text-white shadow-[0_12px_24px_rgba(122,158,126,0.2)]'
                        : 'max-w-[82%] rounded-[20px] border border-[#e2d7c9] bg-[rgba(255,252,247,0.92)] px-4 py-3 text-[0.88rem] font-medium leading-6 text-[#4d4239] shadow-[0_10px_24px_rgba(90,70,50,0.08)]'
                    }
                  >
                    {isPendingModel ? (
                      language === 'zh-CN' ? '正在思考…' : 'Thinking…'
                    ) : (
                      <TutorMarkdown text={message.text} className="leading-6" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AiTutorComposer({
  copy,
  input,
  setInput,
  isSending,
  handleSend,
  visibleNotice,
  noticeToneClass,
}: {
  copy: AiTutorCopyLike;
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  handleSend: (text: string) => Promise<void>;
  visibleNotice: TutorStatusNotice | null;
  noticeToneClass: string;
}) {
  return (
    <div className="shrink-0 space-y-3 px-5 pb-0 pt-0 md:px-6">
      <div className="flex items-center gap-3 rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-3.5 py-2.5 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
        <PenLine size={19} className="text-[#9a8d82]" />
        <input
          aria-label={copy.aiTutor.placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[0.92rem] font-semibold text-[#3d342a] outline-none placeholder:text-[#a9968a]"
          placeholder={copy.aiTutor.placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSend(input);
            }
          }}
        />
        <button
          type="button"
          aria-label={copy.aiTutor.send}
          className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(145deg,#a8c5ac_0%,#7a9e7e_100%)] text-white transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
          onClick={() => void handleSend(input)}
          disabled={isSending}
        >
          <SendHorizontal size={22} />
        </button>
      </div>
      {visibleNotice ? (
        <div className={`viewer-botanical-notice ${noticeToneClass}`}>{visibleNotice.text}</div>
      ) : null}
    </div>
  );
}

export function AiTutorWorkspaceSection({
  copy,
  expanded,
  toggleLabel,
  sectionToggleButtonClass,
  toggleSection,
  toolDefinitions,
  toolRuntime,
  latestMindMap,
  createQuizPending,
  createMindMapPending,
  documentsErrorMessage,
  isSending,
  hasToolInFlight,
  openTool,
}: {
  copy: AiTutorCopyLike;
  expanded: boolean;
  toggleLabel: string;
  sectionToggleButtonClass: string;
  toggleSection: () => void;
  toolDefinitions: Record<TutorToolKind, { label: string; ariaLabel: string; icon: React.ComponentType<{ size?: number }>; tones: string }>;
  toolRuntime: Record<TutorToolKind, TutorToolRuntime>;
  latestMindMap: MindMapSummary | null;
  createQuizPending: boolean;
  createMindMapPending: boolean;
  documentsErrorMessage: string | null;
  isSending: boolean;
  hasToolInFlight: boolean;
  openTool: (kind: TutorToolKind) => void;
}) {
  return (
    <section className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <h2
          className="text-[2.1rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          {copy.aiTutor.workspaceTitle}
        </h2>
        <button
          type="button"
          aria-label={toggleLabel}
          aria-expanded={expanded}
          aria-controls={expanded ? 'ai-tutor-workspace-panel' : undefined}
          className={sectionToggleButtonClass}
          onClick={toggleSection}
          title={toggleLabel}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded ? (
        <div id="ai-tutor-workspace-panel" className="mt-3 grid grid-cols-2 gap-2.5">
          {TOOL_ORDER.map((kind) => {
            const definition = toolDefinitions[kind];
            const runtime = toolRuntime[kind];
            const ToolIcon = definition.icon;
            const subtitle =
              runtime.status === 'loading'
                ? copy.aiTutor.generating
                : runtime.status === 'error'
                  ? runtime.errorMessage || copy.aiTutor.failed
                  : kind === 'mindmap' && latestMindMap
                    ? copy.aiTutor.generatedReady
                  : runtime.modal
                    ? copy.aiTutor.quizReady
                    : kind === 'quiz'
                      ? copy.aiTutor.quizRequiresUpload
                      : copy.aiTutor.mindMapRequiresUpload;

            const isDocsToolPending =
              kind === 'quiz' ? createQuizPending : kind === 'mindmap' ? createMindMapPending : false;

            return (
              <button
                key={kind}
                type="button"
                aria-label={definition.ariaLabel}
                className={`rounded-[20px] border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${definition.tones}`}
                onClick={() => void openTool(kind)}
                disabled={isSending || hasToolInFlight || (isDocsToolPending || Boolean(documentsErrorMessage))}
              >
                <ToolIcon size={16} />
                <div className="mt-6 text-[0.82rem] font-bold">{definition.label}</div>
                <div className="mt-1 text-[0.72rem] font-medium opacity-80">{subtitle}</div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function AiTutorMaterialsSection({
  copy,
  userId,
  selectedDocumentCount,
  fileInputRef,
  pendingUploads,
  createDocumentPending,
  documentsErrorMessage,
  materialsExpanded,
  materialsToggleLabel,
  sectionToggleButtonClass,
  toggleMaterials,
  handleUploadFiles,
  documentsQueryLoading,
  documents,
  selectedDocumentIds,
  setSelectedDocumentIds,
  editingDocumentId,
  editingDocumentTitle,
  setEditingDocumentId,
  setEditingDocumentTitle,
  cancelTitleCommitRef,
  handleCommitDocumentTitle,
  handleDeleteDocument,
  deleteDocumentPending,
  updateDocumentTitlePending,
}: {
  copy: AiTutorCopyLike;
  userId: string | undefined;
  selectedDocumentCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pendingUploads: PendingTutorUpload[];
  createDocumentPending: boolean;
  documentsErrorMessage: string | null;
  materialsExpanded: boolean;
  materialsToggleLabel: string;
  sectionToggleButtonClass: string;
  toggleMaterials: () => void;
  handleUploadFiles: (files: FileList | null) => Promise<void>;
  documentsQueryLoading: boolean;
  documents: TutorDocument[];
  selectedDocumentIds: string[];
  setSelectedDocumentIds: React.Dispatch<React.SetStateAction<string[]>>;
  editingDocumentId: string | null;
  editingDocumentTitle: string;
  setEditingDocumentId: (value: string | null) => void;
  setEditingDocumentTitle: (value: string) => void;
  cancelTitleCommitRef: React.MutableRefObject<string | null>;
  handleCommitDocumentTitle: (document: TutorDocument, rawTitle: string) => Promise<void>;
  handleDeleteDocument: (document: TutorDocument) => Promise<void>;
  deleteDocumentPending: boolean;
  updateDocumentTitlePending: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-[1.8rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            {copy.aiTutor.materials}
          </h3>
          <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
            {userId
              ? interpolateCount(copy.aiTutor.materialsSelected, selectedDocumentCount)
              : copy.aiTutor.materialsProtected}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            aria-label={copy.aiTutor.uploadMaterials}
            multiple
            accept=".pdf,.docx,.ppt,.pptx,.doc"
            onChange={(event) => {
              void handleUploadFiles(event.target.files);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-2 text-[0.76rem]"
            onClick={() => fileInputRef.current?.click()}
            disabled={!userId || pendingUploads.length > 0 || createDocumentPending || Boolean(documentsErrorMessage)}
          >
            <span className="flex items-center gap-2">
              <Upload size={15} />
              {copy.aiTutor.uploadMaterials}
            </span>
          </button>
          <button
            type="button"
            aria-label={materialsToggleLabel}
            aria-expanded={materialsExpanded}
            aria-controls={materialsExpanded ? 'ai-tutor-materials-panel' : undefined}
            className={sectionToggleButtonClass}
            onClick={toggleMaterials}
            title={materialsToggleLabel}
          >
            {materialsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {materialsExpanded ? (
        <div id="ai-tutor-materials-panel" className="viewer-scrollbar-hidden mt-3 max-h-[240px] overflow-auto pr-1">
          {documentsErrorMessage ? (
            <div className="rounded-[18px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-4 py-4 text-[0.78rem] font-medium leading-6 text-[#8b4a4a]">
              {documentsErrorMessage}
            </div>
          ) : documentsQueryLoading ? (
            <div className="rounded-[18px] border border-dashed border-[#ddcfbe] px-4 py-4 text-[0.78rem] font-medium text-[#8b7d72]">
              {copy.aiTutor.materialsLoading}
            </div>
          ) : documents.length || pendingUploads.length ? (
            <div className="space-y-2.5">
              {pendingUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-3 rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 shadow-[0_8px_18px_rgba(90,70,50,0.05)]"
                >
                  <LoaderCircle size={17} className="animate-spin text-[#8b7d72]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.82rem] font-bold text-[#3d342a]">{upload.filename}</div>
                    <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
                      {formatDocumentType(upload)} · {copy.aiTutor.materialUploading}
                    </div>
                  </div>
                </div>
              ))}
              {documents.map((document) => {
                const checked = selectedDocumentIds.includes(document.id);
                const isEditingTitle = editingDocumentId === document.id;
                return (
                  <div
                    key={document.id}
                    className="flex items-center gap-3 rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 shadow-[0_8px_18px_rgba(90,70,50,0.05)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedDocumentIds((current) =>
                          current.includes(document.id)
                            ? current.filter((id) => id !== document.id)
                            : [...current, document.id],
                        );
                      }}
                      className="h-4 w-4 rounded border-[#cdbda8] text-[#7a9e7e] focus:ring-[#7a9e7e]"
                    />
                    <div className="min-w-0 flex-1">
                      {isEditingTitle ? (
                        <input
                          autoFocus
                          aria-label={`${copy.aiTutor.editMaterialTitle} ${resolveDocumentTitle(document)}`}
                          className="w-full rounded-[12px] border border-[#d8cab7] bg-white/90 px-3 py-2 text-[0.82rem] font-bold text-[#3d342a] outline-none focus:border-[#b9d1bc] focus:ring-2 focus:ring-[#dceadc]"
                          value={editingDocumentTitle}
                          onChange={(event) => setEditingDocumentTitle(event.target.value)}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onBlur={() => {
                            if (cancelTitleCommitRef.current === document.id) {
                              cancelTitleCommitRef.current = null;
                              return;
                            }
                            void handleCommitDocumentTitle(document, editingDocumentTitle);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleCommitDocumentTitle(document, editingDocumentTitle);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelTitleCommitRef.current = document.id;
                              setEditingDocumentId(null);
                              setEditingDocumentTitle('');
                            }
                          }}
                          placeholder={copy.aiTutor.materialTitlePlaceholder}
                        />
                      ) : (
                        <div className="truncate text-[0.82rem] font-bold text-[#3d342a]">{resolveDocumentTitle(document)}</div>
                      )}
                      <div className="mt-1 text-[0.74rem] font-medium text-[#8b7d72]">
                        {formatDocumentType(document)} · {interpolateCount(copy.aiTutor.materialChars, document.extracted_chars)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/70 text-[#9d8e82] transition hover:border-[#d0c0ad] hover:text-[#6e5f54] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`${copy.aiTutor.editMaterialTitle} ${resolveDocumentTitle(document)}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          cancelTitleCommitRef.current = null;
                          setEditingDocumentId(document.id);
                          setEditingDocumentTitle(document.display_title ?? '');
                        }}
                        disabled={deleteDocumentPending || updateDocumentTitlePending}
                      >
                        <PenLine size={15} />
                      </button>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#e1d7c8] bg-white/70 text-[#9d8e82] transition hover:border-[#d0c0ad] hover:text-[#6e5f54] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`${copy.aiTutor.deleteMaterial} ${document.filename}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleDeleteDocument(document);
                        }}
                        disabled={deleteDocumentPending || updateDocumentTitlePending}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#ddcfbe] px-4 py-4 text-center shadow-[0_8px_18px_rgba(90,70,50,0.04)]">
              <div className="text-[0.82rem] font-bold text-[#4d4239]">{copy.aiTutor.materialsEmptyTitle}</div>
              <div className="mt-2 text-[0.74rem] font-medium leading-6 text-[#8b7d72]">{copy.aiTutor.materialsEmptyBody}</div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AiTutorNotebookSection({
  copy,
  notebookSectionRef,
  notebookExpanded,
  notebookToggleLabel,
  sectionToggleButtonClass,
  toggleNotebook,
  hasNotebookContent,
  showMindMapNotebookRuntime,
  mindMapRuntime,
  openTool,
  mindMaps,
  openMindMapNotebookItem,
  notebookItems,
  openNotebookItem,
}: {
  copy: AiTutorCopyLike;
  notebookSectionRef: React.RefObject<HTMLElement | null>;
  notebookExpanded: boolean;
  notebookToggleLabel: string;
  sectionToggleButtonClass: string;
  toggleNotebook: () => void;
  hasNotebookContent: boolean;
  showMindMapNotebookRuntime: boolean;
  mindMapRuntime: TutorToolRuntime;
  openTool: (kind: TutorToolKind) => void;
  mindMaps: MindMapSummary[];
  openMindMapNotebookItem: (mindMapId: string) => void;
  notebookItems: Array<{
    kind: TutorToolKind;
    runtime: TutorToolRuntime;
    definition: {
      label: string;
      icon: React.ComponentType<{ size?: number }>;
    };
  }>;
  openNotebookItem: (itemModal: TutorToolModal | null) => void;
}) {
  return (
    <section
      ref={notebookSectionRef}
      className="rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-4 shadow-[0_10px_24px_rgba(90,70,50,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className="text-[1.8rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          {copy.aiTutor.notebookTitle}
        </h3>
        <button
          type="button"
          aria-label={notebookToggleLabel}
          aria-expanded={notebookExpanded}
          aria-controls={notebookExpanded ? 'ai-tutor-notebook-panel' : undefined}
          className={sectionToggleButtonClass}
          onClick={toggleNotebook}
          title={notebookToggleLabel}
        >
          {notebookExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {notebookExpanded ? (
        <div id="ai-tutor-notebook-panel" className="mt-3">
          {hasNotebookContent ? (
            <div className="space-y-2.5">
              {showMindMapNotebookRuntime ? (
                <div className="rounded-[20px] border border-[#d6e2d5] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(245,250,244,0.95)_100%)] px-4 py-4 text-left shadow-[0_12px_24px_rgba(90,70,50,0.06)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#edf4ec] text-[#4f7655]">
                      {mindMapRuntime.status === 'loading' ? <LoaderCircle size={21} className="animate-spin" /> : <GitBranch size={21} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.96rem] font-bold leading-tight text-[#35523a]">
                        {copy.aiTutor.mindMap}
                      </div>
                      <div className="mt-1 text-[0.8rem] font-medium text-[#6f7f70]">
                        {mindMapRuntime.status === 'loading'
                          ? copy.aiTutor.quizGeneratingBody
                          : mindMapRuntime.errorMessage || copy.aiTutor.failed}
                      </div>
                    </div>
                    {mindMapRuntime.status === 'error' ? (
                      <button
                        type="button"
                        className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-1.5 text-[0.72rem]"
                        onClick={() => void openTool('mindmap')}
                      >
                        {copy.aiTutor.retryGeneration}
                      </button>
                    ) : (
                      <span className="text-[0.72rem] font-semibold text-[#9d8e82]">{copy.aiTutor.generating}</span>
                    )}
                  </div>
                </div>
              ) : null}

              {mindMaps.map((mindMap) => (
                <button
                  key={mindMap.id}
                  type="button"
                  className="block w-full rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(90,70,50,0.05)] transition hover:border-[#d1dbc9] hover:shadow-[0_14px_28px_rgba(90,70,50,0.08)]"
                  onClick={() => openMindMapNotebookItem(mindMap.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#edf4ec] text-[#4f7655]">
                      <GitBranch size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.84rem] font-bold text-[#3d342a]">{mindMap.title}</div>
                      <div className="mt-1 text-[0.76rem] font-medium text-[#8b7d72]">{copy.aiTutor.generatedReady}</div>
                    </div>
                  </div>
                </button>
              ))}

              {notebookItems.map(({ kind, runtime, definition }) => {
                const ToolIcon = definition.icon;
                const isPendingDocsTool = runtime.status === 'loading';
                const canOpen = Boolean(runtime.modal) && runtime.status !== 'loading';
                const showRetry = runtime.status === 'error';
                const isClickableNotebookCard = kind === 'quiz' && canOpen && !showRetry;
                const statusText =
                  isPendingDocsTool
                    ? copy.aiTutor.quizGeneratingBody
                    : runtime.status === 'loading'
                    ? copy.aiTutor.generating
                    : runtime.status === 'error'
                      ? runtime.errorMessage || copy.aiTutor.failed
                      : copy.aiTutor.quizReady;
                const titleText = isPendingDocsTool
                  ? copy.aiTutor.quizGeneratingTitle
                  : artifactTitle(runtime.modal, definition.label);
                const cardClassName =
                  isPendingDocsTool
                    ? 'rounded-[20px] border border-[#d6e2d5] bg-[linear-gradient(180deg,rgba(255,253,249,0.98)_0%,rgba(245,250,244,0.95)_100%)] px-4 py-4 text-left shadow-[0_12px_24px_rgba(90,70,50,0.06)]'
                    : 'rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(90,70,50,0.05)]';

                const cardContent = (
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        isPendingDocsTool
                          ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#edf4ec] text-[#4f7655]'
                          : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#f3efe8] text-[#8a7764]'
                      }
                    >
                      {isPendingDocsTool ? <LoaderCircle size={21} className="animate-spin" /> : <ToolIcon size={17} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={isPendingDocsTool ? 'text-[0.96rem] font-bold leading-tight text-[#35523a]' : 'text-[0.84rem] font-bold text-[#3d342a]'}>
                        {titleText}
                      </div>
                      <div className={isPendingDocsTool ? 'mt-1 text-[0.8rem] font-medium text-[#6f7f70]' : 'mt-1 text-[0.76rem] font-medium text-[#8b7d72]'}>
                        {statusText}
                      </div>
                    </div>
                    {showRetry ? (
                      <button
                        type="button"
                        className="viewer-botanical-button viewer-botanical-button--secondary px-3 py-1.5 text-[0.72rem]"
                        onClick={() => void openTool(kind)}
                      >
                        {copy.aiTutor.retryGeneration}
                      </button>
                    ) : canOpen ? null : (
                      <span className="text-[0.72rem] font-semibold text-[#9d8e82]">{copy.aiTutor.generating}</span>
                    )}
                  </div>
                );

                if (isClickableNotebookCard) {
                  return (
                    <button
                      key={`${kind}-${runtime.updatedAt ?? runtime.status}`}
                      type="button"
                      className={`block w-full transition hover:border-[#d1dbc9] hover:shadow-[0_14px_28px_rgba(90,70,50,0.08)] ${cardClassName}`}
                      onClick={() => openNotebookItem(runtime.modal)}
                    >
                      {cardContent}
                    </button>
                  );
                }

                return (
                  <div
                    key={`${kind}-${runtime.updatedAt ?? runtime.status}`}
                    className={cardClassName}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[#ddcfbe] bg-[rgba(255,252,247,0.74)] px-4 py-4 text-center shadow-[0_8px_18px_rgba(90,70,50,0.04)]">
              <div className="text-[0.86rem] font-bold text-[#4d4239]">{copy.aiTutor.noArtifactsTitle}</div>
              <div className="mt-2 text-[0.76rem] font-medium leading-6 text-[#8b7d72]">{copy.aiTutor.noArtifactsBody}</div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AiTutorToolConfigDialog({
  copy,
  active,
  label,
  title,
  description,
  close,
  selectedDocumentCount,
  questionCountInput,
  setQuestionCountInput,
  quizLanguage,
  setQuizLanguage,
  mindMapPromptInput,
  setMindMapPromptInput,
  isQuizConfigOpen,
  isDocsToolSubmitDisabled,
  docsToolValidationMessage,
  handleCreateQuizCourse,
  handleCreateMindMap,
}: {
  copy: AiTutorCopyLike;
  active: boolean;
  label: string;
  title: string;
  description: string;
  close: () => void;
  selectedDocumentCount: number;
  questionCountInput: string;
  setQuestionCountInput: (value: string) => void;
  quizLanguage: QuizOutputLanguage;
  setQuizLanguage: (value: QuizOutputLanguage) => void;
  mindMapPromptInput: string;
  setMindMapPromptInput: (value: string) => void;
  isQuizConfigOpen: boolean;
  isDocsToolSubmitDisabled: boolean;
  docsToolValidationMessage: string | null;
  handleCreateQuizCourse: () => Promise<void>;
  handleCreateMindMap: () => Promise<void>;
}) {
  if (!active) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[rgba(61,52,42,0.38)] px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="viewer-surface w-full max-w-lg bg-[rgba(254,250,245,0.96)] p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="viewer-botanical-eyebrow text-[0.72rem]">{label}</p>
            <h2
              className="mt-2 text-[2rem] font-semibold text-[var(--viewer-text)]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary"
            onClick={close}
          >
            {copy.common.cancel}
          </button>
        </div>

        <p className="mt-4 text-[0.84rem] font-medium leading-7 text-[#6f6156]">{description}</p>
        <p className="mt-3 text-[0.76rem] font-semibold text-[#8b7d72]">
          {interpolateCount(copy.aiTutor.materialsSelected, selectedDocumentCount)}
        </p>

        {isQuizConfigOpen ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-[0.82rem] font-bold text-[#4d4239]" htmlFor="ai-tutor-question-count">
                {copy.aiTutor.questionCount}
              </label>
              <input
                id="ai-tutor-question-count"
                type="number"
                min={5}
                max={30}
                step={1}
                inputMode="numeric"
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.9rem] font-semibold text-[#3d342a] outline-none"
                value={questionCountInput}
                onChange={(event) => setQuestionCountInput(event.target.value)}
              />
            </div>
            <div>
              <label className="text-[0.82rem] font-bold text-[#4d4239]" htmlFor="ai-tutor-quiz-language">
                {copy.aiTutor.quizLanguage}
              </label>
              <select
                id="ai-tutor-quiz-language"
                className="mt-2 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.9rem] font-semibold text-[#3d342a] outline-none"
                value={quizLanguage}
                onChange={(event) => setQuizLanguage(event.target.value as QuizOutputLanguage)}
              >
                <option value="en">{copy.aiTutor.quizLanguageEnglish}</option>
                <option value="zh-CN">{copy.aiTutor.quizLanguageChinese}</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label className="text-[0.82rem] font-bold text-[#4d4239]" htmlFor="ai-tutor-mindmap-prompt">
              {copy.aiTutor.mindMapPromptLabel}
            </label>
            <textarea
              id="ai-tutor-mindmap-prompt"
              className="mt-2 min-h-32 w-full rounded-[16px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-4 py-3 text-[0.9rem] font-medium leading-7 text-[#3d342a] outline-none"
              value={mindMapPromptInput}
              onChange={(event) => setMindMapPromptInput(event.target.value)}
              placeholder={copy.aiTutor.mindMapPromptPlaceholder}
            />
          </div>
        )}

        {docsToolValidationMessage ? (
          <div className="mt-4 rounded-[18px] border border-[#efc8c8] bg-[rgba(255,245,245,0.92)] px-4 py-3 text-[0.76rem] font-medium text-[#8b4a4a]">
            {docsToolValidationMessage}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="viewer-botanical-button viewer-botanical-button--secondary"
            onClick={close}
          >
            {copy.common.cancel}
          </button>
          <button
            type="button"
            className="viewer-botanical-button"
            onClick={() => void (isQuizConfigOpen ? handleCreateQuizCourse() : handleCreateMindMap())}
            disabled={isDocsToolSubmitDisabled}
          >
            {isQuizConfigOpen ? copy.aiTutor.createQuizCourse : copy.aiTutor.createMindMap}
          </button>
        </div>
      </div>
    </div>
  );
}

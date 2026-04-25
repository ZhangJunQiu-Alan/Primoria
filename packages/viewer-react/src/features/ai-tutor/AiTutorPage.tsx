import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAiTutorPersonaDefinition } from '@/shared/ai-tutor/persona';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import {
  AiTutorComposer,
  AiTutorConversationPane,
  AiTutorMaterialsSection,
  AiTutorNotebookSection,
  AiTutorToolConfigDialog,
  AiTutorWorkspaceSection,
} from '@/features/ai-tutor/components/AiTutorSections';
import { useAiTutorMaterials } from '@/features/ai-tutor/hooks/useAiTutorMaterials';
import { useAiTutorSession } from '@/features/ai-tutor/hooks/useAiTutorSession';
import { useAiTutorTools } from '@/features/ai-tutor/hooks/useAiTutorTools';

export function AiTutorPage() {
  const language = useProductLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const aiTutorPersona = useAppSelector((state) => state.viewerPreferences.aiTutorPersona);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const copy = useViewerCopy();
  const personaCopy = getAiTutorPersonaDefinition(aiTutorPersona, language);
  const processedCompanionIntentRef = useRef<string | null>(null);

  const session = useAiTutorSession({
    welcomeBody: personaCopy.welcomeBody,
    copy,
  });
  const {
    handleSend,
    hasStartedConversation,
    initialToolRuntime,
    input,
    isSending,
    messages,
    notice,
    sessionContext,
    setInput,
    setNotice,
    setSessionContext,
    syncSession,
    transcript,
  } = session;

  const materials = useAiTutorMaterials({
    userId,
    copy,
    setNotice,
  });

  const tools = useAiTutorTools({
    userId,
    copy,
    language,
    initialToolRuntime,
    selectedDocumentIds: materials.selectedDocumentIds,
    pendingUploadsCount: materials.pendingUploads.length,
    documentsCount: materials.documents.length,
    documentsErrorMessage: materials.documentsErrorMessage,
    messages,
    sessionContext,
    setNotice,
    navigate,
  });
  const {
    activeDocsToolKind,
    closeActiveToolConfig,
    createMindMapMutation,
    createQuizMutation,
    docsToolConfigDescription,
    docsToolConfigLabel,
    docsToolConfigTitle,
    docsToolValidationMessage,
    expandedSections,
    handleCreateMindMap,
    handleCreateQuizCourse,
    hasNotebookContent,
    hasToolInFlight,
    isDocsToolSubmitDisabled,
    isQuizConfigOpen,
    latestMindMap,
    mindMapPromptInput,
    mindMaps,
    notebookItems,
    notebookSectionRef,
    openMindMapNotebookItem,
    openNotebookItem,
    openTool,
    questionCountInput,
    quizLanguage,
    setActiveToolConfig,
    setExpandedSections,
    setMindMapPromptInput,
    setQuestionCountInput,
    setQuizLanguage,
    showMindMapNotebookRuntime,
    toggleSection,
    toolDefinitions,
    toolRuntime,
  } = tools;

  useEffect(() => {
    syncSession(toolRuntime);
  }, [syncSession, toolRuntime]);

  useEffect(() => {
    const source = searchParams.get('source');
    const intent = searchParams.get('intent');
    const courseTitle = searchParams.get('courseTitle');

    if (source !== 'home-companion' || (intent !== 'quiz' && intent !== 'mindmap')) {
      return;
    }

    const intentKey = searchParams.toString();
    if (processedCompanionIntentRef.current === intentKey) {
      return;
    }
    processedCompanionIntentRef.current = intentKey;

    setSessionContext({
      source: 'home-companion',
      courseTitle: courseTitle?.trim() || null,
    });

    if (intent === 'quiz') {
      setNotice({
        tone: 'info',
        text: copy.aiTutor.quizRequiresUpload,
      });
      navigate('/ai-tutor', { replace: true });
      return;
    }

    setExpandedSections((current) => ({
      ...current,
      materials: true,
    }));
    setActiveToolConfig({ kind: 'mindmap' });
    setNotice({
      tone: 'info',
      text: copy.aiTutor.mindMapRequiresUpload,
    });
    navigate('/ai-tutor', { replace: true });
  }, [
    copy.aiTutor.mindMapRequiresUpload,
    copy.aiTutor.quizRequiresUpload,
    navigate,
    searchParams,
    setActiveToolConfig,
    setExpandedSections,
    setNotice,
    setSessionContext,
  ]);

  useEffect(() => {
    if (!materials.documentsErrorMessage) {
      return;
    }

    setExpandedSections((current) => (current.materials ? current : { ...current, materials: true }));
  }, [materials.documentsErrorMessage, setExpandedSections]);

  const visibleNotice = notice?.tone === 'info' ? null : notice;
  const noticeToneClass =
    notice?.tone === 'success'
      ? 'viewer-botanical-notice--success'
      : notice?.tone === 'error'
        ? 'viewer-botanical-notice--error'
        : 'viewer-botanical-notice--info';
  const workspaceToggleLabel = expandedSections.workspace ? copy.aiTutor.collapseWorkspace : copy.aiTutor.expandWorkspace;
  const materialsToggleLabel = expandedSections.materials ? copy.aiTutor.collapseMaterials : copy.aiTutor.expandMaterials;
  const notebookToggleLabel = expandedSections.notebook ? copy.aiTutor.collapseNotebook : copy.aiTutor.expandNotebook;
  const sectionToggleButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd3c3] bg-[rgba(255,252,247,0.86)] text-[#6f6359] transition hover:border-[#d1c4b4] hover:bg-[#fffaf2]';

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-[90%] max-w-[1380px] flex-col overflow-hidden px-0 pt-0"
      style={{
        minHeight: 'calc(100% + var(--viewer-dock-content-gap) - var(--viewer-dock-height) - var(--viewer-dock-offset))',
        marginBottom: 'calc(var(--viewer-dock-height) + var(--viewer-dock-offset) - var(--viewer-dock-content-gap))',
      }}
    >
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.78fr)_304px]">
        <section className="flex min-h-0 flex-col overflow-hidden bg-transparent">
          <AiTutorConversationPane
            copy={copy}
            language={language}
            personaCopy={personaCopy}
            suggestedPrompts={personaCopy.prompts}
            hasStartedConversation={hasStartedConversation}
            transcript={transcript}
            isSending={isSending}
            handleSend={handleSend}
          />

          <AiTutorComposer
            copy={copy}
            input={input}
            setInput={setInput}
            isSending={isSending}
            handleSend={handleSend}
            visibleNotice={visibleNotice}
            noticeToneClass={noticeToneClass}
          />
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <div className="viewer-scrollbar-hidden min-h-0 flex-1 overflow-auto pr-1">
            <div className="space-y-3">
              <AiTutorWorkspaceSection
                copy={copy}
                expanded={expandedSections.workspace}
                toggleLabel={workspaceToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleSection={() => toggleSection('workspace')}
                toolDefinitions={toolDefinitions}
                toolRuntime={toolRuntime}
                latestMindMap={latestMindMap}
                createQuizPending={createQuizMutation.isPending}
                createMindMapPending={createMindMapMutation.isPending}
                documentsErrorMessage={materials.documentsErrorMessage}
                isSending={isSending}
                hasToolInFlight={hasToolInFlight}
                openTool={openTool}
              />

              <AiTutorMaterialsSection
                copy={copy}
                userId={userId}
                selectedDocumentCount={materials.selectedDocumentIds.length}
                fileInputRef={materials.fileInputRef}
                pendingUploads={materials.pendingUploads}
                createDocumentPending={materials.createDocumentMutation.isPending}
                documentsErrorMessage={materials.documentsErrorMessage}
                materialsExpanded={expandedSections.materials}
                materialsToggleLabel={materialsToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleMaterials={() => toggleSection('materials')}
                handleUploadFiles={materials.handleUploadFiles}
                documentsQueryLoading={materials.documentsQuery.isLoading}
                documents={materials.documents}
                selectedDocumentIds={materials.selectedDocumentIds}
                setSelectedDocumentIds={materials.setSelectedDocumentIds}
                editingDocumentId={materials.editingDocumentId}
                editingDocumentTitle={materials.editingDocumentTitle}
                setEditingDocumentId={materials.setEditingDocumentId}
                setEditingDocumentTitle={materials.setEditingDocumentTitle}
                cancelTitleCommitRef={materials.cancelTitleCommitRef}
                handleCommitDocumentTitle={materials.handleCommitDocumentTitle}
                handleDeleteDocument={materials.handleDeleteDocument}
                deleteDocumentPending={materials.deleteDocumentMutation.isPending}
                updateDocumentTitlePending={materials.updateDocumentTitleMutation.isPending}
              />

              <AiTutorNotebookSection
                copy={copy}
                notebookSectionRef={notebookSectionRef}
                notebookExpanded={expandedSections.notebook}
                notebookToggleLabel={notebookToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleNotebook={() => toggleSection('notebook')}
                hasNotebookContent={hasNotebookContent}
                showMindMapNotebookRuntime={showMindMapNotebookRuntime}
                mindMapRuntime={toolRuntime.mindmap}
                openTool={openTool}
                mindMaps={mindMaps}
                openMindMapNotebookItem={openMindMapNotebookItem}
                notebookItems={notebookItems}
                openNotebookItem={openNotebookItem}
              />
            </div>
          </div>
        </aside>
      </div>

      <AiTutorToolConfigDialog
        copy={copy}
        active={Boolean(activeDocsToolKind)}
        label={docsToolConfigLabel}
        title={docsToolConfigTitle}
        description={docsToolConfigDescription}
        close={closeActiveToolConfig}
        selectedDocumentCount={materials.selectedDocumentIds.length}
        questionCountInput={questionCountInput}
        setQuestionCountInput={setQuestionCountInput}
        quizLanguage={quizLanguage}
        setQuizLanguage={setQuizLanguage}
        mindMapPromptInput={mindMapPromptInput}
        setMindMapPromptInput={setMindMapPromptInput}
        isQuizConfigOpen={isQuizConfigOpen}
        isDocsToolSubmitDisabled={isDocsToolSubmitDisabled}
        docsToolValidationMessage={docsToolValidationMessage}
        handleCreateQuizCourse={handleCreateQuizCourse}
        handleCreateMindMap={handleCreateMindMap}
      />
    </div>
  );
}

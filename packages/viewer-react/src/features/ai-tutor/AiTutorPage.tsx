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

  const materials = useAiTutorMaterials({
    userId,
    copy,
    setNotice: session.setNotice,
  });

  const tools = useAiTutorTools({
    userId,
    copy,
    language,
    initialToolRuntime: session.initialToolRuntime,
    selectedDocumentIds: materials.selectedDocumentIds,
    pendingUploadsCount: materials.pendingUploads.length,
    documentsCount: materials.documents.length,
    documentsErrorMessage: materials.documentsErrorMessage,
    messages: session.messages,
    sessionContext: session.sessionContext,
    setNotice: session.setNotice,
    navigate,
  });

  useEffect(() => {
    session.syncSession(tools.toolRuntime);
  }, [session.syncSession, tools.toolRuntime]);

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

    session.setSessionContext({
      source: 'home-companion',
      courseTitle: courseTitle?.trim() || null,
    });

    if (intent === 'quiz') {
      session.setNotice({
        tone: 'info',
        text: copy.aiTutor.quizRequiresUpload,
      });
      navigate('/ai-tutor', { replace: true });
      return;
    }

    tools.setExpandedSections((current) => ({
      ...current,
      materials: true,
    }));
    tools.setActiveToolConfig({ kind: 'mindmap' });
    session.setNotice({
      tone: 'info',
      text: copy.aiTutor.mindMapRequiresUpload,
    });
    navigate('/ai-tutor', { replace: true });
  }, [
    copy.aiTutor.mindMapRequiresUpload,
    copy.aiTutor.quizRequiresUpload,
    navigate,
    searchParams,
    session.setNotice,
    session.setSessionContext,
    tools.setActiveToolConfig,
    tools.setExpandedSections,
  ]);

  useEffect(() => {
    if (!materials.documentsErrorMessage) {
      return;
    }

    tools.setExpandedSections((current) => (current.materials ? current : { ...current, materials: true }));
  }, [materials.documentsErrorMessage, tools.setExpandedSections]);

  const visibleNotice = session.notice?.tone === 'info' ? null : session.notice;
  const noticeToneClass =
    session.notice?.tone === 'success'
      ? 'viewer-botanical-notice--success'
      : session.notice?.tone === 'error'
        ? 'viewer-botanical-notice--error'
        : 'viewer-botanical-notice--info';
  const workspaceToggleLabel = tools.expandedSections.workspace ? copy.aiTutor.collapseWorkspace : copy.aiTutor.expandWorkspace;
  const materialsToggleLabel = tools.expandedSections.materials ? copy.aiTutor.collapseMaterials : copy.aiTutor.expandMaterials;
  const notebookToggleLabel = tools.expandedSections.notebook ? copy.aiTutor.collapseNotebook : copy.aiTutor.expandNotebook;
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
            hasStartedConversation={session.hasStartedConversation}
            transcript={session.transcript}
            isSending={session.isSending}
            handleSend={session.handleSend}
          />

          <AiTutorComposer
            copy={copy}
            input={session.input}
            setInput={session.setInput}
            isSending={session.isSending}
            handleSend={session.handleSend}
            visibleNotice={visibleNotice}
            noticeToneClass={noticeToneClass}
          />
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          <div className="viewer-scrollbar-hidden min-h-0 flex-1 overflow-auto pr-1">
            <div className="space-y-3">
              <AiTutorWorkspaceSection
                copy={copy}
                expanded={tools.expandedSections.workspace}
                toggleLabel={workspaceToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleSection={() => tools.toggleSection('workspace')}
                toolDefinitions={tools.toolDefinitions}
                toolRuntime={tools.toolRuntime}
                latestMindMap={tools.latestMindMap}
                createQuizPending={tools.createQuizMutation.isPending}
                createMindMapPending={tools.createMindMapMutation.isPending}
                documentsErrorMessage={materials.documentsErrorMessage}
                isSending={session.isSending}
                hasToolInFlight={tools.hasToolInFlight}
                openTool={tools.openTool}
              />

              <AiTutorMaterialsSection
                copy={copy}
                userId={userId}
                selectedDocumentCount={materials.selectedDocumentIds.length}
                fileInputRef={materials.fileInputRef}
                pendingUploads={materials.pendingUploads}
                createDocumentPending={materials.createDocumentMutation.isPending}
                documentsErrorMessage={materials.documentsErrorMessage}
                materialsExpanded={tools.expandedSections.materials}
                materialsToggleLabel={materialsToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleMaterials={() => tools.toggleSection('materials')}
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
                notebookSectionRef={tools.notebookSectionRef}
                notebookExpanded={tools.expandedSections.notebook}
                notebookToggleLabel={notebookToggleLabel}
                sectionToggleButtonClass={sectionToggleButtonClass}
                toggleNotebook={() => tools.toggleSection('notebook')}
                hasNotebookContent={tools.hasNotebookContent}
                showMindMapNotebookRuntime={tools.showMindMapNotebookRuntime}
                mindMapRuntime={tools.toolRuntime.mindmap}
                openTool={tools.openTool}
                mindMaps={tools.mindMaps}
                openMindMapNotebookItem={tools.openMindMapNotebookItem}
                notebookItems={tools.notebookItems}
                openNotebookItem={tools.openNotebookItem}
              />
            </div>
          </div>
        </aside>
      </div>

      <AiTutorToolConfigDialog
        copy={copy}
        active={Boolean(tools.activeDocsToolKind)}
        label={tools.docsToolConfigLabel}
        title={tools.docsToolConfigTitle}
        description={tools.docsToolConfigDescription}
        close={tools.closeActiveToolConfig}
        selectedDocumentCount={materials.selectedDocumentIds.length}
        questionCountInput={tools.questionCountInput}
        setQuestionCountInput={tools.setQuestionCountInput}
        quizLanguage={tools.quizLanguage}
        setQuizLanguage={tools.setQuizLanguage}
        mindMapPromptInput={tools.mindMapPromptInput}
        setMindMapPromptInput={tools.setMindMapPromptInput}
        isQuizConfigOpen={tools.isQuizConfigOpen}
        isDocsToolSubmitDisabled={tools.isDocsToolSubmitDisabled}
        docsToolValidationMessage={tools.docsToolValidationMessage}
        handleCreateQuizCourse={tools.handleCreateQuizCourse}
        handleCreateMindMap={tools.handleCreateMindMap}
      />
    </div>
  );
}

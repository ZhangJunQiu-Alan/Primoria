import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';
import { parseCommunitySection } from '@/features/community/communityTypes';
import { useCommunityWorkspace } from '@/features/community/hooks/useCommunityWorkspace';
import { useCommunityNotesWorkspace } from '@/features/community/hooks/useCommunityNotesWorkspace';
import {
  CommunitySectionNav,
  CommunityStatusBanner,
  CompanionContextBanner,
  MessagesPane,
  NotesPane,
  StudyRoomsPane,
  TrendingPane,
} from '@/features/community/components/CommunitySections';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';

export function CommunityPage() {
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const [searchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? '';
  const requestedSection = parseCommunitySection(searchParams.get('section'));
  const companionTopic = searchParams.get('source') === 'home-companion' ? searchParams.get('topic')?.trim() ?? '' : '';

  const workspace = useCommunityWorkspace({
    userId,
    copy,
    requestedSection,
  });

  const notes = useCommunityNotesWorkspace({
    initialNotes: workspace.workspace?.notes,
    companionTopic,
    noteMutation: workspace.noteMutation,
    refreshCommunity: workspace.refreshCommunity,
    setSection: workspace.setSection,
    setStatus: workspace.setStatus,
    userId,
  });

  if (workspace.workspaceQuery.isLoading) {
    return (
      <div className="w-full px-5 py-6 md:px-6 md:py-7">
        <LoadingStateCard />
      </div>
    );
  }

  if (workspace.workspaceQuery.error) {
    return (
      <div className="w-full px-5 py-6 md:px-6 md:py-7">
        <ErrorStateCard
          message={workspace.workspaceQuery.error instanceof Error ? workspace.workspaceQuery.error.message : undefined}
          onRetry={() => void workspace.workspaceQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1380px] px-0">
      <div className="grid gap-0 xl:grid-cols-[240px_minmax(0,1fr)]">
        <CommunitySectionNav
          copy={copy}
          language={language}
          section={workspace.section}
          setSection={workspace.setSection}
          unreadCount={workspace.unreadCount}
        />

        <section className="space-y-3.5 px-5 py-5 md:px-6 md:py-6">
          <CompanionContextBanner
            companionTopic={companionTopic}
            language={language}
            onCreateNote={notes.addCompanionContextNote}
            onOpenDiscussions={() => workspace.setSection('trending')}
          />

          <CommunityStatusBanner status={workspace.status} />

          {workspace.section === 'study' ? (
            <StudyRoomsPane
              roomForm={workspace.roomForm}
              setRoomForm={workspace.setRoomForm}
              createRoomMutation={workspace.createRoomMutation}
              studyRooms={workspace.studyRooms}
              userId={userId}
              joinRoomMutation={workspace.joinRoomMutation}
              deleteRoomMutation={workspace.deleteRoomMutation}
              copy={copy}
            />
          ) : null}

          {workspace.section === 'messages' ? (
            <MessagesPane
              people={workspace.people}
              selectedPersonId={workspace.selectedPersonId}
              setSelectedPersonId={workspace.setSelectedPersonId}
              directConversationMutation={workspace.directConversationMutation}
              conversations={workspace.conversations}
              activeConversation={workspace.activeConversation}
              setConversationId={workspace.setConversationId}
              composer={workspace.composer}
              setComposer={workspace.setComposer}
              sendMessageMutation={workspace.sendMessageMutation}
              userId={userId}
              copy={copy}
            />
          ) : null}

          {workspace.section === 'trending' ? (
            <TrendingPane
              discussionForm={workspace.discussionForm}
              setDiscussionForm={workspace.setDiscussionForm}
              createDiscussionMutation={workspace.createDiscussionMutation}
              discussions={workspace.discussions}
              toggleLikeMutation={workspace.toggleLikeMutation}
              commentDrafts={workspace.commentDrafts}
              setCommentDrafts={workspace.setCommentDrafts}
              commentMutation={workspace.commentMutation}
            />
          ) : null}

          {workspace.section === 'notes' ? (
            <NotesPane
              copy={copy}
              language={language}
              notesDraft={notes.notesDraft}
              filteredNotes={notes.filteredNotes}
              pinnedNotes={notes.pinnedNotes}
              unpinnedNotes={notes.unpinnedNotes}
              activeNote={notes.activeNote}
              activeNoteKey={notes.activeNoteKey}
              setActiveNoteKey={notes.setActiveNoteKey}
              addBlankNote={notes.addBlankNote}
              noteQuery={notes.noteQuery}
              setNoteQuery={notes.setNoteQuery}
              noteTab={notes.noteTab}
              setNoteTab={notes.setNoteTab}
              noteColorPickerOpen={notes.noteColorPickerOpen}
              setNoteColorPickerOpen={notes.setNoteColorPickerOpen}
              updateNoteDraft={notes.updateNoteDraft}
              noteSaveStatus={notes.noteSaveStatus}
              noteStats={notes.noteStats}
              deleteConfirmKey={notes.deleteConfirmKey}
              setDeleteConfirmKey={notes.setDeleteConfirmKey}
              deleteNote={notes.deleteNote}
              titleInputRef={notes.titleInputRef}
              bodyInputRef={notes.bodyInputRef}
              colorPickerRef={notes.colorPickerRef}
              handleNoteTitleChange={notes.handleNoteTitleChange}
              handleNoteBodyChange={notes.handleNoteBodyChange}
              handleBodyKeyDown={notes.handleBodyKeyDown}
              formatText={notes.formatText}
              insertListItem={notes.insertListItem}
              insertQuote={notes.insertQuote}
              insertDivider={notes.insertDivider}
              tagInputActiveKey={notes.tagInputActiveKey}
              setTagInputActiveKey={notes.setTagInputActiveKey}
              tagInputValue={notes.tagInputValue}
              setTagInputValue={notes.setTagInputValue}
              commitTagInput={notes.commitTagInput}
              removeNoteTag={notes.removeNoteTag}
              noteToSaveRef={notes.noteToSaveRef}
              noteMutation={workspace.noteMutation}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

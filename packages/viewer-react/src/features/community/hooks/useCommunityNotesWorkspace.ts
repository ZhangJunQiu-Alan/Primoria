import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteCommunityNote } from '@/shared/api/viewer/communityApi';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import {
  makeNoteDraft,
  type CommunitySection,
  NOTE_COLOR_MAP,
  noteRelativeTime,
  type NoteDraft,
} from '@/features/community/communityTypes';

function sortNotesByUpdatedAt(notes: NoteDraft[]) {
  return [...notes].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function useCommunityNotesWorkspace({
  initialNotes,
  companionTopic,
  noteMutation,
  refreshCommunity,
  setSection,
  setStatus,
  userId,
}: {
  initialNotes: Array<{
    id: string;
    title: string;
    body: string;
    room_id?: string | null;
    lesson_id?: string | null;
    updated_at: string;
  }> | undefined;
  companionTopic: string;
  noteMutation: { mutate: (note: NoteDraft) => void };
  refreshCommunity: () => Promise<void>;
  setSection: (section: CommunitySection) => void;
  setStatus: (status: { tone: 'success' | 'error'; message: string } | null) => void;
  userId: string;
}) {
  const [notesDraft, setNotesDraft] = useState<NoteDraft[]>([]);
  const [activeNoteKey, setActiveNoteKey] = useState<string | null>(null);
  const [noteQuery, setNoteQuery] = useState('');
  const [noteTab, setNoteTab] = useState<'all' | 'pin' | 'tag'>('all');
  const [noteSaveStatus, setNoteSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [noteColorPickerOpen, setNoteColorPickerOpen] = useState(false);
  const [tagInputActiveKey, setTagInputActiveKey] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteToSaveRef = useRef<NoteDraft | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialNotes && notesDraft.length === 0) {
      const drafts = sortNotesByUpdatedAt(initialNotes.map((note) =>
        makeNoteDraft({
          id: note.id,
          _key: note.id,
          title: note.title,
          body: note.body,
          room_id: note.room_id,
          lesson_id: note.lesson_id,
          updatedAt: note.updated_at,
        }),
      ));
      setNotesDraft(drafts);
    }
  }, [initialNotes, notesDraft.length]);

  useEffect(() => {
    if (notesDraft.length > 0 && !activeNoteKey) {
      setActiveNoteKey(notesDraft[0]._key);
    }
  }, [notesDraft, activeNoteKey]);

  useEffect(() => {
    const el = titleInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [activeNoteKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setNoteColorPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCommunityNote(userId, noteId),
    onSuccess: async () => {
      await refreshCommunity();
      captureViewerEvent('viewer_community_note_deleted');
    },
    onError: (error) => {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '无法删除笔记。' });
      captureViewerError(error, { area: 'community_note_delete' });
    },
  });

  const filteredNotes = useMemo(() => {
    let list = [...notesDraft];
    if (noteQuery) {
      const q = noteQuery.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    if (noteTab === 'pin') list = list.filter((n) => n.pinned);
    if (noteTab === 'tag') list = list.filter((n) => n.tags.length > 0);
    return list;
  }, [notesDraft, noteQuery, noteTab]);
  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);
  const activeNote = notesDraft.find((d) => d._key === activeNoteKey) ?? null;
  const activeNoteBody = activeNote?.body ?? '';
  const noteStats = useMemo(
    () => ({
      chars: activeNoteBody.length,
      words: activeNoteBody.trim() ? activeNoteBody.trim().split(/\s+/).length : 0,
      lines: activeNoteBody.split('\n').length,
    }),
    [activeNoteBody],
  );

  const addBlankNote = () => {
    const newNote = makeNoteDraft({ title: '未命名笔记', body: '' });
    setNotesDraft((current) => [newNote, ...current]);
    setActiveNoteKey(newNote._key);
    setSection('notes');
  };

  const addCompanionContextNote = () => {
    const defaultTitle = companionTopic ? `${companionTopic} 笔记` : '未命名笔记';
    const newNote = makeNoteDraft({ title: defaultTitle, body: '' });
    setNotesDraft((current) => [newNote, ...current]);
    setActiveNoteKey(newNote._key);
    setSection('notes');
  };

  const triggerDebouncedSave = (note: NoteDraft) => {
    noteToSaveRef.current = note;
    setNoteSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
    }, 800);
  };

  const handleNoteTitleChange = (newTitle: string, note: NoteDraft) => {
    const updated: NoteDraft = { ...note, title: newTitle, updatedAt: new Date().toISOString() };
    setNotesDraft((current) => sortNotesByUpdatedAt(current.map((d) => (d._key === note._key ? updated : d))));
    const el = titleInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
    triggerDebouncedSave(updated);
  };

  const handleNoteBodyChange = (newBody: string, note: NoteDraft) => {
    const updated: NoteDraft = { ...note, body: newBody, updatedAt: new Date().toISOString() };
    setNotesDraft((current) => sortNotesByUpdatedAt(current.map((d) => (d._key === note._key ? updated : d))));
    triggerDebouncedSave(updated);
  };

  const updateNoteDraft = (_key: string, patch: Partial<NoteDraft>) => {
    setNotesDraft((current) =>
      sortNotesByUpdatedAt(current.map((d) => (d._key === _key ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d))),
    );
  };

  const formatText = (type: 'bold' | 'italic' | 'strike', note: NoteDraft) => {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    const wrap = type === 'bold' ? '**' : type === 'italic' ? '*' : '~~';
    const replacement = sel ? `${wrap}${sel}${wrap}` : `${wrap}文字${wrap}`;
    ta.setRangeText(replacement, start, end, 'select');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  };

  const insertListItem = (listType: 'ul' | 'ol', note: NoteDraft) => {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
    const prefix = listType === 'ul' ? '- ' : '1. ';
    ta.setRangeText(prefix, ls, ls, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  };

  const insertQuote = (note: NoteDraft) => {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
    ta.setRangeText('> ', ls, ls, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  };

  const insertDivider = (note: NoteDraft) => {
    const ta = bodyInputRef.current;
    if (!ta) return;
    ta.setRangeText('\n\n---\n\n', ta.selectionStart, ta.selectionStart, 'end');
    ta.focus();
    handleNoteBodyChange(ta.value, note);
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, note: NoteDraft) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      formatText('bold', note);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      formatText('italic', note);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (noteToSaveRef.current) noteMutation.mutate(noteToSaveRef.current);
    }
    if (e.key === 'Enter') {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const ls = ta.value.lastIndexOf('\n', pos - 1) + 1;
      const line = ta.value.slice(ls, pos);
      const ulMatch = /^(\s*- )(.+)/.exec(line);
      const olMatch = /^(\s*\d+\. )(.+)/.exec(line);
      if (ulMatch) {
        e.preventDefault();
        ta.setRangeText('\n- ', pos, pos, 'end');
        handleNoteBodyChange(ta.value, note);
      } else if (olMatch) {
        e.preventDefault();
        ta.setRangeText(`\n${parseInt(line) + 1}. `, pos, pos, 'end');
        handleNoteBodyChange(ta.value, note);
      }
    }
  };

  const commitTagInput = () => {
    const tag = tagInputValue.trim();
    if (tag && tagInputActiveKey) {
      const note = notesDraft.find((d) => d._key === tagInputActiveKey);
      if (note && !note.tags.includes(tag)) {
        updateNoteDraft(tagInputActiveKey, { tags: [...note.tags, tag] });
      }
    }
    setTagInputActiveKey(null);
    setTagInputValue('');
  };

  const removeNoteTag = (noteKey: string, tag: string) => {
    const note = notesDraft.find((d) => d._key === noteKey);
    if (note) updateNoteDraft(noteKey, { tags: note.tags.filter((t) => t !== tag) });
  };

  const deleteNote = (noteKey: string) => {
    const note = notesDraft.find((d) => d._key === noteKey);
    const remaining = notesDraft.filter((d) => d._key !== noteKey);
    setNotesDraft(remaining);
    setDeleteConfirmKey(null);
    const next = remaining.find((d) => d._key !== noteKey) ?? remaining[0] ?? null;
    setActiveNoteKey(next?._key ?? null);
    if (note?.id) deleteNoteMutation.mutate(note.id);
  };

  return {
    activeNote,
    activeNoteKey,
    addBlankNote,
    addCompanionContextNote,
    bodyInputRef,
    colorPickerRef,
    commitTagInput,
    deleteConfirmKey,
    deleteNote,
    filteredNotes,
    formatText,
    handleBodyKeyDown,
    handleNoteBodyChange,
    handleNoteTitleChange,
    insertDivider,
    insertListItem,
    insertQuote,
    noteColorPickerOpen,
    noteQuery,
    noteSaveStatus,
    noteStats,
    noteTab,
    notesDraft,
    noteToSaveRef,
    pinnedNotes,
    removeNoteTag,
    setActiveNoteKey,
    setDeleteConfirmKey,
    setNoteColorPickerOpen,
    setNoteQuery,
    setNoteSaveStatus,
    setNoteTab,
    setTagInputActiveKey,
    setTagInputValue,
    tagInputActiveKey,
    tagInputValue,
    titleInputRef,
    triggerDebouncedSave,
    unpinnedNotes,
    updateNoteDraft,
  };
}

export { NOTE_COLOR_MAP, noteRelativeTime };

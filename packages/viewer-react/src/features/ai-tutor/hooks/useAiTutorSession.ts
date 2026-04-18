import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateTutorReplyStream,
  persistGeminiKey,
  type TutorMessage,
} from '@/shared/api/geminiClient';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import {
  defaultTutorMessages,
  persistAiTutorSession,
  readAiTutorSession,
  replaceLastModelMessage,
} from '@/features/ai-tutor/aiTutorUtils';
import type {
  AiTutorCopyLike,
  TutorConversationContext,
  TutorStatusNotice,
  TutorToolKind,
  TutorToolRuntime,
} from '@/features/ai-tutor/aiTutorTypes';

export function useAiTutorSession({
  welcomeBody,
  copy,
}: {
  welcomeBody: string;
  copy: AiTutorCopyLike;
}) {
  const initialSessionRef = useRef<ReturnType<typeof readAiTutorSession> | null>(null);
  if (initialSessionRef.current === null) {
    initialSessionRef.current = readAiTutorSession(welcomeBody);
  }

  const initialSession = initialSessionRef.current;
  const [messages, setMessages] = useState<TutorMessage[]>(() => initialSession.messages);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<TutorStatusNotice | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sessionContext, setSessionContext] = useState<TutorConversationContext | null>(() => initialSession.context);
  const streamedReplyRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const latestMessagesRef = useRef(messages);
  const latestContextRef = useRef(sessionContext);

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    latestContextRef.current = sessionContext;
  }, [sessionContext]);

  function flushStreamedReply(force = false) {
    const apply = () => {
      frameRef.current = null;
      const nextText = streamedReplyRef.current;
      setMessages((current) => replaceLastModelMessage(current, nextText));
    };

    if (force) {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      apply();
      return;
    }

    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(apply);
  }

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      if (trimmed.startsWith('/apikey ')) {
        await persistGeminiKey(trimmed.replace('/apikey', '').trim());
        setNotice({ tone: 'success', text: copy.aiTutor.apiKeyStored });
        setInput('');
        captureViewerEvent('viewer_ai_tutor_key_overridden');
        return;
      }

      const requestHistory = [...latestMessagesRef.current, { role: 'user', text: trimmed } as TutorMessage];
      streamedReplyRef.current = '';
      setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'model', text: '' }]);
      setInput('');
      setNotice({ tone: 'info', text: copy.aiTutor.responsePreparing });
      setIsSending(true);

      try {
        captureViewerEvent('viewer_ai_tutor_message_sent', { length: trimmed.length });
        const result = await generateTutorReplyStream(requestHistory, {
          onToken(token) {
            streamedReplyRef.current += token;
            flushStreamedReply();
          },
          onFinal(payload) {
            streamedReplyRef.current = payload.reply;
            flushStreamedReply(true);
            captureViewerEvent('viewer_ai_tutor_stream_completed', {
              toolCount: payload.usedTools.length,
            });
          },
        });
        if (!result.reply.trim()) {
          throw new Error('AI Tutor returned an empty response.');
        }
        setNotice(null);
      } catch (error) {
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last?.role === 'model' && !last.text.trim()) {
            next.pop();
          }
          return next;
        });
        setNotice({ tone: 'error', text: error instanceof Error ? error.message : copy.aiTutor.missingKey });
        captureViewerError(error, { area: 'ai_tutor_reply' });
      } finally {
        if (streamedReplyRef.current) {
          flushStreamedReply(true);
        }
        setIsSending(false);
      }
    },
    [copy.aiTutor.apiKeyStored, copy.aiTutor.missingKey, copy.aiTutor.responsePreparing, isSending],
  );

  const syncSession = useCallback((toolRuntime: Record<TutorToolKind, TutorToolRuntime>) => {
    persistAiTutorSession({
      messages: latestMessagesRef.current,
      toolRuntime,
      context: latestContextRef.current,
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.role !== 'model') {
        return current;
      }
      if (current[0].text === welcomeBody) {
        return current;
      }
      return defaultTutorMessages(welcomeBody);
    });
  }, [welcomeBody]);

  const transcript = useMemo(() => messages.slice(1), [messages]);

  return {
    handleSend,
    hasStartedConversation: transcript.length > 0,
    initialToolRuntime: initialSession.toolRuntime,
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
  };
}

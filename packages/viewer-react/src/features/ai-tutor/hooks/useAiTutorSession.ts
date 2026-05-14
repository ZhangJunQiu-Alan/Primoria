import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateTutorReplyStream,
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

function resolveWelcomeMessages(messages: TutorMessage[], welcomeBody: string) {
  if (messages.length !== 1 || messages[0]?.role !== 'model') {
    return messages;
  }
  if (messages[0].text === welcomeBody) {
    return messages;
  }
  return defaultTutorMessages(welcomeBody);
}

export function useAiTutorSession({
  welcomeBody,
  copy,
}: {
  welcomeBody: string;
  copy: AiTutorCopyLike;
}) {
  const [{ context: initialContext, messages: initialMessages, toolRuntime: initialToolRuntime }] = useState(() =>
    readAiTutorSession(welcomeBody),
  );
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<TutorStatusNotice | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sessionContext, setSessionContext] = useState<TutorConversationContext | null>(initialContext);
  const streamedReplyRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const latestMessagesRef = useRef(messages);
  const latestContextRef = useRef(sessionContext);
  const resolvedMessages = useMemo(() => resolveWelcomeMessages(messages, welcomeBody), [messages, welcomeBody]);

  useEffect(() => {
    latestMessagesRef.current = resolvedMessages;
  }, [resolvedMessages]);

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

      const requestHistory = [...latestMessagesRef.current, { role: 'user', text: trimmed } as TutorMessage];
      streamedReplyRef.current = '';
      setMessages([...latestMessagesRef.current, { role: 'user', text: trimmed }, { role: 'model', text: '' }]);
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
    [copy.aiTutor.missingKey, copy.aiTutor.responsePreparing, isSending],
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

  const transcript = useMemo(() => resolvedMessages.slice(1), [resolvedMessages]);

  return {
    handleSend,
    hasStartedConversation: transcript.length > 0,
    initialToolRuntime,
    input,
    isSending,
    messages: resolvedMessages,
    notice,
    sessionContext,
    setInput,
    setNotice,
    setSessionContext,
    syncSession,
    transcript,
  };
}

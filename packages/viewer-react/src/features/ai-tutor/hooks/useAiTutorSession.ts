import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateTutorReplyStream,
  persistGeminiKey,
  type TutorMessage,
} from '@/shared/api/geminiClient';
import { createInteractiveVisual } from '@/shared/api/viewer/interactiveVisualApi';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import {
  attachArtifactToTranscriptModelMessage,
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
  language,
}: {
  welcomeBody: string;
  copy: AiTutorCopyLike;
  language: 'zh-CN' | 'en';
}) {
  const [{ context: initialContext, messages: initialMessages, toolRuntime: initialToolRuntime }] = useState(() =>
    readAiTutorSession(welcomeBody),
  );
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<TutorStatusNotice | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [generatingVisualTranscriptIndex, setGeneratingVisualTranscriptIndex] = useState<number | null>(null);
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

      if (trimmed.startsWith('/apikey ')) {
        await persistGeminiKey(trimmed.replace('/apikey', '').trim());
        setNotice({ tone: 'success', text: copy.aiTutor.apiKeyStored });
        setInput('');
        captureViewerEvent('viewer_ai_tutor_key_overridden');
        return;
      }

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
    [copy.aiTutor.apiKeyStored, copy.aiTutor.missingKey, copy.aiTutor.responsePreparing, isSending, language],
  );

  const handleGenerateVisual = useCallback(
    async (transcriptIndex: number) => {
      const transcriptMessages = latestMessagesRef.current.slice(1);
      const targetMessage = transcriptMessages[transcriptIndex];
      if (!targetMessage || targetMessage.role !== 'model') {
        return;
      }

      const sourceUserMessage = (() => {
        for (let index = transcriptIndex - 1; index >= 0; index -= 1) {
          const candidate = transcriptMessages[index];
          if (candidate?.role === 'user' && candidate.text.trim()) {
            return candidate.text.trim();
          }
        }
        return '';
      })();

      const combinedPrompt = [sourceUserMessage, targetMessage.text.trim()]
        .filter(Boolean)
        .join('\n\nTutor explanation:\n');

      if (!combinedPrompt.trim()) {
        return;
      }

      setGeneratingVisualTranscriptIndex(transcriptIndex);
      try {
        const artifact = await createInteractiveVisual({
          prompt: combinedPrompt,
          language,
          surface: 'ai-tutor',
        });
        setMessages((current) =>
          attachArtifactToTranscriptModelMessage(current, transcriptIndex, artifact),
        );
        setNotice({
          tone: 'success',
          text: language === 'zh-CN' ? '已生成交互式可视化内容。' : 'Interactive visual generated.',
        });
        captureViewerEvent('viewer_ai_tutor_interactive_visual_created', {
          template: artifact.template,
          mode: artifact.experienceMode,
        });
      } catch (error) {
        setNotice({
          tone: 'error',
          text: error instanceof Error ? error.message : copy.aiTutor.missingKey,
        });
        captureViewerError(error, { area: 'ai_tutor_interactive_visual' });
      } finally {
        setGeneratingVisualTranscriptIndex(null);
      }
    },
    [copy.aiTutor.missingKey, language],
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
    handleGenerateVisual,
    hasStartedConversation: transcript.length > 0,
    generatingVisualTranscriptIndex,
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

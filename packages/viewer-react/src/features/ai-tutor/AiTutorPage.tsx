import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  bootstrapGeminiKey,
  generateMindMap,
  generatePresentation,
  generateQuiz,
  generateTutorReplyStream,
  persistGeminiKey,
  type TutorMessage,
} from '@/shared/api/geminiClient';
import {
  BadgeHelp,
  Bot,
  FileText,
  GitBranch,
  MoreVertical,
  PenLine,
  SendHorizontal,
  Sparkles,
} from 'lucide-react';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { useViewerCopy } from '@/shared/theme/copy';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

const AiTutorToolDialog = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorToolDialog')).AiTutorToolDialog,
}));

type ToolStatus = {
  mindmap: boolean;
  quiz: boolean;
  presentation: boolean;
};

function replaceLastModelMessage(messages: TutorMessage[], text: string): TutorMessage[] {
  const next: TutorMessage[] = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]?.role === 'model') {
      next[index] = { ...next[index], text };
      return next;
    }
  }
  return [...next, { role: 'model', text }];
}

export function AiTutorPage() {
  const language = useProductLanguage();
  const copy = useViewerCopy();
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: 'model',
      text: copy.aiTutor.welcomeBody,
    },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [modal, setModal] = useState<TutorToolModal | null>(null);
  const [toolStatus, setToolStatus] = useState<ToolStatus>({
    mindmap: false,
    quiz: false,
    presentation: false,
  });
  const streamedReplyRef = useRef('');
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const suggestedPrompts = useMemo(
    () => copy.aiTutor.prompts,
    [copy.aiTutor.prompts],
  );

  const notebookItems = [
    {
      title: copy.aiTutor.mindMap,
      subtitle: toolStatus.mindmap ? copy.aiTutor.notebook.generated : copy.aiTutor.notebook.pending,
      icon: GitBranch,
    },
    {
      title: copy.aiTutor.quiz,
      subtitle: toolStatus.quiz ? copy.aiTutor.notebook.generated : copy.aiTutor.notebook.pending,
      icon: BadgeHelp,
    },
    {
      title: copy.aiTutor.notebook.playback,
      subtitle: toolStatus.presentation ? copy.aiTutor.notebook.generated : copy.aiTutor.notebook.pending,
      icon: FileText,
    },
    {
      title: language === 'zh-CN' ? '网络基础' : 'Network fundamentals',
      subtitle: copy.aiTutor.notebook.refreshedToday,
      icon: GitBranch,
    },
    {
      title: language === 'zh-CN' ? '协议闪卡' : 'Protocol flashcards',
      subtitle: copy.aiTutor.notebook.reviewedTwoHoursAgo,
      icon: PenLine,
    },
    {
      title: language === 'zh-CN' ? 'OSI 与 TCP/IP 笔记' : 'OSI and TCP/IP notes',
      subtitle: copy.aiTutor.notebook.syncedSummary,
      icon: FileText,
    },
  ] as const;

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

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    if (trimmed.startsWith('/apikey ')) {
      await persistGeminiKey(trimmed.replace('/apikey', '').trim());
      setStatus(copy.aiTutor.apiKeyStored);
      setInput('');
      captureViewerEvent('viewer_ai_tutor_key_overridden');
      return;
    }

    const userMessage: TutorMessage = { role: 'user', text: trimmed };
    const requestHistory = [...messages, userMessage];
    streamedReplyRef.current = '';
    setMessages((current) => [...current, userMessage, { role: 'model', text: '' }]);
    setInput('');
    setStatus('');
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
    } catch (error) {
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === 'model' && !last.text.trim()) {
          next.pop();
        }
        return next;
      });
      setStatus(error instanceof Error ? error.message : copy.aiTutor.missingKey);
      captureViewerError(error, { area: 'ai_tutor_reply' });
    } finally {
      if (streamedReplyRef.current) {
        flushStreamedReply(true);
      }
      setIsSending(false);
    }
  }

  async function openTool(kind: 'mindmap' | 'quiz' | 'presentation') {
    try {
      await bootstrapGeminiKey();
      if (kind === 'mindmap') {
        const payload = await generateMindMap(messages);
        setModal({ kind, payload });
        setToolStatus((current) => ({ ...current, mindmap: true }));
        captureViewerEvent('viewer_ai_tutor_tool_opened', { kind });
        return;
      }
      if (kind === 'quiz') {
        const payload = await generateQuiz(messages);
        setModal({ kind, payload });
        setToolStatus((current) => ({ ...current, quiz: true }));
        captureViewerEvent('viewer_ai_tutor_tool_opened', { kind });
        return;
      }
      const payload = await generatePresentation(messages);
      setModal({ kind, payload });
      setToolStatus((current) => ({ ...current, presentation: true }));
      captureViewerEvent('viewer_ai_tutor_tool_opened', { kind });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.aiTutor.missingKey);
      captureViewerError(error, { area: 'ai_tutor_tool', kind });
    }
  }

  const transcript = messages.slice(1);

  return (
    <div className="mx-auto flex h-full min-h-0 w-[90%] max-w-[1380px] flex-col overflow-hidden px-0 py-4 md:py-5">
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.78fr)_304px]">
        <section className="flex min-h-0 flex-col overflow-hidden bg-transparent">
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-5 md:px-6 md:py-6">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="rounded-[26px] border border-[#ddd3c3] bg-[linear-gradient(180deg,rgba(255,252,247,0.96)_0%,rgba(247,242,231,0.88)_100%)] px-5 py-5 shadow-[0_14px_32px_rgba(90,70,50,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-[3.45rem] w-[3.45rem] shrink-0 items-center justify-center rounded-[18px] border border-[#e4d2b6] bg-[linear-gradient(145deg,#f4ddbc_0%,#d4b896_100%)] text-white shadow-[0_10px_24px_rgba(196,149,106,0.2)]">
                    <Bot size={28} />
                  </div>
                  <div>
                    <p className="viewer-botanical-eyebrow">{copy.aiTutor.deskEyebrow}</p>
                    <h1
                      className="mt-2 text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
                      style={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      {copy.aiTutor.welcomeTitle}
                    </h1>
                    <p className="mt-3 max-w-[48rem] text-[0.92rem] leading-[1.85] text-[#6f6359]">
                      {copy.aiTutor.welcomeBody}
                    </p>
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

              {transcript.length > 0 ? (
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
                          {isPendingModel ? (language === 'zh-CN' ? '正在思考…' : 'Thinking…') : message.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1" />
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#eadfce] px-5 py-4">
            <div className="flex items-center gap-3 rounded-[22px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.9)] px-3.5 py-2.5 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
              <PenLine size={19} className="text-[#9a8d82]" />
              <input
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
            {status ? (
              <div className="viewer-botanical-notice viewer-botanical-notice--info mt-3">{status}</div>
            ) : null}
          </div>
        </section>

        <aside className="viewer-panel flex min-h-0 flex-col overflow-hidden rounded-[28px] p-4">
          <div className="shrink-0">
            <p className="viewer-botanical-eyebrow">{language === 'zh-CN' ? '工作区' : 'Workspace'}</p>
            <h2
              className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {language === 'zh-CN' ? '工作台' : 'Workspace'}
            </h2>
          </div>

          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2.5">
            <button
              type="button"
              aria-label={language === 'zh-CN' ? '打开思维导图' : 'Open mind map'}
              className="rounded-[20px] border border-[#c8dbcb] bg-[#edf5ec] p-3.5 text-left text-[#5c7d60]"
              onClick={() => void openTool('mindmap')}
            >
              <GitBranch size={16} />
              <div className="mt-6 text-[0.82rem] font-bold">{copy.aiTutor.mindMap}</div>
            </button>
            <button
              type="button"
              aria-label={language === 'zh-CN' ? '生成报告' : 'Generate report'}
              className="rounded-[20px] border border-[#ead2af] bg-[#fbf3e6] p-3.5 text-left text-[#9a6f3f]"
              onClick={() => void handleSend(language === 'zh-CN' ? '请帮我生成一份学习报告。' : 'Please help me generate a study report.')}
            >
              <FileText size={16} />
              <div className="mt-6 text-[0.82rem] font-bold">{language === 'zh-CN' ? '报告' : 'Report'}</div>
            </button>
            <button
              type="button"
              aria-label={language === 'zh-CN' ? '打开测验' : 'Open quiz'}
              className="rounded-[20px] border border-[#ead2af] bg-[#f8efdf] p-3.5 text-left text-[#9c7342]"
              onClick={() => void openTool('quiz')}
            >
              <BadgeHelp size={16} />
              <div className="mt-6 text-[0.82rem] font-bold">{copy.aiTutor.quiz}</div>
            </button>
            <button
              type="button"
              aria-label={language === 'zh-CN' ? '打开演示' : 'Open presentation'}
              className="rounded-[20px] border border-[#dbcde3] bg-[#f3edf7] p-3.5 text-left text-[#7f6f88]"
              onClick={() => void openTool('presentation')}
            >
              <Sparkles size={16} />
              <div className="mt-6 text-[0.82rem] font-bold">{copy.aiTutor.presentation}</div>
            </button>
          </div>

          <div className="mt-4 shrink-0">
            <h3
              className="text-[1.8rem] font-semibold tracking-[-0.04em] text-[#3d342a]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              {language === 'zh-CN' ? '笔记本' : 'Notebook'}
            </h3>
          </div>

          <div className="viewer-scrollbar-hidden mt-3 min-h-0 flex-1 space-y-2.5 overflow-auto pr-1">
            {notebookItems.map((item) => (
              <div
                key={`${item.title}-${item.subtitle}`}
                className="flex items-start gap-3 rounded-[18px] border border-[#e1d7c8] bg-[rgba(255,252,247,0.88)] px-3.5 py-3 shadow-[0_8px_18px_rgba(90,70,50,0.05)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#f3efe8] text-[#8a7764]">
                  <item.icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.84rem] font-bold text-[#3d342a]">{item.title}</div>
                  <div className="mt-1 text-[0.76rem] font-medium text-[#8b7d72]">{item.subtitle}</div>
                </div>
                <MoreVertical size={16} className="mt-0.5 text-[#aa9d93]" />
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>{modal ? <AiTutorToolDialog modal={modal} onClose={() => setModal(null)} /> : null}</Suspense>
    </div>
  );
}

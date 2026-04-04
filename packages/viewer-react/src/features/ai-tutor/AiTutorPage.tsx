import { lazy, Suspense, useMemo, useState } from 'react';
import {
  bootstrapGeminiKey,
  generateMindMap,
  generatePresentation,
  generateQuiz,
  generateTutorReply,
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
import { captureViewerError, captureViewerEvent } from '@/shared/platform/observability';
import { viewerCopy } from '@/shared/theme/copy';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

const AiTutorToolDialog = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorToolDialog')).AiTutorToolDialog,
}));

type ToolStatus = {
  mindmap: boolean;
  quiz: boolean;
  presentation: boolean;
};

export function AiTutorPage() {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: 'model',
      text: '你好，欢迎来到你的 AI 导师。我可以帮你整理笔记、总结内容，并把想法转成清晰的知识结构。',
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

  const suggestedPrompts = useMemo(
    () => [
      '你好！可以帮我规划今天的学习任务吗？',
      '我是新用户，你能怎么帮我做笔记？',
      '可以把我的笔记总结成简单的思维导图吗？',
    ],
    [],
  );

  const notebookItems = [
    {
      title: '思维导图',
      subtitle: toolStatus.mindmap ? '已生成' : '尚未生成',
      icon: GitBranch,
    },
    {
      title: '测验',
      subtitle: toolStatus.quiz ? '已生成' : '尚未生成',
      icon: BadgeHelp,
    },
    {
      title: '演化回放',
      subtitle: toolStatus.presentation ? '已生成' : '尚未生成',
      icon: FileText,
    },
    {
      title: '网络基础',
      subtitle: '4 个来源 - 今日更新',
      icon: GitBranch,
    },
    {
      title: '协议闪卡',
      subtitle: '12 张卡片 - 2 小时前复习',
      icon: PenLine,
    },
    {
      title: 'OSI 与 TCP/IP 笔记',
      subtitle: '摘要已同步',
      icon: FileText,
    },
  ] as const;

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/apikey ')) {
      await persistGeminiKey(trimmed.replace('/apikey', '').trim());
      setStatus('Gemini key stored locally.');
      setInput('');
      captureViewerEvent('viewer_ai_tutor_key_overridden');
      return;
    }

    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setInput('');
    setStatus('');
    setIsSending(true);
    try {
      captureViewerEvent('viewer_ai_tutor_message_sent', { length: trimmed.length });
      const reply = await generateTutorReply([...messages, { role: 'user', text: trimmed }]);
      setMessages((current) => [...current, { role: 'model', text: reply }]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : viewerCopy.aiTutor.missingKey);
      captureViewerError(error, { area: 'ai_tutor_reply' });
    } finally {
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
      setStatus(error instanceof Error ? error.message : viewerCopy.aiTutor.missingKey);
      captureViewerError(error, { area: 'ai_tutor_tool', kind });
    }
  }

  const transcript = messages.slice(1);

  return (
    <div className="mx-auto flex h-full min-h-0 w-[86%] flex-col overflow-hidden px-0 py-3 md:py-4">
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.78fr)_304px]">
        <section className="viewer-panel flex min-h-0 flex-col overflow-hidden rounded-[28px]">
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-5 md:px-6 md:py-6">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="rounded-[24px] border border-[#e7edf7] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-5 shadow-[0_14px_32px_rgba(83,110,162,0.07)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-[3.45rem] w-[3.45rem] shrink-0 items-center justify-center rounded-[16px] bg-[#fff1db] text-[#e28d0f]">
                    <Bot size={28} />
                  </div>
                  <div>
                    <h1 className="text-[1.56rem] font-black tracking-[-0.05em] text-[#2c313b]">
                      {'你好，欢迎来到你的 AI 导师'}
                    </h1>
                    <p className="mt-3 max-w-[48rem] text-[0.9rem] leading-[1.72] text-[#7b879d]">
                      {'很高兴认识你。我可以帮你整理笔记、总结长内容，并把想法转成清晰的知识结构。你可以从一个简单问题开始，我会一步步引导你。'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 space-y-2.5">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="flex w-full items-center rounded-[18px] border border-[#d9e3ef] bg-[#fcfdff] px-4 py-3.5 text-left text-[0.86rem] font-semibold text-[#3a4458] shadow-[0_8px_18px_rgba(134,156,193,0.05)] transition hover:border-[#c3d2e7] hover:bg-white"
                    onClick={() => void handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {transcript.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-auto pr-1">
                  <div className="space-y-3 rounded-[20px] border border-[#eef3f8] bg-[#fbfdff] p-4">
                    {transcript.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={
                          message.role === 'user'
                            ? 'ml-auto max-w-[82%] rounded-[18px] bg-[#4b61f0] px-4 py-3 text-[0.88rem] font-medium leading-6 text-white'
                            : 'max-w-[82%] rounded-[18px] bg-white px-4 py-3 text-[0.88rem] font-medium leading-6 text-[#394256] shadow-[0_10px_24px_rgba(93,117,160,0.08)]'
                        }
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1" />
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#eef2f8] px-5 py-4">
            <div className="flex items-center gap-3 rounded-[20px] border border-[#ccd7e6] bg-white px-3.5 py-2.5 shadow-[0_10px_24px_rgba(129,151,189,0.08)]">
              <PenLine size={19} className="text-[#9aa7bd]" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-[0.92rem] font-semibold text-[#23304a] outline-none placeholder:text-[#a7b2c6]"
                placeholder={viewerCopy.aiTutor.placeholder}
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
                aria-label="发送"
                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eef2ff] text-[#27345c] transition hover:bg-[#e4ebff]"
                onClick={() => void handleSend(input)}
                disabled={isSending}
              >
                <SendHorizontal size={22} />
              </button>
            </div>
            {status ? (
              <div className="mt-3 rounded-[14px] bg-[#fff5df] px-4 py-2.5 text-xs font-semibold text-[#a06b00]">{status}</div>
            ) : null}
          </div>
        </section>

        <aside className="viewer-panel flex min-h-0 flex-col overflow-hidden rounded-[28px] p-4">
          <div className="shrink-0">
            <h2 className="text-[1.65rem] font-black tracking-[-0.05em] text-[#2a313e]">{'工作台'}</h2>
          </div>

          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2.5">
            <button
              type="button"
              aria-label="打开思维导图"
              className="rounded-[18px] bg-[#ddecff] p-3.5 text-left text-[#3b7ce2]"
              onClick={() => void openTool('mindmap')}
            >
              <GitBranch size={16} />
              <div className="mt-6 text-[0.82rem] font-black">{'思维导图'}</div>
            </button>
            <button
              type="button"
              aria-label="生成报告"
              className="rounded-[18px] bg-[#e6f7ed] p-3.5 text-left text-[#2d9e63]"
              onClick={() => void handleSend('请帮我生成一份学习报告。')}
            >
              <FileText size={16} />
              <div className="mt-6 text-[0.82rem] font-black">{'报告'}</div>
            </button>
            <button
              type="button"
              aria-label="打开测验"
              className="rounded-[18px] bg-[#fff4c8] p-3.5 text-left text-[#b38b10]"
              onClick={() => void openTool('quiz')}
            >
              <BadgeHelp size={16} />
              <div className="mt-6 text-[0.82rem] font-black">{'测验'}</div>
            </button>
            <button
              type="button"
              aria-label="打开演示"
              className="rounded-[18px] bg-[#eee5ff] p-3.5 text-left text-[#7351df]"
              onClick={() => void openTool('presentation')}
            >
              <Sparkles size={16} />
              <div className="mt-6 text-[0.82rem] font-black">{'演示'}</div>
            </button>
          </div>

          <div className="mt-4 shrink-0">
            <h3 className="text-[1.44rem] font-black tracking-[-0.05em] text-[#2a313e]">{'笔记本'}</h3>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-auto pr-1">
            {notebookItems.map((item) => (
              <div
                key={`${item.title}-${item.subtitle}`}
                className="flex items-start gap-3 rounded-[16px] border border-[#dfe7f3] bg-white px-3.5 py-3 shadow-[0_8px_18px_rgba(134,156,193,0.05)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#f3f6fb] text-[#6b7a90]">
                  <item.icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.84rem] font-black text-[#2c3445]">{item.title}</div>
                  <div className="mt-1 text-[0.76rem] font-medium text-[#8b97ab]">{item.subtitle}</div>
                </div>
                <MoreVertical size={16} className="mt-0.5 text-[#97a4b9]" />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {modal ? (
        <Suspense fallback={<div className="sr-only">{'Opening tool'}</div>}>
          <AiTutorToolDialog modal={modal} onClose={() => setModal(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { BookOpenText, Clock3, Search, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchUserStats } from '@/shared/api/viewer/profileApi';
import { ErrorStateCard, LoadingStateCard } from '@/shared/layout/AsyncState';
import { useAppSelector } from '@/shared/state/store';
import { Live2DHeroModel } from './Live2DHeroModel';

export function HomePage() {
  const user = useAppSelector((state) => state.auth.user);

  const statsQuery = useQuery({
    queryKey: ['viewer', 'stats', user?.id],
    queryFn: () => fetchUserStats(user?.id),
    enabled: Boolean(user),
  });
  const stats = statsQuery.data;
  const totalXp = (stats?.total_xp ?? 0).toLocaleString();
  const rhythmScore = Math.max(18, Math.min(96, (stats?.current_streak ?? 0) * 11));

  if (statsQuery.isLoading) {
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <LoadingStateCard />
      </div>
    );
  }

  if (statsQuery.error) {
    const message =
      (statsQuery.error instanceof Error && statsQuery.error.message) ||
      undefined;
    return (
      <div className="px-5 py-6 md:px-9 md:py-8">
        <ErrorStateCard
          message={message}
          onRetry={() => {
            void statsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-80px)] flex-col px-5 pb-0 pt-6 md:px-9 md:pt-8">
      <div className="flex items-start justify-between gap-4">
        <Link to="/home" className="inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-[#091022] shadow-[0_16px_36px_rgba(6,24,59,0.20)]">
            <img src="/primoria-logo.png" alt="Primoria" className="h-full w-full object-cover" />
          </div>
          <span className="text-[1.8rem] font-black uppercase tracking-[0.08em] text-[#28a4f4] md:text-[1.95rem]">
            Primoria
          </span>
        </Link>

        <div className="inline-flex items-center gap-2.5 rounded-[22px] border border-[#cfe0ff] bg-[#f3f8ff] px-4 py-2.5 text-[#3f62d7] shadow-[0_10px_26px_rgba(101,129,214,0.08)]">
          <Sparkles size={20} className="fill-current" />
          <span className="text-[1.05rem] font-black">{stats?.total_xp ?? 0}</span>
        </div>
      </div>

      <div className="relative mx-auto mt-9 flex w-[75%] flex-1 items-stretch md:mt-10">
        <div className="pointer-events-none absolute bottom-0 left-[-11.75rem] top-[1.25rem] z-20 hidden w-[22.5rem] md:block">
          <div className="pointer-events-auto h-full w-full">
            <Live2DHeroModel />
          </div>
        </div>

        <section className="relative flex w-full flex-1 flex-col overflow-hidden rounded-t-[42px] rounded-b-none border border-white/12 border-b-0 bg-[linear-gradient(125deg,#1d3074_0%,#2947b8_48%,#538cf4_100%)] px-7 pb-0 pt-8 text-white shadow-[0_28px_70px_rgba(37,79,182,0.20)] md:px-11 md:pt-9">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_34%,rgba(255,255,255,0.08)_100%)]" />
          <div className="absolute left-[-5rem] top-[-4rem] h-[13.5rem] w-[13.5rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.14),rgba(255,255,255,0)_72%)]" />
          <div className="absolute right-[2%] top-[4%] h-[18rem] w-[18rem] rounded-full border border-white/22 bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_54%,rgba(255,255,255,0)_76%)]" />
          <div className="absolute bottom-[-12rem] right-[-3rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),rgba(255,255,255,0)_72%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/25" />

          <div className="relative z-10 flex min-h-[calc(100svh-326px)] flex-col justify-between gap-7">
            <div className="grid gap-6 pt-2 lg:grid-cols-[minmax(0,1.08fr)_18.5rem] lg:items-center">
              <div className="max-w-[44rem] text-center md:text-left">
                <h2 className="text-[clamp(3.1rem,5vw,5.1rem)] font-black tracking-[-0.07em]">{'今天开始学习'}</h2>
                <p className="mt-5 max-w-[38rem] text-[1.02rem] leading-[1.82] text-white/82 md:text-[1.12rem]">
                  {'从一段短课程开始，把今天的学习节奏先重新拉起来。完成后再进入 AI 导师，把重点内容整理成更清晰的结构。'}
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                  <Link
                    to="/library"
                    className="inline-flex min-w-[14rem] items-center justify-center gap-3 rounded-[20px] bg-white px-7 py-4 text-[1.08rem] font-black text-[#2a57db] shadow-[0_18px_40px_rgba(18,29,63,0.16)]"
                  >
                    <Search size={21} />
                    {'浏览课程'}
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="rounded-[28px] border border-white/16 bg-white/10 p-5 text-white backdrop-blur-md">
                  <div className="text-[0.78rem] font-black uppercase tracking-[0.18em] text-white/70">{'今日节奏'}</div>
                  <div className="mt-4 flex items-end gap-3">
                    <div className="text-[3rem] font-black leading-none">{`${rhythmScore}%`}</div>
                    <div className="pb-1 text-sm font-semibold text-white/64">{'状态稳定'}</div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/74">
                    {'根据当前连击和累计进度估算，今天适合先完成一段短课程，再进入 AI 导师整理笔记。'}
                  </p>
                  <div className="mt-5 h-2 rounded-full bg-white/14">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#8de7ff_0%,#ffffff_100%)]"
                      style={{ width: `${rhythmScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 pb-7 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-md">
                <div className="flex items-center gap-3 text-white/76">
                  <BookOpenText size={18} />
                  <span className="text-[0.78rem] font-black uppercase tracking-[0.14em]">{'完成课程'}</span>
                </div>
                <div className="mt-4 text-[1.95rem] font-black leading-none">{stats?.courses_completed ?? 0}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{'学完的路径会沉淀到你的档案'}</div>
              </div>
              <div className="rounded-[22px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-md">
                <div className="flex items-center gap-3 text-white/76">
                  <Sparkles size={18} />
                  <span className="text-[0.78rem] font-black uppercase tracking-[0.14em]">{'总 XP'}</span>
                </div>
                <div className="mt-4 text-[1.95rem] font-black leading-none">{totalXp}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{'经验值会推动成就和热力图变化'}</div>
              </div>
              <div className="rounded-[22px] border border-white/14 bg-[#17316f]/45 px-4 py-4 text-white">
                <div className="flex items-center gap-3 text-white/76">
                  <Clock3 size={18} />
                  <span className="text-[0.78rem] font-black uppercase tracking-[0.14em]">{'学习时长'}</span>
                </div>
                <div className="mt-4 text-[1.95rem] font-black leading-none">{`${stats?.total_study_minutes ?? 0}m`}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{'累计专注投入会持续增长'}</div>
              </div>
              <div className="rounded-[22px] border border-white/14 bg-[#17316f]/45 px-4 py-4 text-white">
                <div className="flex items-center gap-3 text-white/76">
                  <Trophy size={18} />
                  <span className="text-[0.78rem] font-black uppercase tracking-[0.14em]">{'最高连击'}</span>
                </div>
                <div className="mt-4 text-[1.95rem] font-black leading-none">{stats?.longest_streak ?? 0}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{'历史最佳节奏会留在这里'}</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

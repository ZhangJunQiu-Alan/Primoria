"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { GamificationProfile } from "@/lib/gamification/store";
import type { AchievementCategory, AchievementCode } from "@/lib/gamification/catalog";
import { formatMessage, type I18nDictionary, type UiLanguage } from "@/lib/i18n/dictionaries";

type Filter = "all" | AchievementCategory;
type GameCopy = I18nDictionary["profile"]["game"];

const FILTERS: Filter[] = ["all", "exploration", "mastery", "consistency", "recovery"];

function BadgeGlyph({ code }: { code: AchievementCode }) {
  const mastery = ["first_mastery", "ten_masteries", "perfect_trial", "cross_concept"].includes(code);
  const consistency = code === "streak_3" || code === "streak_7";
  const recovery = code === "remediation_complete" || code === "comeback";
  return (
    <svg viewBox="0 0 48 56" aria-hidden="true">
      <path className="guild-badge-shield" d="M24 2 43 10v15c0 13-7.8 23.1-19 29C12.8 48.1 5 38 5 25V10L24 2Z" />
      {mastery ? <path d="m15 31 9-17 9 17-9-4-9 4Zm9-11v7" /> : null}
      {consistency ? <path d="M24 39c-6 0-10-4-10-9 0-4 2-7 6-10 0 4 2 6 4 7-1-6 2-10 6-13 0 6 5 8 5 15 0 6-5 10-11 10Z" /> : null}
      {recovery ? <path d="M14 28h20M24 18v20m-8-17 8-6 8 6" /> : null}
      {!mastery && !consistency && !recovery ? <path d="m14 28 7 7 14-17M14 18h8" /> : null}
    </svg>
  );
}

function questRoleLabel(role: "new" | "review" | "remediation", copy: GameCopy) {
  if (role === "review") return copy.reviewQuest;
  if (role === "remediation") return copy.sideQuest;
  return copy.mainQuest;
}

function questStatusLabel(status: "planned" | "generating" | "generated", completed: boolean, copy: GameCopy) {
  if (completed) return copy.completed;
  if (status === "generated") return copy.generated;
  if (status === "generating") return copy.generating;
  return copy.planned;
}

export function GamificationHub({
  profile,
  language,
  copy,
}: {
  profile: GamificationProfile;
  language: UiLanguage;
  copy: GameCopy;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const filteredAchievements = filter === "all"
    ? profile.achievements
    : profile.achievements.filter((achievement) => achievement.category === filter);
  const earnedCount = profile.achievements.filter((achievement) => achievement.unlockedAt !== null).length;
  const earnedPercent = profile.achievements.length ? (earnedCount / profile.achievements.length) * 100 : 0;
  const achievementMap = new Map(profile.achievements.map((achievement) => [achievement.code, achievement]));

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimeZone || browserTimeZone === profile.timeZone) return;
    void fetch("/api/settings/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timeZone: browserTimeZone }),
    }).then((response) => {
      if (response.ok) router.refresh();
    }).catch(() => undefined);
  }, [profile.timeZone, router]);

  return (
    <>
      <section className="guild-section guild-questline-section" aria-labelledby="guild-atlas-title">
        <header className="guild-section-header">
          <div>
            <span className="guild-kicker">Questline</span>
            <h2 id="guild-atlas-title">{copy.questAtlas}</h2>
            <p>{copy.questAtlasCopy}</p>
          </div>
          {profile.questline ? (
            <span className="guild-section-count">{profile.questline.completed}/{profile.questline.total}</span>
          ) : null}
        </header>
        {profile.questline ? (
          <div className="guild-quest-map">
            <div className="guild-quest-map-title">
              <span>{profile.questline.title}</span>
              <strong>{Math.round((profile.questline.completed / Math.max(profile.questline.total, 1)) * 100)}%</strong>
            </div>
            <div className="guild-quest-path">
              {profile.questline.lessons.map((lesson, index) => {
                const completed = lesson.progress === "completed";
                const current = !completed && profile.questline?.lessons.slice(0, index).every((entry) => entry.progress === "completed");
                const content = (
                  <>
                    <span className="guild-quest-node-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="guild-quest-node-copy">
                      <em>{questRoleLabel(lesson.role, copy)}</em>
                      <strong>{lesson.title}</strong>
                    </span>
                    <span className="guild-quest-node-status">
                      {current ? `${copy.current} · ` : ""}{questStatusLabel(lesson.status, completed, copy)}
                    </span>
                  </>
                );
                const className = `guild-quest-node role-${lesson.role} ${completed ? "is-complete" : ""} ${current ? "is-current" : ""}`;
                return lesson.status === "generated" ? (
                  <Link key={lesson.id} href={`/course/${profile.questline!.courseId}?lessonId=${encodeURIComponent(lesson.id)}`} className={className} aria-label={`${copy.openQuest}: ${lesson.title}`}>
                    {content}
                  </Link>
                ) : (
                  <div key={lesson.id} className={className}>{content}</div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="guild-empty-state">{copy.noQuestline}</div>
        )}
      </section>

      <section className="guild-section" aria-labelledby="daily-contracts-title">
        <header className="guild-section-header">
          <div>
            <span className="guild-kicker">Daily board</span>
            <h2 id="daily-contracts-title">{copy.dailyContracts}</h2>
            <p>{copy.dailyCopy}</p>
          </div>
          <span className="guild-streak-record">{formatMessage(copy.longestStreak, { days: profile.player.longestStreak })}</span>
        </header>
        <div className="guild-daily-grid">
          {profile.quests.map((quest, index) => (
            <article key={quest.code} className={`guild-contract ${quest.completed ? "is-complete" : ""}`}>
              <span className="guild-contract-number">Contract {String(index + 1).padStart(2, "0")}</span>
              <h3>{quest.name}</h3>
              <p>{quest.description}</p>
              <div className="guild-contract-progress" aria-label={`${quest.progress}/${quest.target}`}>
                <span style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }} />
              </div>
              <footer>
                <strong>{quest.progress}/{quest.target}</strong>
                <span>{copy.reward} +{quest.xpReward} XP</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="guild-section guild-achievements-section" aria-labelledby="guild-achievements-title">
        <header className="guild-section-header guild-achievement-header">
          <div>
            <span className="guild-kicker">Insignia vault</span>
            <h2 id="guild-achievements-title">{copy.achievements}</h2>
            <p>{copy.achievementsCopy}</p>
          </div>
          <strong>{formatMessage(copy.earnedProgress, { earned: earnedCount, total: profile.achievements.length })}</strong>
        </header>
        <div className="guild-achievement-progress">
          <span style={{ width: `${earnedPercent}%` }} />
        </div>
        <p className="guild-achievement-remaining">{formatMessage(copy.remaining, { count: profile.achievements.length - earnedCount })}</p>
        <div className="guild-achievement-filters" role="group" aria-label={copy.achievements}>
          {FILTERS.map((category) => (
            <button key={category} type="button" className={filter === category ? "is-active" : ""} onClick={() => setFilter(category)}>
              {copy[category]}
            </button>
          ))}
        </div>
        <div className="guild-badge-grid">
          {filteredAchievements.map((achievement) => {
            const earned = achievement.unlockedAt !== null;
            return (
              <article key={achievement.code} className={`guild-badge-card rarity-${achievement.rarity} ${earned ? "is-earned" : "is-locked"}`}>
                <div className="guild-badge-icon"><BadgeGlyph code={achievement.code} /></div>
                <span className="guild-badge-rarity">{achievement.rarity}</span>
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
                {achievement.xpReward > 0 ? <span className="guild-badge-xp">+{achievement.xpReward} XP</span> : null}
                <footer>
                  {earned
                    ? `${copy.earned} ${new Intl.DateTimeFormat(language).format(new Date(achievement.unlockedAt!))}`
                    : `◇ ${copy.locked}`}
                </footer>
              </article>
            );
          })}
        </div>

        <div className="guild-recent">
          <h3>{copy.recentlyEarned}</h3>
          {profile.recentAchievements.length ? (
            <div className="guild-recent-list">
              {profile.recentAchievements.map((code) => {
                const achievement = achievementMap.get(code)!;
                return (
                  <div key={code} className="guild-recent-row">
                    <span className="guild-recent-icon"><BadgeGlyph code={code} /></span>
                    <span><strong>{achievement.name}</strong><em>{achievement.description}</em></span>
                    <time>{new Intl.DateTimeFormat(language).format(new Date(achievement.unlockedAt!))}</time>
                  </div>
                );
              })}
            </div>
          ) : <p className="guild-recent-empty">{copy.noRecent}</p>}
        </div>
      </section>
    </>
  );
}

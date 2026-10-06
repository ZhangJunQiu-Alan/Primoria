import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { CalendarIcon, ChartIcon, ChevronRightIcon } from "@/components/profile/profile-icons";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/format";
import { getGamificationProfile } from "@/lib/gamification/store";
import { GamificationHub } from "@/components/profile/gamification-hub";

export const dynamic = "force-dynamic";

const GUILD_STARS: Array<[number, number]> = [[10, 100], [102, 70], [193, 60], [283, 32], [363, 66], [452, 52], [550, 22]];

export default async function ProfilePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/profile");

  const dictionaryPromise = getDictionaryForUser(user?.id ?? null);
  const { language, dictionary } = await dictionaryPromise;
  const [stats, gamification] = await Promise.all([
    getProfileStats({
      ownerId: user?.id ?? null,
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
      locale: language,
    }),
    getGamificationProfile(user?.id ?? null, language),
  ]);
  const t = dictionary.profile;
  const nextLevelRemaining = gamification.player.nextLevelXp === null
    ? null
    : Math.max(0, gamification.player.nextLevelXp - gamification.player.totalXp);

  return (
    <main className="app-shell profile-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <section className="profile-workspace">
        <section className="profile-guild-hero" aria-label={t.progressSummary}>
          <div className="profile-guild-identity">
            <div className="profile-guild-crest" aria-hidden="true"><span>{stats.initial}</span></div>
            <div className="profile-identity-copy">
              <span className="profile-eyebrow">{t.game.guildRecord}</span>
              <h1>{stats.displayName}</h1>
              <p>{stats.email ?? t.fallbackRecord}</p>
            </div>
            <div className="profile-guild-action">
              <ProfileEditModal initialDisplayName={stats.displayName} />
            </div>
          </div>
          <div className="profile-guild-atlas">
            <div className="profile-guild-atlas-heading">
              <div>
                <span>{t.game.level}</span>
                <strong>{gamification.player.levelName}</strong>
              </div>
              <em>{gamification.player.totalXp.toLocaleString(language)} XP</em>
            </div>
            <div className="profile-guild-constellation" aria-hidden="true">
              <svg viewBox="0 0 560 120" preserveAspectRatio="none">
                <path className="profile-guild-star-path" d="M10 100C76 30 122 108 193 60S308 18 363 66s105 18 187-44" />
                {GUILD_STARS.map(([cx, cy], index) => (
                  <circle key={cx} cx={cx} cy={cy} r={index / (GUILD_STARS.length - 1) <= gamification.player.levelProgress ? 5 : 4} className={index / (GUILD_STARS.length - 1) <= gamification.player.levelProgress ? "lit" : ""} />
                ))}
              </svg>
            </div>
            <div className="profile-guild-xp-track"><span style={{ width: `${gamification.player.levelProgress * 100}%` }} /></div>
            <p className="profile-guild-next">{nextLevelRemaining === null
              ? t.game.maxLevel
              : formatMessage(t.game.xpToNext, { xp: nextLevelRemaining.toLocaleString(language), level: gamification.player.nextLevelName ?? "" })}</p>
          </div>
          <dl className="profile-metric-strip profile-guild-metrics">
            <div><dt>{t.dayStreak}</dt><dd>{gamification.player.currentStreak}</dd></div>
            <div><dt>{t.lessonsDone}</dt><dd>{stats.lessonsCompleted}</dd></div>
            <div><dt>{t.questions}</dt><dd>{stats.questionsPracticed}</dd></div>
            <div><dt>{t.totalXp}</dt><dd>{stats.xp.toLocaleString(language)}</dd></div>
          </dl>
        </section>

        <GamificationHub profile={gamification} language={language} copy={t.game} />

        <section className="profile-section">
          <header className="profile-section-header">
            <h2>{t.myProgress}</h2>
            <p>{t.progressCopy}</p>
          </header>
          <div className="profile-list-card">
            <Link href="/weekly-report" className="profile-list-row">
              <span className="profile-list-icon"><CalendarIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.weeklyReport}</strong>
                <em>{formatMessage(t.activeDays, { days: stats.activeDaysThisWeek, events: stats.weeklyActivityEvents })}</em>
              </span>
              <ChevronRightIcon className="profile-list-arrow" />
            </Link>
            <Link href="/stats" className="profile-list-row">
              <span className="profile-list-icon"><ChartIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.learningStats}</strong>
                <em>{formatMessage(t.statsSummary, { lessons: stats.lessonsCompleted, questions: stats.questionsPracticed, courses: stats.courseCount })}</em>
              </span>
              <ChevronRightIcon className="profile-list-arrow" />
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

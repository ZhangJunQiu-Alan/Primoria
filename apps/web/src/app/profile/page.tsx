import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorNavRail } from "@/components/tutor/nav-rail";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { BoltIcon, BookIcon, CalendarIcon, ChartIcon, FlameIcon, StarIcon } from "@/components/profile/profile-icons";
import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { getProfileStats } from "@/lib/profile/stats";
import { getDictionaryForUser } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/dictionaries";
import { getGamificationProfile } from "@/lib/gamification/store";
import { GamificationHub } from "@/components/profile/gamification-hub";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();
  if (authEnabled && !user) redirect("/auth/sign-in?next=/profile");

  const dictionaryPromise = getDictionaryForUser(user?.id ?? null);
  const statsPromise = getProfileStats({
    ownerId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
  });
  const { language, dictionary } = await dictionaryPromise;
  const [stats, gamification] = await Promise.all([
    statsPromise,
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
        <div className="profile-guild-hero">
          <div className="profile-guild-identity">
            <div className="profile-guild-crest" aria-hidden="true"><span>{stats.initial}</span></div>
            <div className="profile-identity-copy">
              <span className="guild-kicker">{t.game.guildRecord}</span>
              <h1>{stats.displayName}</h1>
              <p>{stats.email ?? t.fallbackRecord}</p>
              <div className="profile-guild-rank">
                <span>{t.game.level}</span>
                <strong>{gamification.player.levelName}</strong>
              </div>
            </div>
          </div>
          <div className="profile-guild-action">
            <ProfileEditModal initialDisplayName={stats.displayName} />
          </div>
          <div className="profile-guild-atlas" aria-label={t.progressSummary}>
            <div className="profile-guild-atlas-heading">
              <span>{gamification.player.levelName}</span>
              <strong>{gamification.player.totalXp.toLocaleString(language)} XP</strong>
            </div>
            <div className="profile-guild-constellation" aria-hidden="true">
              <svg viewBox="0 0 560 150">
                <path className="profile-guild-star-path" d="M18 121C84 34 130 132 201 72S316 26 371 83s105 22 171-55" />
                <circle cx="18" cy="121" r="5" /><circle cx="110" cy="83" r="7" /><circle cx="201" cy="72" r="5" />
                <circle cx="291" cy="43" r="8" /><circle cx="371" cy="83" r="5" /><circle cx="452" cy="68" r="7" /><circle cx="542" cy="28" r="6" />
              </svg>
            </div>
            <div className="profile-guild-xp-track"><span style={{ width: `${gamification.player.levelProgress * 100}%` }} /></div>
            <p>{nextLevelRemaining === null
              ? t.game.maxLevel
              : formatMessage(t.game.xpToNext, { xp: nextLevelRemaining.toLocaleString(language), level: gamification.player.nextLevelName ?? "" })}</p>
            <div className="profile-guild-metrics">
              <span><FlameIcon /><strong>{gamification.player.currentStreak}</strong><em>{t.dayStreak}</em></span>
              <span><BookIcon /><strong>{stats.lessonsCompleted}</strong><em>{t.lessonsDone}</em></span>
              <span><BoltIcon /><strong>{stats.questionsPracticed}</strong><em>{t.questions}</em></span>
              <span><StarIcon /><strong>{stats.xp}</strong><em>{t.totalXp}</em></span>
            </div>
          </div>
        </div>

        <GamificationHub profile={gamification} language={language} copy={t.game} />

        <section className="profile-section">
          <div className="profile-section-header">
            <div>
              <span className="profile-eyebrow">{t.progress}</span>
              <h2>{t.myProgress}</h2>
              <p>{t.progressCopy}</p>
            </div>
          </div>
          <div className="profile-list-card">
            <Link href="/weekly-report" className="profile-list-row">
              <span className="profile-list-icon"><CalendarIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.weeklyReport}</strong>
                <em>{formatMessage(t.activeDays, { days: stats.activeDaysThisWeek, events: stats.weeklyActivityEvents })}</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
            <Link href="/stats" className="profile-list-row">
              <span className="profile-list-icon"><ChartIcon /></span>
              <span className="profile-list-copy">
                <strong>{t.learningStats}</strong>
                <em>{formatMessage(t.statsSummary, { lessons: stats.lessonsCompleted, questions: stats.questionsPracticed, courses: stats.courseCount })}</em>
              </span>
              <span className="profile-list-arrow" aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

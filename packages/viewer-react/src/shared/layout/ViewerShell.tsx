import { BookOpen, Home, PanelsTopLeft, Sparkles, UserRound, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { useViewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

export function ViewerShell() {
  const copy = useViewerCopy();
  const routeNavItems = [
    { to: '/home', label: copy.nav.home, icon: Home },
    { to: '/library', label: copy.nav.library, icon: BookOpen },
    { to: '/ai-tutor', label: copy.nav.aiTutor, icon: Sparkles },
    { to: '/builder/dashboard', label: copy.nav.builder, icon: PanelsTopLeft },
    { to: '/community', label: copy.nav.community, icon: Users },
    { to: '/profile', label: copy.nav.profile, icon: UserRound },
  ] as const;

  return (
    <main className="relative h-[100svh] overflow-hidden bg-[var(--viewer-page)] text-[var(--viewer-text)]">
      <div className="mx-auto flex h-full max-w-[2048px] flex-col overflow-hidden bg-transparent">
        <div className="pointer-events-none absolute right-4 top-4 z-30">
          <LanguageSwitcher className="pointer-events-auto" />
        </div>
        <div className="viewer-dock-shell__content min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>

        <nav className="viewer-dock-shell" aria-label="Learner navigation">
          <div className="viewer-dock">
            {routeNavItems.map((item) => (
              <div key={item.to} className="viewer-dock__slot">
                <NavLink
                  to={item.to}
                  onMouseEnter={() => {
                    if (item.to === '/builder/dashboard') {
                      void import('@/pages/dashboard/DashboardPage');
                    }
                  }}
                  onFocus={() => {
                    if (item.to === '/builder/dashboard') {
                      void import('@/pages/dashboard/DashboardPage');
                    }
                  }}
                  className={({ isActive }) =>
                    cn('viewer-dock__item', isActive && 'viewer-dock__item--active')
                  }
                >
                  {({ isActive }) => (
                    <span className="viewer-dock__item-inner">
                      <span className={cn('viewer-dock__icon', isActive && 'viewer-dock__icon--active')}>
                        <item.icon size={18} className={isActive ? 'text-[#5c7d60]' : 'text-current'} />
                      </span>
                      <span className="viewer-dock__label">{item.label}</span>
                    </span>
                  )}
                </NavLink>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

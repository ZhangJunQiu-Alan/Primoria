import { BookOpen, Home, PanelsTopLeft, Sparkles, UserRound, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { viewerCopy } from '@/shared/theme/copy';
import { cn } from '@/shared/utils/cn';

const routeNavItems = [
  { to: '/home', label: viewerCopy.nav.home, icon: Home },
  { to: '/library', label: viewerCopy.nav.library, icon: BookOpen },
  { to: '/ai-tutor', label: viewerCopy.nav.aiTutor, icon: Sparkles },
  { to: '/builder/dashboard', label: viewerCopy.nav.builder, icon: PanelsTopLeft },
  { to: '/community', label: viewerCopy.nav.community, icon: Users },
  { to: '/profile', label: viewerCopy.nav.profile, icon: UserRound },
] as const;

export function ViewerShell() {
  return (
    <main className="relative h-[100svh] overflow-hidden bg-[var(--viewer-page)] text-[var(--viewer-text)]">
      <div className="mx-auto flex h-full max-w-[2048px] flex-col overflow-hidden bg-transparent">
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

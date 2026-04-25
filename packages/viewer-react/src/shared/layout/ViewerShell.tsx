import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Home, PanelsTopLeft, Sparkles, UserRound, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { prefetchViewerNavigationTarget } from '@/shared/api/viewer/prefetch';
import { useAppSelector } from '@/shared/state/store';
import { useCoreCopy } from '@/shared/theme/coreCopy';
import { cn } from '@/shared/utils/cn';

export function ViewerShell() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const copy = useCoreCopy();
  const hideDock = /^\/lesson\/[^/]+(?:\/result)?$/.test(location.pathname);
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
        <div className={cn('min-h-0 flex-1 overflow-auto', !hideDock && 'viewer-dock-shell__content')}>
          <Outlet />
        </div>

        {hideDock ? null : (
        <nav className="viewer-dock-shell" aria-label={copy.common.learnerNavigation} data-testid="viewer-bottom-dock">
          <div className="viewer-dock">
            {routeNavItems.map((item) => (
              <div key={item.to} className="viewer-dock__slot">
                <NavLink
                  to={item.to}
                  onMouseEnter={() => {
                    prefetchViewerNavigationTarget(queryClient, item.to, user?.id);
                  }}
                  onFocus={() => {
                    prefetchViewerNavigationTarget(queryClient, item.to, user?.id);
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
        )}
      </div>
    </main>
  );
}

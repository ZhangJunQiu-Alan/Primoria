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
    <main className="h-[100svh] overflow-hidden bg-[#f4f8ff]">
      <div className="mx-auto flex h-full max-w-[2048px] flex-col overflow-hidden bg-[linear-gradient(180deg,#f9fbff_0%,#f6f9ff_100%)]">
        <div className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>

        <nav className="shrink-0 border-t border-[#e6edf7] bg-white/92 px-3 py-1.5 backdrop-blur-2xl md:px-6 md:py-2">
          <div className="mx-auto grid max-w-[1280px] grid-cols-6 gap-0.5 md:gap-2">
            {routeNavItems.map((item) => (
              <NavLink
                key={item.to}
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
                  cn(
                    'flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-center text-[11px] font-black transition md:gap-1.5 md:px-2 md:py-2 md:text-[0.86rem]',
                    isActive
                      ? 'text-[#554cf5]'
                      : 'text-[#b0b3bb] hover:text-[#7282a8]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className={isActive ? 'text-[#554cf5]' : 'text-current'} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

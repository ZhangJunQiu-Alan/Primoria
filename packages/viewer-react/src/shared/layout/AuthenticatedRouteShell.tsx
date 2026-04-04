import { Outlet } from 'react-router-dom';
import { useAppSelector } from '@/shared/state/store';
import { isParentRole } from '@/shared/utils/routes';
import { ViewerShell } from '@/shared/layout/ViewerShell';

export function AuthenticatedRouteShell() {
  const role = useAppSelector((state) => state.auth.role);

  if (!isParentRole(role)) {
    return <ViewerShell />;
  }

  return (
    <main className="h-[100svh] overflow-hidden bg-[#f4f8ff]">
      <div className="mx-auto flex h-full max-w-[2048px] flex-col overflow-hidden bg-[linear-gradient(180deg,#f9fbff_0%,#f6f9ff_100%)]">
        <div className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

import { Outlet } from 'react-router-dom';

export function BuilderWorkspaceShell() {
  return (
    <main className="min-h-[100svh] bg-[#eef4ff]">
      <Outlet />
    </main>
  );
}

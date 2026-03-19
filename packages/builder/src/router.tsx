import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { EditorPage } from '@/pages/editor/EditorPage';
import { LandingPage } from '@/pages/LandingPage';

/** Redirect to /login if the user is not authenticated. */
function RequireAuth() {
  const { user, loading } = useAppSelector((s) => s.auth);
  if (loading) return <div className="flex h-screen items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Redirect to /dashboard if the user is already authenticated. */
function RedirectIfAuth() {
  const { user, loading } = useAppSelector((s) => s.auth);
  if (loading) return <div className="flex h-screen items-center justify-center">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    element: <RedirectIfAuth />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/editor/:courseId', element: <EditorPage /> },
      { path: '/editor', element: <EditorPage /> },
    ],
  },
]);

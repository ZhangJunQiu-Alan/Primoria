import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoadingScreen } from '@/shared/layout/FullScreenLoadingScreen';
import { buildLoginPath, readReturnTo } from '@/shared/utils/authRedirect';
import { learnerHomeForRole, isParentRole } from '@/shared/utils/routes';
import { useAppSelector } from '@/shared/state/store';

function LoadingScreen() {
  return <FullScreenLoadingScreen />;
}

export function RootEntry() {
  const { loading, user, role } = useAppSelector((state) => state.auth);
  if (loading) {
    return <LoadingScreen />;
  }
  if (user) {
    return <Navigate to={learnerHomeForRole(role)} replace />;
  }
  return <Navigate to="/" replace />;
}

export function RedirectIfAuth() {
  const location = useLocation();
  const { loading, user, role } = useAppSelector((state) => state.auth);
  if (loading) {
    return <LoadingScreen />;
  }
  if (user) {
    return <Navigate to={readReturnTo(location.search, learnerHomeForRole(role))} replace />;
  }
  return <Outlet />;
}

export function RequireAuth() {
  const location = useLocation();
  const { loading, user } = useAppSelector((state) => state.auth);
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  return <Outlet />;
}

export function RequireLearnerAuth() {
  const location = useLocation();
  const { loading, user, role } = useAppSelector((state) => state.auth);
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  if (isParentRole(role)) {
    return <Navigate to="/parent" replace />;
  }
  return <Outlet />;
}

export function RequireParentAuth() {
  const location = useLocation();
  const { loading, user, role } = useAppSelector((state) => state.auth);
  if (loading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  if (!isParentRole(role)) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}

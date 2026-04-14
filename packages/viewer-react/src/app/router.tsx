import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
  Outlet,
  useLocation,
  useParams,
  useRoutes,
} from 'react-router-dom';
import { RedirectIfAuth, RequireAuth, RequireLearnerAuth, RequireParentAuth } from '@/features/auth/routeGuards';
import { FeatureDisabledState } from '@/shared/layout/AsyncState';
import { PageContainer } from '@/shared/layout/PageContainer';
import { RouteErrorBoundary } from '@/shared/layout/RouteErrorBoundary';
import { AuthenticatedRouteShell } from '@/shared/layout/AuthenticatedRouteShell';
import { BuilderWorkspaceShell } from '@/shared/layout/BuilderWorkspaceShell';
import { trackBootSplashRoute } from '@/shared/boot/bootSplash';
import { FullScreenLoadingScreen } from '@/shared/layout/FullScreenLoadingScreen';
import { ViewerShell } from '@/shared/layout/ViewerShell';
import { trackViewerRoute } from '@/shared/platform/observability';
import { useFeatureFlag } from '@/shared/platform/FeatureFlagsProvider';
import { learnerHomeForRole } from '@/shared/utils/routes';
import { useAppSelector } from '@/shared/state/store';
import { useViewerCopy } from '@/shared/theme/copy';

const LandingPage = lazy(async () => ({
  default: (await import('@/features/public/LandingPage')).LandingPage,
}));
const LoginPage = lazy(async () => ({
  default: (await import('@/features/public/LoginPage')).LoginPage,
}));
const RegisterPage = lazy(async () => ({
  default: (await import('@/features/public/RegisterPage')).RegisterPage,
}));
const AuthCallbackPage = lazy(async () => ({
  default: (await import('@/features/public/AuthCallbackPage')).AuthCallbackPage,
}));
const HomePage = lazy(async () => ({
  default: (await import('@/features/home/HomePage')).HomePage,
}));
const LibraryPage = lazy(async () => ({
  default: (await import('@/features/library/LibraryPage')).LibraryPage,
}));
const CommunityPage = lazy(async () => ({
  default: (await import('@/features/community/CommunityPage')).CommunityPage,
}));
const AiTutorPage = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorPage')).AiTutorPage,
}));
const AiTutorMindMapPage = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorMindMapPage')).AiTutorMindMapPage,
}));
const AiTutorMindMapEditorPage = lazy(async () => ({
  default: (await import('@/features/ai-tutor/AiTutorMindMapEditorPage')).AiTutorMindMapEditorPage,
}));
const ProfilePage = lazy(async () => ({
  default: (await import('@/features/profile/ProfilePage')).ProfilePage,
}));
const CoursePage = lazy(async () => ({
  default: (await import('@/features/course/CoursePage')).CoursePage,
}));
const LessonPage = lazy(async () => ({
  default: (await import('@/features/lesson/LessonPage')).LessonPage,
}));
const LessonResultPage = lazy(async () => ({
  default: (await import('@/features/lesson/LessonResultPage')).LessonResultPage,
}));
const AchievementWallPage = lazy(async () => ({
  default: (await import('@/features/profile/AchievementWallPage')).AchievementWallPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('@/features/profile/SettingsPage')).SettingsPage,
}));
const SupportInfoPage = lazy(async () => ({
  default: (await import('@/features/support/SupportInfoPage')).SupportInfoPage,
}));
const ParentDashboardPage = lazy(async () => ({
  default: (await import('@/features/parent/ParentDashboardPage')).ParentDashboardPage,
}));
const BuilderDashboardPage = lazy(async () => ({
  default: (await import('@/pages/dashboard/DashboardPage')).DashboardPage,
}));
const BuilderEditorPage = lazy(async () => ({
  default: (await import('@/pages/editor/EditorPage')).EditorPage,
}));

function RouteLoadingScreen() {
  return <FullScreenLoadingScreen />;
}

function WithSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoadingScreen />}>{children}</Suspense>;
}

function TelemetryRouteShell() {
  const location = useLocation();

  useEffect(() => {
    trackViewerRoute(location.pathname);
    trackBootSplashRoute(location.pathname);
  }, [location.pathname]);

  return <Outlet />;
}

function FlaggedRoute({
  flag,
  scope,
  children,
}: {
  flag: 'viewer_ai_tutor_enabled' | 'viewer_community_enabled';
  scope: 'community' | 'aiTutor';
  children: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  const copy = useViewerCopy();

  if (!enabled) {
    const title = scope === 'community' ? copy.community.title : copy.aiTutor.title;
    const message = scope === 'community' ? copy.community.disabled : copy.aiTutor.disabled;
    return (
      <PageContainer title={title} subtitle={message}>
        <FeatureDisabledState title={title} message={message} />
      </PageContainer>
    );
  }

  return <>{children}</>;
}

function RootLanding() {
  const { loading, user, role } = useAppSelector((state) => state.auth);
  if (loading) {
    return <FullScreenLoadingScreen />;
  }
  if (user) {
    return <Navigate to={learnerHomeForRole(role)} replace />;
  }
  return (
    <WithSuspense>
      <LandingPage />
    </WithSuspense>
  );
}

function LegacyBuilderRedirect({ basePath }: { basePath: '/builder/dashboard' | '/builder/editor' }) {
  const location = useLocation();
  const params = useParams<{ courseId?: string }>();
  const nextPath =
    basePath === '/builder/editor' && params.courseId
      ? `/builder/editor/${params.courseId}`
      : basePath;

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
}

export function buildViewerRoutes(): RouteObject[] {
  return [
    {
      element: <TelemetryRouteShell />,
      errorElement: <RouteErrorBoundary scope="application" />,
      children: [
        {
          path: '/',
          element: <RootLanding />,
        },
        {
          path: '/auth/callback',
          element: (
            <WithSuspense>
              <AuthCallbackPage />
            </WithSuspense>
          ),
        },
        {
          element: <RedirectIfAuth />,
          children: [
            {
              path: '/login',
              element: (
                <WithSuspense>
                  <LoginPage />
                </WithSuspense>
              ),
            },
            {
              path: '/register',
              element: (
                <WithSuspense>
                  <RegisterPage />
                </WithSuspense>
              ),
            },
          ],
        },
        {
          element: <RequireLearnerAuth />,
          errorElement: <RouteErrorBoundary scope="learner shell" />,
          children: [
            {
              element: <ViewerShell />,
              children: [
                {
                  path: '/home',
                  element: (
                    <WithSuspense>
                      <HomePage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/library',
                  element: (
                    <WithSuspense>
                      <LibraryPage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/community',
                  element: (
                    <FlaggedRoute
                      flag="viewer_community_enabled"
                      scope="community"
                    >
                      <WithSuspense>
                        <CommunityPage />
                      </WithSuspense>
                    </FlaggedRoute>
                  ),
                },
                {
                  path: '/ai-tutor/mindmap',
                  element: (
                    <FlaggedRoute
                      flag="viewer_ai_tutor_enabled"
                      scope="aiTutor"
                    >
                      <WithSuspense>
                        <AiTutorMindMapPage />
                      </WithSuspense>
                    </FlaggedRoute>
                  ),
                },
                {
                  path: '/ai-tutor/mindmap/:mindMapId',
                  element: (
                    <FlaggedRoute
                      flag="viewer_ai_tutor_enabled"
                      scope="aiTutor"
                    >
                      <WithSuspense>
                        <AiTutorMindMapEditorPage />
                      </WithSuspense>
                    </FlaggedRoute>
                  ),
                },
                {
                  path: '/ai-tutor',
                  element: (
                    <FlaggedRoute
                      flag="viewer_ai_tutor_enabled"
                      scope="aiTutor"
                    >
                      <WithSuspense>
                        <AiTutorPage />
                      </WithSuspense>
                    </FlaggedRoute>
                  ),
                },
                {
                  path: '/profile',
                  element: (
                    <WithSuspense>
                      <ProfilePage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/course/:courseId',
                  element: (
                    <WithSuspense>
                      <CoursePage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/lesson/:lessonId',
                  element: (
                    <WithSuspense>
                      <LessonPage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/lesson/:lessonId/result',
                  element: (
                    <WithSuspense>
                      <LessonResultPage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/achievements',
                  element: (
                    <WithSuspense>
                      <AchievementWallPage />
                    </WithSuspense>
                  ),
                },
              ],
            },
          ],
        },
        {
          element: <RequireAuth />,
          errorElement: <RouteErrorBoundary scope="builder dashboard shell" />,
          children: [
            {
              element: <ViewerShell />,
              children: [
                {
                  path: '/builder/dashboard',
                  element: (
                    <WithSuspense>
                      <BuilderDashboardPage />
                    </WithSuspense>
                  ),
                },
              ],
            },
          ],
        },
        {
          element: <RequireAuth />,
          errorElement: <RouteErrorBoundary scope="authenticated viewer routes" />,
          children: [
            {
              element: <AuthenticatedRouteShell />,
              children: [
                {
                  path: '/settings',
                  element: (
                    <WithSuspense>
                      <SettingsPage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/support/help',
                  element: (
                    <WithSuspense>
                      <SupportInfoPage page="help" />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/support/feedback',
                  element: (
                    <WithSuspense>
                      <SupportInfoPage page="feedback" />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/support/privacy',
                  element: (
                    <WithSuspense>
                      <SupportInfoPage page="privacy" />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/support/terms',
                  element: (
                    <WithSuspense>
                      <SupportInfoPage page="terms" />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/dashboard',
                  element: <LegacyBuilderRedirect basePath="/builder/dashboard" />,
                },
                {
                  path: '/editor',
                  element: <LegacyBuilderRedirect basePath="/builder/editor" />,
                },
                {
                  path: '/editor/:courseId',
                  element: <LegacyBuilderRedirect basePath="/builder/editor" />,
                },
              ],
            },
            {
              element: <BuilderWorkspaceShell />,
              children: [
                {
                  path: '/builder/editor',
                  element: (
                    <WithSuspense>
                      <BuilderEditorPage />
                    </WithSuspense>
                  ),
                },
                {
                  path: '/builder/editor/:courseId',
                  element: (
                    <WithSuspense>
                      <BuilderEditorPage />
                    </WithSuspense>
                  ),
                },
              ],
            },
          ],
        },
        {
          element: <RequireParentAuth />,
          errorElement: <RouteErrorBoundary scope="parent dashboard" />,
          children: [
            {
              path: '/parent',
              element: (
                <WithSuspense>
                  <ParentDashboardPage />
                </WithSuspense>
              ),
            },
          ],
        },
      ],
    },
  ];
}

function getRouterBasename() {
  const baseUrl = import.meta.env.BASE_URL?.trim() || '/';
  if (!baseUrl || baseUrl === '/') {
    return undefined;
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const router = createBrowserRouter(buildViewerRoutes(), {
  basename: getRouterBasename(),
});

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export function ViewerRoutes() {
  return useRoutes(buildViewerRoutes());
}

export function createTestRouter(initialEntries: string[]) {
  return createMemoryRouter(buildViewerRoutes(), { initialEntries });
}

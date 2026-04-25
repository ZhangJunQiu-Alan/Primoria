import { BarChart3, House, LibraryBig, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useViewerCopy } from '@/shared/theme/copy';
import { publicAssetPath } from '@/shared/utils/publicAsset';
import { useAppSelector } from '@/store';
import { getErrorMessage, parseDashboardTab } from '@/pages/dashboard/dashboardLib';
import {
  AICourseDraftDialog,
  ConfirmDialog,
  CourseFormDialog,
} from '@/pages/dashboard/components/DashboardDialogs';
import {
  DashboardAnalyticsTab,
  DashboardCoursesTab,
  DashboardHomeTab,
} from '@/pages/dashboard/components/DashboardTabs';
import { useDashboardPageModel } from '@/pages/dashboard/hooks/useDashboardPageModel';
import type { DashboardTabConfig } from '@/pages/dashboard/dashboardTypes';
import './dashboard.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const language = useAppSelector((state) => state.viewerPreferences.language);
  const copy = useViewerCopy();
  const activeTab = parseDashboardTab(searchParams.get('tab'));
  const dashboardTabs: DashboardTabConfig[] = [
    { value: 'home', label: copy.dashboard.home, shortLabel: copy.dashboard.home, icon: House },
    { value: 'course', label: copy.dashboard.course, shortLabel: copy.dashboard.course, icon: LibraryBig },
    { value: 'data', label: copy.dashboard.data, shortLabel: copy.dashboard.data, icon: BarChart3 },
  ];

  function changeTab(tab: DashboardTabConfig['value']) {
    const next = new URLSearchParams(searchParams);
    if (tab === 'home') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  }

  const model = useDashboardPageModel({
    userId: user?.id,
    language,
    navigate,
  });

  if (!user) {
    return (
      <div className="dashboard-studio dashboard-studio--authless">
        <section className="studio-card studio-authless">
          <div className="studio-authless__mark">
            <LibraryBig size={40} />
          </div>
          <h1>Sign in to enter the author workspace</h1>
          <p>Primoria&apos;s builder workspace is available once your account is signed in.</p>
          <button
            type="button"
            className="studio-button studio-button--primary"
            onClick={() => navigate('/login')}
          >
            Go to sign in
          </button>
        </section>
      </div>
    );
  }

  const analyticsErrorNotice = model.analyticsQuery.error ? (
    <section className="studio-inline-notice studio-inline-notice--error">
      <p>{`Learner analytics are unavailable right now. ${getErrorMessage(model.analyticsQuery.error)}`}</p>
      <button type="button" aria-label="Reload analytics" onClick={() => void model.analyticsQuery.refetch()}>
        <BarChart3 size={14} />
      </button>
    </section>
  ) : null;

  return (
    <div className="dashboard-studio">
      <div className="dashboard-studio__layout">
        <aside className="studio-sidebar">
          <button type="button" className="studio-sidebar__brand viewer-button-flat" onClick={() => navigate('/')}>
            <span className="studio-sidebar__brand-mark">
              <img src={publicAssetPath('primoria-logo.png')} alt="" aria-hidden="true" />
            </span>
            <span className="studio-sidebar__brand-copy">
              <strong>Primoria</strong>
              <small>Author workspace</small>
            </span>
          </button>

          <nav className="studio-sidebar__nav" aria-label="Dashboard navigation">
            {dashboardTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  className={`studio-sidebar__nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => changeTab(tab.value)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={17} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="studio-main">
          {model.notice ? (
            <section className={`studio-inline-notice studio-inline-notice--${model.notice.tone}`}>
              <p>{model.notice.text}</p>
              <button type="button" aria-label="Dismiss notice" onClick={() => model.setNotice(null)}>
                <X size={14} />
              </button>
            </section>
          ) : null}

          <div className="studio-main__content">
            {activeTab === 'home' ? (
              <DashboardHomeTab
                model={model}
                navigate={navigate}
                onChangeTab={changeTab}
                analyticsErrorNotice={analyticsErrorNotice}
              />
            ) : null}

            {activeTab === 'course' ? (
              <DashboardCoursesTab
                model={model}
                navigate={navigate}
                analyticsErrorNotice={analyticsErrorNotice}
              />
            ) : null}

            {activeTab === 'data' ? (
              <DashboardAnalyticsTab
                model={model}
                analyticsErrorNotice={analyticsErrorNotice}
              />
            ) : null}
          </div>
        </main>
      </div>

      <CourseFormDialog
        open={model.formMode !== null}
        mode={model.formMode ?? 'create'}
        course={model.courseForForm}
        pending={model.createCourse.isPending || model.updateCourse.isPending}
        error={model.formError}
        onOpenChange={(open) => {
          if (open) return;
          model.setFormMode(null);
          model.setCourseForForm(null);
          model.setFormError(null);
        }}
        onSubmit={(payload) =>
          model.formMode === 'edit' ? model.handleUpdateCourse(payload) : model.handleCreateCourse(payload)
        }
      />

      <AICourseDraftDialog
        open={model.aiDraftOpen}
        onOpenChange={model.setAiDraftOpen}
        onUseDraft={model.handleUseAICourseDraft}
      />

      <ConfirmDialog
        open={model.courseToDelete !== null}
        title="Delete course"
        description={
          model.courseToDelete
            ? `Are you sure you want to delete "${model.courseToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete course"
        pending={model.deleteCourse.isPending}
        onOpenChange={(open) => {
          if (!open) model.setCourseToDelete(null);
        }}
        onConfirm={model.handleDeleteCourse}
      />

      <ConfirmDialog
        open={model.lessonToDelete !== null}
        title="Delete lesson"
        description={
          model.lessonToDelete
            ? `Are you sure you want to delete lesson ${model.lessonToDelete.index + 1}, "${model.lessonToDelete.lesson.title}"?`
            : ''
        }
        confirmLabel="Delete lesson"
        pending={model.removeLesson.isPending}
        onOpenChange={(open) => {
          if (!open) model.setLessonToDelete(null);
        }}
        onConfirm={model.handleDeleteLesson}
      />
    </div>
  );
}

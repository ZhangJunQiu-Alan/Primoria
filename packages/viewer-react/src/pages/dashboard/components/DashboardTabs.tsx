import { type ReactNode } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookCopy,
  BookOpen,
  BookPlus,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Copy,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { formatDuration, formatLessonDuration, formatStatus, formatUpdatedAt, getErrorMessage } from '@/pages/dashboard/dashboardLib';
import { MetricCard, TrendChart } from '@/pages/dashboard/components/DashboardStats';
import type { DashboardPageModel } from '@/pages/dashboard/hooks/useDashboardPageModel';
import type { DashboardTab } from '@/pages/dashboard/dashboardTypes';

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="studio-page-header studio-card studio-card--mist">
      <div>
        {eyebrow ? <p className="studio-overline">{eyebrow}</p> : null}
        <h1 className="studio-page-header__title">{title}</h1>
        <p className="studio-page-header__description">{description}</p>
      </div>
      {actions ? <div className="studio-page-header__actions">{actions}</div> : null}
    </section>
  );
}

export function DashboardHomeTab({
  model,
  navigate,
  onChangeTab,
  analyticsErrorNotice,
}: {
  model: DashboardPageModel;
  navigate: NavigateFunction;
  onChangeTab: (tab: DashboardTab) => void;
  analyticsErrorNotice: ReactNode;
}) {
  const { language } = model;

  return (
    <>
      {analyticsErrorNotice}

      <section className="studio-home-grid">
        <div className="studio-home-grid__main">
          <section className="studio-card studio-panel">
            <div className="studio-panel__header">
              <div>
                <h2>{language === 'zh-CN' ? '今日概览' : 'Today overview'}</h2>
              </div>
            </div>

            <div className="studio-split-metrics">
              <MetricCard icon={Users} label={language === 'zh-CN' ? '本周学习者' : 'Weekly learners'} value={model.weeklyLearners} tone="mist" />
              <MetricCard icon={Clock3} label={language === 'zh-CN' ? '累计学习时长' : 'Total study hours'} value={`${model.totalStudyHours}h`} tone="sage" />
            </div>

            <div className="studio-chart-card__meta">
              <span>{language === 'zh-CN' ? `完成趋势：${(model.completionRate * 100).toFixed(1)}%` : `Completion trend: ${(model.completionRate * 100).toFixed(1)}%`}</span>
              <strong>{language === 'zh-CN' ? `${model.formatSignedDelta(model.completionDelta)} 较上周` : `${model.formatSignedDelta(model.completionDelta)} vs last week`}</strong>
            </div>

            <TrendChart
              labels={model.homeTrendLabels}
              series={[
                {
                  name: 'Completion',
                  values: model.completionTrendValues,
                  color: '#7a9e7e',
                  fillColor: 'rgba(122, 158, 126, 0.16)',
                },
              ]}
            />
          </section>

          <section className="studio-card studio-panel">
            <div className="studio-panel__header">
              <div>
                <h2>{language === 'zh-CN' ? '课程表现排行' : 'Course ranking'}</h2>
              </div>
            </div>

            {model.topCourses.length > 0 ? (
              <div className="studio-top-course-list">
                {model.topCourses.map((course) => (
                  <article key={course.id} className="studio-top-course">
                    <div className="studio-top-course__media">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt="" />
                      ) : (
                        <span>{course.title.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="studio-top-course__copy">
                      <strong>{course.title}</strong>
                      <p>
                        {language === 'zh-CN'
                          ? `浏览 ${course.views} · 学习者 ${course.students}`
                          : `Views: ${course.views} · Students: ${course.students}`}
                      </p>
                      <div className="studio-progress">
                        <span style={{ width: `${course.momentum}%` }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="studio-link-button"
                      onClick={() => navigate(`/builder/editor/${course.id}`)}
                    >
                      {language === 'zh-CN' ? '查看课程' : 'View course'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="studio-empty-card studio-empty-card--soft">
                <BookOpen size={22} />
                <div>
                  <strong>{language === 'zh-CN' ? '还没有课程表现数据' : 'No course performance data yet'}</strong>
                  <p>{language === 'zh-CN' ? '先发布课程，后续这里会开始显示学习信号。' : 'Publish content first and the workspace will start surfacing course signals.'}</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="studio-home-grid__aside">
          <section className="studio-card studio-panel">
            <div className="studio-panel__header">
              <div>
                <h2>{language === 'zh-CN' ? '最近编辑' : 'Recent activity'}</h2>
              </div>
              <button
                type="button"
                className="studio-link-button"
                onClick={() => onChangeTab('course')}
              >
                {language === 'zh-CN' ? '查看全部' : 'View all'}
              </button>
            </div>

            <div className="studio-activity-list">
              {model.recentActivities.map((activity) => (
                <article key={activity.title} className={`studio-activity studio-activity--${activity.tone}`}>
                  <span className="studio-activity__dot" />
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.description}</p>
                  </div>
                  <small>{activity.time}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="studio-card studio-panel studio-card--sage">
            <div className="studio-panel__header">
              <div>
                <h2>{language === 'zh-CN' ? '待处理' : 'Needs attention'}</h2>
              </div>
            </div>

            <div className="studio-split-metrics">
              <MetricCard icon={LayoutGrid} label={language === 'zh-CN' ? '草稿课程' : 'Draft courses'} value={model.draftCourses} tone="lavender" />
              <MetricCard icon={TriangleAlert} label={language === 'zh-CN' ? '待补内容' : 'Needs content'} value={model.emptyCourses} tone="amber" />
            </div>

            <div className="studio-activity-list">
              <article className="studio-activity studio-activity--amber">
                <span className="studio-activity__dot" />
                <div>
                  <strong>{language === 'zh-CN' ? '优先整理草稿' : 'Polish the drafts first'}</strong>
                  <p>
                    {language === 'zh-CN'
                      ? `${model.draftCourses} 门课程还没发布，先把最接近完成的那一门推进出去。`
                      : `${model.draftCourses} courses are still in draft. Push the one closest to publish first.`}
                  </p>
                </div>
              </article>
              <article className="studio-activity studio-activity--sage">
                <span className="studio-activity__dot" />
                <div>
                  <strong>{language === 'zh-CN' ? '补齐空课程' : 'Fill the empty courses'}</strong>
                  <p>
                    {language === 'zh-CN'
                      ? `${model.emptyCourses} 门课程还没有课时，先补上最小可发布内容。`
                      : `${model.emptyCourses} courses still have no lessons. Add the minimum viable lesson set next.`}
                  </p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

export function DashboardCoursesTab({
  model,
  navigate,
  analyticsErrorNotice,
}: {
  model: DashboardPageModel;
  navigate: NavigateFunction;
  analyticsErrorNotice: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Course management workspace"
        description="Manage courses, lessons, and publish status from a single calm surface."
        actions={(
          <>
            <button
              type="button"
              className="studio-button studio-button--ai"
              onClick={() => model.setAiDraftOpen(true)}
            >
              <BrainCircuit size={16} />
              <span>Create with AI</span>
            </button>

            <button
              type="button"
              className="studio-button studio-button--primary"
              onClick={() => {
                model.setFormError(null);
                model.setCourseForForm(null);
                model.setFormMode('create');
              }}
            >
              <Plus size={16} />
              <span>Create course</span>
            </button>

            <button
              type="button"
              className="studio-icon-button"
              aria-label="Refresh course list"
              onClick={() => void model.handleRefresh()}
              disabled={model.isRefetching}
            >
              {model.isRefetching ? <Loader2 className="dashboard-spin" size={16} /> : <RefreshCcw size={16} />}
            </button>
          </>
        )}
      />

      <section className="studio-summary-strip studio-summary-strip--course">
        <MetricCard icon={BookCopy} label="Courses" value={model.courses.length} tone="mist" />
        <MetricCard icon={ArrowUpRight} label="Published" value={model.publishedCourses} tone="amber" />
        <MetricCard icon={LayoutGrid} label="Drafts" value={model.draftCourses} tone="lavender" />
        <MetricCard icon={TriangleAlert} label="Needs content" value={model.emptyCourses} tone="sky" />
      </section>

      <section className="studio-controls-card studio-card studio-card--soft">
        <label className="studio-search">
          <Search size={16} />
          <input
            aria-label="Search courses"
            placeholder="Search courses, descriptions, or lesson titles..."
            value={model.search}
            onChange={(event) => model.setSearch(event.target.value)}
          />
          {model.search ? (
            <button
              type="button"
              className="studio-search__clear"
              aria-label="Clear search"
              onClick={() => model.setSearch('')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <div className="studio-chip-group" aria-label="Course status filters">
          {([
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft only' },
            { value: 'published', label: 'Published only' },
          ] as const).map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`studio-chip ${model.statusFilter === filter.value ? 'is-active' : ''}`}
              onClick={() => model.setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="studio-sort">
          <span>Sort</span>
          <select value={model.sortMode} onChange={(event) => model.setSortMode(event.target.value as typeof model.sortMode)}>
            <option value="updated">Recently updated</option>
            <option value="lessons">Most lessons</option>
            <option value="student">Most students</option>
            <option value="comments">Most comments</option>
            <option value="title">Course title</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </section>

      {model.hasInlineError ? (
        <section className="studio-inline-notice studio-inline-notice--error">
          <p>{getErrorMessage(model.error)}</p>
          <button type="button" aria-label="Reload" onClick={() => void model.handleRefresh()}>
            <RefreshCcw size={14} />
          </button>
        </section>
      ) : null}

      {analyticsErrorNotice}

      {model.isLoading && model.courses.length === 0 ? (
        <section className="studio-card studio-empty-state">
          <Loader2 className="dashboard-spin studio-empty-state__spinner" size={34} />
          <h2>Loading courses…</h2>
          <p>Syncing course and lesson data.</p>
        </section>
      ) : null}

      {!model.isLoading && model.error && model.courses.length === 0 ? (
        <section className="studio-card studio-empty-state">
          <TriangleAlert size={38} />
          <h2>Couldn&apos;t load the workspace</h2>
          <p>{getErrorMessage(model.error)}</p>
          <button
            type="button"
            className="studio-button studio-button--primary"
            onClick={() => void model.handleRefresh()}
          >
            <RefreshCcw size={16} />
            <span>Reload</span>
          </button>
        </section>
      ) : null}

      {model.hasEmptyState ? (
        <section className="studio-card studio-empty-state">
          <div className="studio-authless__mark">
            <GraduationCap size={28} />
          </div>
          <h2>No courses yet</h2>
          <p>Create a course shell first, then return here to manage lessons and publish status.</p>
          <div className="studio-empty-state__actions">
            <button
              type="button"
              className="studio-button studio-button--ai"
              onClick={() => model.setAiDraftOpen(true)}
            >
              <BrainCircuit size={16} />
              <span>Create with AI</span>
            </button>
            <button
              type="button"
              className="studio-button studio-button--primary"
              onClick={() => {
                model.setFormError(null);
                model.setCourseForForm(null);
                model.setFormMode('create');
              }}
            >
              <Plus size={16} />
              <span>Create course</span>
            </button>
          </div>
        </section>
      ) : null}

      {model.hasNoResults ? (
        <section className="studio-card studio-empty-state">
          <Search size={34} />
          <h2>No matching courses</h2>
          <p>Try clearing the query or switching filters.</p>
          <button
            type="button"
            className="studio-button studio-button--secondary"
            onClick={() => {
              model.setSearch('');
              model.setStatusFilter('all');
            }}
          >
            <RefreshCcw size={16} />
            <span>Clear filters</span>
          </button>
        </section>
      ) : null}

      {model.visibleCourses.length > 0 ? (
        <section className="studio-course-list" aria-label="Course list">
          {model.visibleCourses.map((course) => (
            <article key={course.id} className="studio-card studio-course-card">
              <div className="studio-course-card__body">
                <div className="studio-course-card__header">
                  <div className="studio-course-card__title-group">
                    <p className="studio-overline">{formatUpdatedAt(course.updated_at)}</p>
                    <h2>{course.title}</h2>
                  </div>

                  <div className="studio-course-card__actions">
                    <span className={`studio-status-badge studio-status-badge--${course.status}`}>
                      {formatStatus(course.status)}
                    </span>
                    <button
                      type="button"
                      className="studio-button studio-button--secondary"
                      onClick={() => navigate(`/builder/editor/${course.id}`)}
                    >
                      <ArrowUpRight size={16} />
                      <span>Open editor</span>
                    </button>
                    <button
                      type="button"
                      className="studio-button studio-button--ghost"
                      onClick={() => {
                        model.setFormError(null);
                        model.setCourseForForm(course);
                        model.setFormMode('edit');
                      }}
                    >
                      <Pencil size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="studio-button studio-button--ghost"
                      onClick={() => void model.handleDuplicateCourse(course)}
                      disabled={model.duplicateCourse.isPending}
                    >
                      {model.duplicateCourse.isPending ? <Loader2 className="dashboard-spin" size={16} /> : <Copy size={16} />}
                      <span>Duplicate</span>
                    </button>
                    <button
                      type="button"
                      className="studio-button studio-button--danger-soft"
                      onClick={() => model.setCourseToDelete(course)}
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <p className="studio-course-card__description">
                  {course.description || 'Add a short course description so the team can scan the catalog faster.'}
                </p>

                <div className="studio-meta-row">
                  <span className="studio-meta-chip">{formatDuration(course.estimated_minutes)}</span>
                  <span className="studio-meta-chip">{course.lessons.length} lessons</span>
                </div>

                <section className="studio-lesson-panel">
                  <div className="studio-lesson-panel__header">
                    <div>
                      <p className="studio-overline">LESSON MANAGEMENT</p>
                      <h3>Lesson management</h3>
                    </div>
                    <span>{course.lessons.length > 0 ? `${course.lessons.length} lessons` : 'No lessons yet'}</span>
                  </div>

                  <div className="studio-lesson-grid">
                    {course.lessons.map((lesson, index) => (
                      <article key={lesson.id} className="studio-lesson-tile">
                        <button
                          type="button"
                          className="studio-lesson-tile__open"
                          onClick={() => navigate(`/builder/editor/${course.id}`)}
                        >
                          <span className="studio-lesson-tile__index">Lesson {index + 1}</span>
                          <strong>{lesson.title}</strong>
                          <small>{formatLessonDuration(lesson.duration_seconds)}</small>
                        </button>
                        <button
                          type="button"
                          className="studio-lesson-tile__delete"
                          aria-label={`Delete ${lesson.title}`}
                          onClick={() => {
                            if (course.lessons.length <= 1) {
                              model.setNotice({
                                tone: 'error',
                                text: 'A course must keep at least one lesson.',
                              });
                              return;
                            }
                            model.setLessonToDelete({ course, lesson, index });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </article>
                    ))}

                    <button
                      type="button"
                      className="studio-lesson-tile studio-lesson-tile--add"
                      onClick={() => void model.handleAddLesson(course)}
                      disabled={model.addLesson.isPending}
                    >
                      {model.addLesson.isPending ? <Loader2 className="dashboard-spin" size={18} /> : <BookPlus size={18} />}
                      <strong>Add lesson</strong>
                      <small>Create a new lesson shell and continue refining it in the editor.</small>
                    </button>
                  </div>
                </section>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function DashboardAnalyticsTab({
  model,
  analyticsErrorNotice,
}: {
  model: DashboardPageModel;
  analyticsErrorNotice: ReactNode;
}) {
  const { language } = model;

  return (
    <>
      {analyticsErrorNotice}

      <PageHeader
        eyebrow={language === 'zh-CN' ? '学习表现' : 'Learning performance'}
        title={language === 'zh-CN' ? '学习表现总览' : 'Learning performance overview'}
        description={language === 'zh-CN' ? '只保留完成趋势、活跃学习者和课程排行。' : 'Keep the view focused on completion trend, active learners, and course ranking.'}
      />

      <section className="studio-summary-strip">
        <MetricCard icon={BookCopy} label={language === 'zh-CN' ? '课程总数' : 'Total courses'} value={model.courses.length} tone="mist" detail={language === 'zh-CN' ? `草稿 ${model.draftCourses} · 已归档 ${model.courses.filter((course) => course.status === 'archived').length}` : `Draft ${model.draftCourses} · Archived ${model.courses.filter((course) => course.status === 'archived').length}`} />
        <MetricCard icon={ArrowUpRight} label={language === 'zh-CN' ? '已发布课程' : 'Published courses'} value={model.publishedCourses} tone="sage" detail={model.courses.length > 0 ? `${Math.round((model.publishedCourses / model.courses.length) * 100)}%` : '0%'} />
        <MetricCard icon={Activity} label={language === 'zh-CN' ? '已发布浏览' : 'Published viewers'} value={model.publishedViewers} tone="amber" />
        <MetricCard icon={BadgeCheck} label={language === 'zh-CN' ? '平均完成率' : 'Average completion'} value={`${(model.averageCompletionRate * 100).toFixed(1)}%`} tone="sky" />
      </section>

      <section className="studio-analytics-grid">
        <article className="studio-card studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '完成趋势' : 'Completion trend'}</h2>
              <p>{language === 'zh-CN' ? '按月查看整体完成情况。' : 'Monthly view of overall completion quality.'}</p>
            </div>
          </div>

          <TrendChart
            labels={model.dataMonthLabels}
            series={[
              {
                name: 'Completion',
                values: model.completionHistory,
                color: '#7a9e7e',
                fillColor: 'rgba(122, 158, 126, 0.12)',
              },
            ]}
          />
        </article>

        <article className="studio-card studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '活跃学习者' : 'Active learners'}</h2>
              <p>{language === 'zh-CN' ? '看清最近一段时间有多少人真的在学。' : 'See how many learners are actively engaging over time.'}</p>
            </div>
          </div>

          <TrendChart
            labels={model.dataMonthLabels}
            series={[
              {
                name: 'Active learners',
                values: model.activeLearnerHistory,
                color: '#a99ab4',
                fillColor: 'rgba(169, 154, 180, 0.12)',
              },
            ]}
          />
        </article>

        <article className="studio-card studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '课程表现排行' : 'Course ranking'}</h2>
              <p>{language === 'zh-CN' ? '把最能带动学习的课程排出来。' : 'See which courses are carrying the strongest learner momentum.'}</p>
            </div>
          </div>

          {model.publishedCourseRanking.length > 0 ? (
            <div className="studio-data-list">
              {model.publishedCourseRanking.slice(0, 5).map((course) => (
                <div key={course.id} className="studio-data-list__row">
                  <span>{course.title}</span>
                  <strong>{language === 'zh-CN' ? `${course.views} 浏览` : `${course.views} views`}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="studio-panel__empty">{language === 'zh-CN' ? '还没有数据' : 'No data yet'}</p>
          )}
        </article>
      </section>
    </>
  );
}

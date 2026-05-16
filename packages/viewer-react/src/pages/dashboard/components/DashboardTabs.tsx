import { type ReactNode } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BookCopy,
  BookOpen,
  BookPlus,
  BrainCircuit,
  Clock3,
  Copy,
  Flag,
  GitBranch,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import {
  formatLessonDuration,
  formatUpdatedAt,
  formatWorkflowStatus,
  getCourseInitials,
  getErrorMessage,
  getLatestLesson,
} from '@/pages/dashboard/dashboardLib';
import { MetricCard, TrendChart } from '@/pages/dashboard/components/DashboardStats';
import type { DashboardPageModel } from '@/pages/dashboard/hooks/useDashboardPageModel';
import type { DashboardTab } from '@/pages/dashboard/dashboardTypes';
import type { CourseRow } from '@/queries/courses';

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

function ReadinessMeter({ value, label = 'Publish Readiness' }: { value: number; label?: string }) {
  return (
    <div className="studio-readiness">
      <div className="studio-readiness__meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="studio-progress">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CourseCover({ course }: { course: CourseRow }) {
  return (
    <div className="studio-course-card__cover">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt="" />
      ) : (
        <span>{getCourseInitials(course.title)}</span>
      )}
    </div>
  );
}

function AnalyticsUnlockPrompt({ title, body }: { title: string; body: string }) {
  return (
    <div className="studio-empty-card studio-empty-card--soft studio-empty-card--compact">
      <BarChart3 size={20} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
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
          <section className="studio-card studio-panel studio-continue-card">
            <div className="studio-panel__header">
              <div>
                <p className="studio-overline">{language === 'zh-CN' ? '继续创作' : 'Continue Building'}</p>
                <h2>{language === 'zh-CN' ? '回到上次停下的位置' : 'Continue where you left off'}</h2>
              </div>
              {model.continueBuilding ? (
                <button
                  type="button"
                  className="studio-button studio-button--primary"
                  onClick={() => navigate(`/builder/editor/${model.continueBuilding!.course.id}`)}
                >
                  <ArrowUpRight size={16} />
                  <span>{language === 'zh-CN' ? '继续编辑' : 'Resume Editing'}</span>
                </button>
              ) : null}
            </div>

            {model.continueBuilding ? (
              <div className="studio-continue-card__body">
                <CourseCover course={model.continueBuilding.course} />
                <div className="studio-continue-card__copy">
                  <h3>{model.continueBuilding.course.title}</h3>
                  <p>
                    {model.continueBuilding.lesson
                      ? `${model.continueBuilding.lesson.title} • ${model.continueBuilding.lastBlockLabel}`
                      : 'Course shell • Next lesson block'}
                  </p>
                  <ReadinessMeter value={model.continueBuilding.completion} label="Draft completion" />
                  <small>{model.continueBuilding.needsText}</small>
                </div>
              </div>
            ) : (
              <div className="studio-empty-card studio-empty-card--soft">
                <Sparkles size={22} />
                <div>
                  <strong>{language === 'zh-CN' ? '还没有可继续的课程' : 'No active draft yet'}</strong>
                  <p>{language === 'zh-CN' ? '创建课程后，这里会直接显示最近编辑的位置。' : 'Create a course and Studio will return you to the exact next editing step.'}</p>
                </div>
              </div>
            )}
          </section>

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

            {model.hasHomeCompletionData ? (
              <TrendChart
                labels={model.homeTrendLabels}
                height={172}
                series={[
                  {
                    name: 'Completion',
                    values: model.completionTrendValues,
                    color: '#7a9e7e',
                    fillColor: 'rgba(122, 158, 126, 0.16)',
                  },
                ]}
              />
            ) : (
              <AnalyticsUnlockPrompt
                title={language === 'zh-CN' ? '发布课程后解锁趋势' : 'Publish your first course to unlock learner analytics'}
                body={language === 'zh-CN' ? '在真实数据出现前，Studio 会优先显示创作进度和发布准备度。' : 'Until real learner data exists, Studio focuses on building momentum and publish readiness.'}
              />
            )}
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
                <h2>{language === 'zh-CN' ? '创作者动态' : 'Creator activity feed'}</h2>
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
              {model.creatorActivityFeed.map((activity) => (
                <article key={`${activity.title}-${activity.time}`} className={`studio-activity studio-activity--${activity.tone}`}>
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
              <MetricCard icon={BadgeCheck} label={language === 'zh-CN' ? '平均准备度' : 'Avg readiness'} value={`${model.averagePublishReadiness}%`} tone="lavender" />
              <MetricCard icon={TriangleAlert} label={language === 'zh-CN' ? '待处理课程' : 'Needs attention'} value={model.needsAttentionCourses.length} tone="amber" />
            </div>

            <div className="studio-activity-list">
              {model.needsAttentionCourses.map((course) => {
                const readiness = model.courseReadinessById.get(course.id);
                return (
                  <article key={course.id} className="studio-activity studio-activity--amber">
                    <span className="studio-activity__dot" />
                    <div>
                      <strong>{course.title}</strong>
                      <p>{readiness?.nextAction ?? 'Review course readiness before publishing.'}</p>
                    </div>
                    <small>{readiness?.score ?? 0}%</small>
                  </article>
                );
              })}
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
        <MetricCard icon={BadgeCheck} label="Avg readiness" value={`${model.averagePublishReadiness}%`} tone="lavender" />
        <MetricCard icon={TriangleAlert} label="Needs attention" value={model.needsAttentionCourses.length} tone="sky" />
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
            { value: 'all', label: 'All' },
            { value: 'draft', label: 'Draft' },
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
          <select
            aria-label="Sort"
            value={model.sortMode}
            onChange={(event) => model.setSortMode(event.target.value as typeof model.sortMode)}
          >
            <option value="updated">Recently updated</option>
            <option value="student">Students</option>
            <option value="comments">Comments</option>
            <option value="views">Views</option>
            <option value="completion">Completion</option>
            <option value="title">Title</option>
          </select>
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
          <h2>Build your first AI-assisted course</h2>
          <p>Start from a template, generate a lesson plan, or create a course shell. Studio will track readiness as you build.</p>
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
          <p>Try clearing filters, or switch to Needs attention to find the next course worth improving.</p>
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
          {model.visibleCourses.map((course) => {
            const workflowStatus = model.courseWorkflowStatusById.get(course.id) ?? 'draft';
            const latestLesson = getLatestLesson(course);

            return (
              <article key={course.id} className="studio-card studio-course-card">
                <div className="studio-course-card__shell">
                  <CourseCover course={course} />

                  <div className="studio-course-card__body">
                    <div className="studio-course-card__header">
                      <div className="studio-course-card__title-group">
                        <p className="studio-overline">{formatUpdatedAt(course.updated_at)}</p>
                        <h2>{course.title}</h2>
                      </div>

                      <div className="studio-course-card__actions">
                        <span className={`studio-status-badge studio-status-badge--${workflowStatus}`}>
                          {formatWorkflowStatus(workflowStatus)}
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

                    <section className="studio-lesson-panel">
                      <div className="studio-lesson-panel__header">
                        <div>
                          <p className="studio-overline">CONTENT STRUCTURE</p>
                          <h3>Course map</h3>
                        </div>
                        <span>{latestLesson ? `Last edited: ${latestLesson.title}` : 'No lessons yet'}</span>
                      </div>

                      <div className="studio-course-map">
                        <div className="studio-course-map__node studio-course-map__node--root">
                          <Flag size={14} />
                          <span>Course</span>
                        </div>
                        <div className="studio-course-map__branch">
                          <div className="studio-course-map__node">
                            <GitBranch size={14} />
                            <span>Module 1</span>
                          </div>
                          {course.lessons.slice(0, 4).map((lesson, index) => (
                            <button
                              key={lesson.id}
                              type="button"
                              className="studio-course-map__node studio-course-map__node--lesson"
                              onClick={() => navigate(`/builder/editor/${course.id}`)}
                            >
                              <BookOpen size={14} />
                              <span>Lesson {index + 1}: {lesson.title}</span>
                            </button>
                          ))}
                          {course.lessons.length > 4 ? (
                            <span className="studio-course-map__more">+{course.lessons.length - 4} more lessons</span>
                          ) : null}
                        </div>
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
                </div>
              </article>
            );
          })}
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
        description={language === 'zh-CN' ? '只保留完成趋势、活跃学习者、课程排行和关键学习信号。' : 'Keep the view focused on completion trend, active learners, course ranking, and key learning signals.'}
      />

      <section className="studio-summary-strip studio-summary-strip--data">
        <MetricCard icon={Users} label={language === 'zh-CN' ? '已发布浏览' : 'Published viewers'} value={model.publishedViewers} tone="mist" />
        <MetricCard icon={BadgeCheck} label={language === 'zh-CN' ? '平均完成率' : 'Average completion'} value={`${(model.averageCompletionRate * 100).toFixed(1)}%`} tone="lavender" />
      </section>

      <section className="studio-analytics-grid">
        <article className="studio-card studio-card--mist studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '完成趋势' : 'Completion trend'}</h2>
              <p>{language === 'zh-CN' ? '按月查看整体完成情况。' : 'Monthly view of overall completion quality.'}</p>
            </div>
          </div>

          {model.hasMonthlyAnalyticsData ? (
            <TrendChart
              labels={model.dataMonthLabels}
              height={172}
              series={[
                {
                  name: 'Completion',
                  values: model.completionHistory,
                  color: '#7a9e7e',
                  fillColor: 'rgba(122, 158, 126, 0.12)',
                },
              ]}
            />
          ) : (
            <AnalyticsUnlockPrompt
              title={language === 'zh-CN' ? '还没有完成趋势' : 'Publish your first course to unlock learner analytics'}
              body={language === 'zh-CN' ? '这里不会再显示空图表；有真实学习数据后趋势会自动出现。' : 'Studio hides empty charts until real learner activity exists.'}
            />
          )}
        </article>

        <article className="studio-card studio-card--sage studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '活跃学习者' : 'Active learners'}</h2>
              <p>{language === 'zh-CN' ? '看清最近一段时间有多少人真的在学。' : 'See how many learners are actively engaging over time.'}</p>
            </div>
          </div>

          {model.hasMonthlyAnalyticsData ? (
            <TrendChart
              labels={model.dataMonthLabels}
              height={172}
              series={[
                {
                  name: 'Active learners',
                  values: model.activeLearnerHistory,
                  color: '#a99ab4',
                  fillColor: 'rgba(169, 154, 180, 0.12)',
                },
              ]}
            />
          ) : (
            <AnalyticsUnlockPrompt
              title={language === 'zh-CN' ? '等待学习者数据' : 'No empty learner graph'}
              body={language === 'zh-CN' ? '发布后会用真实学习者走势替换这个提示。' : 'Active learner charts appear only after courses collect real engagement.'}
            />
          )}
        </article>

        <article className="studio-card studio-card--lavender studio-panel">
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
            <AnalyticsUnlockPrompt
              title={language === 'zh-CN' ? '课程排行等待发布' : 'Publish to unlock course ranking'}
              body={language === 'zh-CN' ? '没有真实排行时，这里保留行动提示，不展示空列表。' : 'Course rankings stay hidden until published lessons receive learner signals.'}
            />
          )}
        </article>

        <article className="studio-card studio-card--sky studio-panel">
          <div className="studio-panel__header">
            <div>
              <h2>{language === 'zh-CN' ? '学习信号快照' : 'Learning signal snapshot'}</h2>
              <p>{language === 'zh-CN' ? '把当前最值得关注的完成、复看、流失和测验信号集中在一起。' : 'Keep completion, replay, drop-off, and quiz signals together in one place.'}</p>
            </div>
          </div>

          <div className="studio-analytics-snapshot-grid">
            {model.analyticsPreviewCards.map((card) => (
              <article key={card.label} className="studio-analytics-snapshot-item">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  BookCopy,
  BookOpen,
  BookPlus,
  BookText,
  BrainCircuit,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  GraduationCap,
  House,
  Image as ImageIcon,
  LayoutGrid,
  Leaf,
  LibraryBig,
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
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import {
  useAddLesson,
  useCourseList,
  useCreateCourse,
  useDeleteCourse,
  useDeleteLesson,
  useDuplicateCourse,
  useUpdateCourse,
  type CourseLessonRow,
  type CourseRow,
} from '@/queries/courses';
import {
  emptyDashboardAnalytics,
  useDashboardAnalytics,
} from '@/queries/dashboardAnalytics';
import { AccountMenu } from '@/components/account/AccountMenu';
import './dashboard.css';

type DashboardTab = 'home' | 'course' | 'data' | 'fans';
type StatusFilter = 'all' | 'draft' | 'published';
type SortMode = 'updated' | 'title' | 'lessons' | 'student' | 'comments';
type FansFilter = 'all' | 'active' | 'need-help';
type DifficultyLevel = CourseRow['difficulty_level'];
type PriceTier = CourseRow['price_tier'];

interface NoticeState {
  tone: 'success' | 'error' | 'info';
  text: string;
}

interface CourseFormState {
  title: string;
  description: string;
  thumbnailUrl: string;
  difficultyLevel: DifficultyLevel;
  estimatedHours: string;
  priceTier: PriceTier;
  price: string;
}

interface CourseFormPayload {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes?: number | null;
  priceTier: PriceTier;
  price?: number;
}

type AICourseDraftPace = 'quick' | 'balanced' | 'deep';

interface AICourseDraftFormState {
  topic: string;
  audience: string;
  outcome: string;
  pace: AICourseDraftPace;
}

interface AICourseDraftPreview {
  title: string;
  summary: string;
  lessonTitles: string[];
  coachNote: string;
}

interface CourseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  course?: CourseRow | null;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CourseFormPayload) => Promise<void>;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

interface DashboardTabConfig {
  value: DashboardTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface ChartSeries {
  name: string;
  values: number[];
  color: string;
  fillColor?: string;
}

interface TrendChartProps {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  formatLabel?: (value: number) => string;
}

interface DonutItem {
  label: string;
  value: number;
  color: string;
}

const dashboardTabs: DashboardTabConfig[] = [
  { value: 'home', label: 'Home', shortLabel: 'Home', icon: House },
  { value: 'course', label: 'Course Management', shortLabel: 'Course', icon: LibraryBig },
  { value: 'data', label: 'Data Center', shortLabel: 'Data', icon: BarChart3 },
  { value: 'fans', label: 'Fan Management', shortLabel: 'Fans', icon: Users },
];

const homeWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fansWeekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const chartPalette = ['#7a9e7e', '#c4956a', '#a99ab4', '#c4807a'];

const emptyCourseForm: CourseFormState = {
  title: '',
  description: '',
  thumbnailUrl: '',
  difficultyLevel: 'beginner',
  estimatedHours: '',
  priceTier: 'free',
  price: '',
};

const emptyAICourseDraftForm: AICourseDraftFormState = {
  topic: '',
  audience: '',
  outcome: '',
  pace: 'balanced',
};

const aiCourseTopicPresets = [
  'Physics problem-solving sprint',
  'Prompt design for beginners',
  'Interactive web fundamentals',
];

function parseDashboardTab(value: string | null): DashboardTab {
  switch (value) {
    case 'course':
    case 'data':
    case 'fans':
      return value;
    default:
      return 'home';
  }
}

function buildAICourseDraftPreview(form: AICourseDraftFormState): AICourseDraftPreview {
  const topic = form.topic.trim() || 'AI-assisted course draft';
  const audience = form.audience.trim() || 'beginner learners';
  const outcome = form.outcome.trim() || 'build confidence through a short guided sequence';

  const paceCopy: Record<
    AICourseDraftPace,
    {
      label: string;
      modules: [string, string, string];
      note: string;
    }
  > = {
    quick: {
      label: 'quick-start',
      modules: ['Orientation and first win', 'Guided drill', 'Checkpoint recap'],
      note: 'Designed for a fast first version that gets learners into action quickly.',
    },
    balanced: {
      label: 'balanced',
      modules: ['Foundations and context', 'Worked example + guided practice', 'Checkpoint and reflection'],
      note: 'Balanced for a clear explanation, one practice pass, and a compact review loop.',
    },
    deep: {
      label: 'deep-dive',
      modules: ['Mental model and core concepts', 'Scenario practice lab', 'Review, transfer, and extension'],
      note: 'Structured for a denser learning arc with more explanation and transfer practice.',
    },
  };

  const selectedPace = paceCopy[form.pace];
  const title = topic;
  const lessonTitles = selectedPace.modules.map((label, index) => {
    if (index === 0) return `${label}: ${topic}`;
    if (index === 1) return `${label}: ${topic.split(' ').slice(0, 3).join(' ') || topic}`;
    return `${label}: next-step review`;
  });

  return {
    title,
    summary: `A ${selectedPace.label} course for ${audience} that helps them ${outcome}.`,
    lessonTitles,
    coachNote: selectedPace.note,
  };
}

function courseToFormState(course?: CourseRow | null): CourseFormState {
  if (!course) return emptyCourseForm;

  return {
    title: course.title,
    description: course.description ?? '',
    thumbnailUrl: course.thumbnail_url ?? '',
    difficultyLevel: course.difficulty_level,
    estimatedHours: course.estimated_minutes > 0 ? String(course.estimated_minutes / 60) : '',
    priceTier: course.price_tier,
    price: course.price_tier === 'premium' && course.price > 0 ? String(course.price) : '',
  };
}

function parseCourseForm(form: CourseFormState) {
  const title = form.title.trim();
  if (!title) {
    return { error: 'Please enter a course title.' };
  }

  let estimatedMinutes: number | null | undefined = null;
  const estimatedHours = form.estimatedHours.trim();
  if (estimatedHours) {
    const parsedHours = Number(estimatedHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      return { error: 'Please enter a valid estimated duration.' };
    }
    estimatedMinutes = Math.round(parsedHours * 60);
  }

  let price = 0;
  if (form.priceTier === 'premium') {
    const parsedPrice = Number(form.price.trim());
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return { error: 'Please enter a valid price.' };
    }
    price = parsedPrice;
  }

  return {
    payload: {
      title,
      description: form.description.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      difficultyLevel: form.difficultyLevel,
      estimatedMinutes,
      priceTier: form.priceTier,
      price,
    },
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: unknown;
      details?: unknown;
      code?: unknown;
    };
    const message = typeof maybe.message === 'string' ? maybe.message.trim() : '';
    const details = typeof maybe.details === 'string' ? maybe.details.trim() : '';

    if (message.includes('invalid input syntax for type uuid')) {
      return 'Internal ID format mismatch while saving. Please refresh and try again.';
    }

    if (message.includes('courses_author_id_fkey')) {
      return 'Your profile is not initialized yet. Please sign out, sign in again, and retry.';
    }

    if (message) {
      return details ? `${message} (${details})` : message;
    }
  }

  return 'Something went wrong. Please try again.';
}

function getDisplayName(email?: string | null) {
  return email?.split('@')[0] || 'author';
}

function formatUpdatedAt(updatedAt: string) {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'Updated just now';
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return 'Self-paced';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function formatLessonDuration(seconds: number) {
  if (seconds <= 0) return 'Draft lesson';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function formatPrice(course: CourseRow) {
  if (course.price_tier === 'premium' && course.price > 0) {
    return `$${course.price.toFixed(2)}`;
  }
  return 'Free';
}

function formatDifficulty(level: DifficultyLevel) {
  switch (level) {
    case 'advanced':
      return 'Advanced';
    case 'intermediate':
      return 'Intermediate';
    default:
      return 'Beginner';
  }
}

function formatStatus(status: CourseRow['status']) {
  switch (status) {
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

function formatCurrency(value: number) {
  return `$${Math.round(value)}`;
}

function buildMonthLabels(count: number) {
  const labels: string[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push(`${monthDate.getMonth() + 1}/${String(monthDate.getFullYear()).slice(-2)}`);
  }

  return labels;
}

function buildRecentDayLabels(count: number) {
  const labels: string[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    labels.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  return labels;
}

function formatShortDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatMonthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
}

function formatSignedDelta(value: number) {
  if (value === 0) {
    return '0.0%';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function buildLinePoints(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...safeValues, 1);
  const step = safeValues.length > 1 ? (width - padding * 2) / (safeValues.length - 1) : 0;

  return safeValues.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y, value };
  });
}

function TrendChart({ labels, series, height = 220, formatLabel }: TrendChartProps) {
  const width = 640;
  const padding = 24;
  const valueList = series.flatMap((item) => item.values);
  const safeMaxValue = Math.max(...valueList, 1);
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    Math.round((safeMaxValue * (4 - index)) / 4),
  );

  return (
    <div className="studio-chart">
      <div className="studio-chart__canvas" style={{ minHeight: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {gridValues.map((value, index) => {
            const y = padding + ((height - padding * 2) / (gridValues.length - 1)) * index;
            return (
              <g key={`${value}-${index}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  className="studio-chart__grid-line"
                />
                <text x={0} y={y + 4} className="studio-chart__axis-label">
                  {formatLabel ? formatLabel(value) : value}
                </text>
              </g>
            );
          })}

          {series.map((line) => {
            const points = buildLinePoints(line.values, width, height, padding);
            const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
            const areaPoints = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

            return (
              <g key={line.name}>
                {line.fillColor ? (
                  <polygon
                    points={areaPoints}
                    fill={line.fillColor}
                    stroke="none"
                    className="studio-chart__area"
                  />
                ) : null}
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="studio-chart__labels" aria-hidden="true">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ items }: { items: DonutItem[] }) {
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <div className="studio-donut">
      <div className="studio-donut__chart">
        <svg viewBox={`0 0 ${size} ${size}`} className="studio-donut__graphic" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(141, 124, 105, 0.12)"
            strokeWidth={strokeWidth}
          />
          {items.map((item) => {
            const length = total > 0 ? (item.value / total) * circumference : 0;
            const currentOffset = offset;
            offset += length;

            return (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </svg>

        <div className="studio-donut__center">
          <strong>{total > 0 ? `${Math.round((items[0]?.value ?? 0) / total * 100)}%` : '0%'}</strong>
          <span>Share</span>
        </div>
      </div>

      <div className="studio-donut__legend">
        {items.map((item) => (
          <div key={item.label} className="studio-donut__legend-item">
            <span className="studio-donut__legend-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="studio-page-header studio-card studio-card--mist">
      <div>
        <p className="studio-overline">{eyebrow}</p>
        <h1 className="studio-page-header__title">{title}</h1>
        <p className="studio-page-header__description">{description}</p>
      </div>
      {actions ? <div className="studio-page-header__actions">{actions}</div> : null}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = 'mist',
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'mist' | 'sage' | 'amber' | 'lavender' | 'sky';
  detail?: string;
}) {
  return (
    <article className={`studio-metric-card studio-metric-card--${tone}`}>
      <span className="studio-metric-card__icon">
        <Icon size={19} />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

function CourseFormDialog({
  open,
  mode,
  course,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: CourseFormDialogProps) {
  const [form, setForm] = useState<CourseFormState>(() => courseToFormState(course));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(courseToFormState(course));
    setValidationError(null);
  }, [open, course]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseCourseForm(form);
    if (result.error) {
      setValidationError(result.error);
      return;
    }

    if (!result.payload) return;
    setValidationError(null);
    await onSubmit(result.payload);
  }

  const title = mode === 'create' ? 'Create course' : 'Edit course details';
  const description = mode === 'create'
    ? 'Create the course shell first, then continue refining it in the editor.'
    : 'Adjust the course title, description, cover, and pricing directly from the workspace.';
  const formError = validationError ?? error;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog__overlay" />
        <Dialog.Content className="dashboard-dialog">
          <div className="dashboard-dialog__topline">
            <div>
              <Dialog.Title className="dashboard-dialog__title">{title}</Dialog.Title>
              <Dialog.Description className="dashboard-dialog__subtitle">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="studio-icon-button studio-icon-button--plain"
                aria-label="Close dialog"
                disabled={pending}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form className="dashboard-dialog__form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="dashboard-field">
              <span>Course title</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="For example: Motion Design Foundations"
                autoFocus
              />
            </label>

            <label className="dashboard-field">
              <span>Course description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                placeholder="Briefly explain the course goals and learning outcomes."
              />
            </label>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Difficulty</span>
                <select
                  value={form.difficultyLevel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      difficultyLevel: event.target.value as DifficultyLevel,
                    }))
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Estimated duration (hours)</span>
                <input
                  value={form.estimatedHours}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, estimatedHours: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="For example: 2.5"
                />
              </label>
            </div>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Pricing</span>
                <select
                  value={form.priceTier}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priceTier: event.target.value as PriceTier,
                    }))
                  }
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Price</span>
                <input
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="For example: 9.99"
                  disabled={form.priceTier !== 'premium'}
                />
              </label>
            </div>

            <label className="dashboard-field">
              <span>Cover image URL</span>
              <input
                value={form.thumbnailUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>

            <div className="dashboard-dialog__media-preview">
              {form.thumbnailUrl ? (
                <img src={form.thumbnailUrl} alt="" />
              ) : (
                <div className="dashboard-dialog__media-placeholder">
                  <ImageIcon size={18} />
                  <span>Cover preview</span>
                </div>
              )}
            </div>

            {formError ? <p className="dashboard-form-error">{formError}</p> : null}

            <div className="dashboard-dialog__actions">
              <Dialog.Close asChild>
                <button type="button" className="studio-button studio-button--ghost" disabled={pending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="studio-button studio-button--primary" disabled={pending}>
                {pending ? <Loader2 className="dashboard-spin" size={16} /> : null}
                <span>{mode === 'create' ? 'Create course' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AICourseDraftDialog({
  open,
  onOpenChange,
  onUseDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseDraft: (preview: AICourseDraftPreview) => void;
}) {
  const [form, setForm] = useState<AICourseDraftFormState>(emptyAICourseDraftForm);

  useEffect(() => {
    if (!open) return;
    setForm(emptyAICourseDraftForm);
  }, [open]);

  const preview = buildAICourseDraftPreview(form);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog__overlay" />
        <Dialog.Content className="dashboard-dialog dashboard-dialog--ai">
          <div className="dashboard-dialog__topline">
            <div>
              <Dialog.Title className="dashboard-dialog__title">AI course draft</Dialog.Title>
              <Dialog.Description className="dashboard-dialog__subtitle">
                Shape a course brief, preview the structure, and keep it as a front-end concept.
                This does not create a real course yet.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="studio-icon-button studio-icon-button--plain"
                aria-label="Close AI draft dialog"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="dashboard-dialog__form">
            <label className="dashboard-field">
              <span>Course topic</span>
              <input
                value={form.topic}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topic: event.target.value }))
                }
                placeholder="For example: Forces in Motion"
                autoFocus
              />
            </label>

            <div className="dashboard-ai-presets" aria-label="AI topic presets">
              {aiCourseTopicPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="studio-chip"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      topic: preset,
                    }))
                  }
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="dashboard-dialog__grid">
              <label className="dashboard-field">
                <span>Target learner</span>
                <input
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, audience: event.target.value }))
                  }
                  placeholder="For example: middle school learners"
                />
              </label>

              <label className="dashboard-field">
                <span>Pacing</span>
                <select
                  value={form.pace}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pace: event.target.value as AICourseDraftPace,
                    }))
                  }
                >
                  <option value="quick">Quick start</option>
                  <option value="balanced">Balanced</option>
                  <option value="deep">Deep dive</option>
                </select>
              </label>
            </div>

            <label className="dashboard-field">
              <span>Learning outcome</span>
              <textarea
                rows={4}
                value={form.outcome}
                onChange={(event) =>
                  setForm((current) => ({ ...current, outcome: event.target.value }))
                }
                placeholder="For example: understand the basics, complete one guided practice, and leave with a clear next step."
              />
            </label>

            <section className="dashboard-ai-preview" data-testid="dashboard-ai-course-preview">
              <div className="dashboard-ai-preview__header">
                <span className="dashboard-ai-preview__badge">
                  <BrainCircuit size={14} />
                  AI preview
                </span>
                <small>Front-end only</small>
              </div>

              <h3>{preview.title}</h3>
              <p>{preview.summary}</p>

              <div className="dashboard-ai-preview__lessons">
                {preview.lessonTitles.map((lessonTitle, index) => (
                  <article key={`${lessonTitle}-${index}`} className="dashboard-ai-preview__lesson">
                    <span>{`Lesson ${index + 1}`}</span>
                    <strong>{lessonTitle}</strong>
                  </article>
                ))}
              </div>

              <div className="dashboard-ai-preview__note">
                <Bot size={15} />
                <span>{preview.coachNote}</span>
              </div>
            </section>

            <div className="dashboard-dialog__actions">
              <Dialog.Close asChild>
                <button type="button" className="studio-button studio-button--ghost">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="studio-button studio-button--ai"
                onClick={() => onUseDraft(preview)}
              >
                <BrainCircuit size={16} />
                <span>Use this brief</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dashboard-dialog__overlay" />
        <AlertDialog.Content className="dashboard-dialog dashboard-dialog--confirm">
          <AlertDialog.Title className="dashboard-dialog__title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dashboard-dialog__subtitle">
            {description}
          </AlertDialog.Description>
          <div className="dashboard-dialog__actions">
            <AlertDialog.Cancel asChild>
              <button type="button" className="studio-button studio-button--ghost" disabled={pending}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              className="studio-button studio-button--danger"
              onClick={() => void onConfirm()}
              disabled={pending}
            >
              {pending ? <Loader2 className="dashboard-spin" size={16} /> : null}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    void import('@/pages/editor/EditorPage');
  }, []);

  const activeTab = parseDashboardTab(searchParams.get('tab'));
  const { data: courses = [], isLoading, error, refetch, isRefetching } = useCourseList(user?.id);
  const analyticsQuery = useDashboardAnalytics(user?.id);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();
  const addLesson = useAddLesson();
  const removeLesson = useDeleteLesson();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [fansSearch, setFansSearch] = useState('');
  const [fansFilter, setFansFilter] = useState<FansFilter>('all');
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [courseForForm, setCourseForForm] = useState<CourseRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{
    course: CourseRow;
    lesson: CourseLessonRow;
    index: number;
  } | null>(null);

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

  const userId = user.id;
  const displayName = getDisplayName(user.email);

  const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const publishedCourses = courses.filter((course) => course.status === 'published').length;
  const draftCourses = courses.filter((course) => course.status === 'draft').length;
  const emptyCourses = courses.filter((course) => course.lessons.length === 0).length;
  const totalPremiumCourses = courses.filter((course) => course.price_tier === 'premium').length;
  const analytics = analyticsQuery.data ?? emptyDashboardAnalytics;
  const courseMetricsById = new Map(
    analytics.course_metrics.map((metric) => [metric.course_id, metric]),
  );
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const latestCourse = [...courses].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )[0] ?? null;
  const latestCourseMetric = latestCourse ? courseMetricsById.get(latestCourse.id) ?? null : null;
  const weeklyLearners = analytics.summary.weekly_learners;
  const totalStudyHours = analytics.summary.total_study_hours;
  const completionRate = analytics.summary.current_completion_rate;
  const completionDelta = analytics.summary.completion_delta_pct;
  const estimatedIncome = courses.length === 0
    ? 0
    : Math.max(18, totalPremiumCourses * 24 + publishedCourses * 12 + totalLessons * 2.5);
  const pendingIncome = estimatedIncome === 0 ? 0 : Math.max(6, Math.round(estimatedIncome * 0.3));
  const publishedViewers = analytics.summary.published_viewers;
  const averageCompletionRate = analytics.summary.average_completion_rate;
  const rankedCourses = analytics.course_metrics
    .map((metric) => {
      const course = coursesById.get(metric.course_id);
      if (!course) return null;

      return {
        ...course,
        ...metric,
        momentum: Math.round(metric.completion_rate * 100),
      };
    })
    .filter((course): course is NonNullable<typeof course> => course !== null);
  const publishedRankedCourses = rankedCourses.filter((course) => course.status === 'published');
  const topCourses = publishedRankedCourses.slice(0, 3);
  const publishedCourseRanking = publishedRankedCourses.slice(0, 5);

  const filteredCourses = courses.filter((course) => {
    if (statusFilter !== 'all' && course.status !== statusFilter) {
      return false;
    }

    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      course.title.toLowerCase().includes(query) ||
      (course.description ?? '').toLowerCase().includes(query) ||
      course.lessons.some((lesson) => lesson.title.toLowerCase().includes(query))
    );
  });

  const visibleCourses = [...filteredCourses].sort((left, right) => {
    if (sortMode === 'title') {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === 'lessons') {
      return (
        right.lessons.length - left.lessons.length ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'student') {
      return (
        (courseMetricsById.get(right.id)?.students ?? 0) - (courseMetricsById.get(left.id)?.students ?? 0) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    if (sortMode === 'comments') {
      return (
        (courseMetricsById.get(right.id)?.comments ?? 0) - (courseMetricsById.get(left.id)?.comments ?? 0) ||
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });

  const recentActivities = [
    latestCourse
      ? {
          title: latestCourse.title,
          description:
            latestCourse.status === 'published'
              ? latestCourseMetric && latestCourseMetric.views > 0
                ? `Published content has reached ${latestCourseMetric.views} real course views so far.`
                : 'Published content is live and waiting for the first verified learner views.'
              : 'The latest edit has synced back to the workspace and is ready for the next pass.',
          time: formatUpdatedAt(latestCourseMetric?.last_activity_at ?? latestCourse.updated_at),
          tone: 'amber' as const,
        }
      : {
          title: 'Start your first course',
          description: 'Create the course shell first, then refine lessons and publishing step by step.',
          time: 'Today',
          tone: 'amber' as const,
        },
    {
      title: 'New learners',
      description:
        weeklyLearners > 0
          ? `${weeklyLearners} learners interacted with your published content in the last 7 days.`
          : 'After you publish a course, new learners and recent interactions will show up here.',
      time: weeklyLearners > 0 ? 'Last 7 days' : 'Waiting for publish',
      tone: 'sage' as const,
    },
  ];

  const homeTrendLabels = analytics.home_daily_completion.length > 0
    ? analytics.home_daily_completion.map((entry) => formatShortDateLabel(entry.date))
    : buildRecentDayLabels(7);
  const completionTrendValues = analytics.home_daily_completion.length > 0
    ? analytics.home_daily_completion.map((entry) => Math.round(entry.completion_rate * 100))
    : homeTrendLabels.map(() => 0);
  const incomeTrendValues = [
    estimatedIncome * 0.35,
    estimatedIncome * 0.48,
    estimatedIncome * 0.6,
    estimatedIncome * 0.72,
    estimatedIncome * 0.83,
    estimatedIncome * 0.89,
    estimatedIncome * 0.77,
  ].map((value) => Math.round(value));
  const dataMonthLabels = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => formatMonthLabel(entry.month_start))
    : buildMonthLabels(6);
  const createdByMonth: number[] = dataMonthLabels.map((label) =>
    courses.filter((course) => {
      const createdAt = new Date(course.created_at);
      return `${createdAt.getMonth() + 1}/${String(createdAt.getFullYear()).slice(-2)}` === label;
    }).length,
  );
  const publishedByMonth: number[] = dataMonthLabels.map((label) =>
    courses.filter((course) => {
      if (course.status !== 'published') return false;
      if (!course.published_at) return false;
      const publishedAt = new Date(course.published_at);
      return `${publishedAt.getMonth() + 1}/${String(publishedAt.getFullYear()).slice(-2)}` === label;
    }).length,
  );

  const courseVolumeCreatedSeries =
    courses.length > 0 && createdByMonth.every((value) => value === 0)
      ? [...createdByMonth.slice(0, -1), courses.length]
      : createdByMonth;

  const learningProgressA = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => Math.round(entry.completion_rate * 100))
    : dataMonthLabels.map(() => 0);
  const learningProgressB = analytics.monthly_activity_completion.length > 0
    ? analytics.monthly_activity_completion.map((entry) => entry.active_learners)
    : dataMonthLabels.map(() => 0);

  const incomeProgress = dataMonthLabels.map((_, index) => {
    if (estimatedIncome === 0) return 0;
    return Math.round((estimatedIncome / dataMonthLabels.length) * (index + 1) * 0.8);
  });

  const typeBreakdownMap = new Map<string, number>();
  courses.forEach((course) => {
    const label = course.tags[0] || formatDifficulty(course.difficulty_level);
    typeBreakdownMap.set(label, (typeBreakdownMap.get(label) ?? 0) + 1);
  });

  const courseTypeItems = [...typeBreakdownMap.entries()]
    .map(([label, value], index) => ({
      label,
      value,
      color: chartPalette[index % chartPalette.length],
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 4);

  if (courseTypeItems.length === 0) {
    courseTypeItems.push({ label: 'Unassigned', value: 1, color: chartPalette[0] });
  }

  const fansGrowthSeries = [1, 2, 3, 1, 2, 3, 1];
  const fansRecords: Array<{ id: string; name: string; mode: FansFilter }> = [];
  const filteredFans = fansRecords.filter((fan) => {
    if (fansFilter !== 'all' && fan.mode !== fansFilter) return false;
    if (!fansSearch.trim()) return true;
    return fan.name.toLowerCase().includes(fansSearch.trim().toLowerCase());
  });

  function changeTab(tab: DashboardTab) {
    const next = new URLSearchParams(searchParams);
    if (tab === 'home') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  }

  function showInfo(text: string) {
    setNotice({ tone: 'info', text });
  }

  function handleUseAICourseDraft(preview: AICourseDraftPreview) {
    setAiDraftOpen(false);
    setNotice({
      tone: 'info',
      text: `"${preview.title}" is saved as an AI front-end brief only for now. Connect generation later to turn it into a real course shell.`,
    });
  }

  async function handleCreateCourse(payload: CourseFormPayload) {
    setFormError(null);

    try {
      const course = await createCourse.mutateAsync({
        ...payload,
        userId,
      });
      setFormMode(null);
      setCourseForForm(null);
      navigate(`/builder/editor/${course.id}`);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  }

  async function handleUpdateCourse(payload: CourseFormPayload) {
    if (!courseForForm) return;
    setFormError(null);

    try {
      await updateCourse.mutateAsync({
        ...payload,
        id: courseForForm.id,
        userId,
      });
      setFormMode(null);
      setCourseForForm(null);
      setNotice({ tone: 'success', text: 'Course details updated.' });
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  }

  async function handleDeleteCourse() {
    if (!courseToDelete) return;

    try {
      await deleteCourse.mutateAsync({ id: courseToDelete.id, userId });
      setCourseToDelete(null);
      setNotice({ tone: 'success', text: 'Course deleted.' });
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleDeleteLesson() {
    if (!lessonToDelete) return;

    try {
      await removeLesson.mutateAsync({
        courseId: lessonToDelete.course.id,
        lessonId: lessonToDelete.lesson.id,
        userId,
      });
      setLessonToDelete(null);
      setNotice({ tone: 'success', text: 'Lesson deleted.' });
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleDuplicateCourse(course: CourseRow) {
    setNotice(null);

    try {
      const result = await duplicateCourse.mutateAsync({ id: course.id, userId });
      navigate(`/builder/editor/${result.course.id}`);
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleAddLesson(course: CourseRow) {
    setNotice(null);

    try {
      await addLesson.mutateAsync({
        courseId: course.id,
        userId,
        title: `Lesson ${course.lessons.length + 1}`,
      });
      navigate(`/builder/editor/${course.id}`);
    } catch (submitError) {
      setNotice({ tone: 'error', text: getErrorMessage(submitError) });
    }
  }

  async function handleRefresh() {
    setNotice(null);
    const result = await refetch();
    if (result.error) {
      setNotice({ tone: 'error', text: getErrorMessage(result.error) });
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const hasNoResults = courses.length > 0 && visibleCourses.length === 0;
  const hasEmptyState = !isLoading && !error && courses.length === 0;
  const hasInlineError = Boolean(error && courses.length > 0);
  const analyticsErrorNotice = analyticsQuery.error ? (
    <section className="studio-inline-notice studio-inline-notice--error">
      <p>{`Learner analytics are unavailable right now. ${getErrorMessage(analyticsQuery.error)}`}</p>
      <button type="button" aria-label="Reload analytics" onClick={() => void analyticsQuery.refetch()}>
        <RefreshCcw size={14} />
      </button>
    </section>
  ) : null;

  return (
    <div className="dashboard-studio">
      <div className="dashboard-studio__layout">
        <aside className="studio-sidebar">
          <button type="button" className="studio-sidebar__brand" onClick={() => navigate('/')}>
            <span className="studio-sidebar__brand-mark">
              <img src="/primoria-logo.png" alt="" aria-hidden="true" />
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
          <header className="studio-main__topbar">
            <div className="studio-main__topbar-actions">
              <AccountMenu
                buttonClassName="studio-avatar-button"
                imageClassName="studio-avatar-button__image"
                onSignOut={handleSignOut}
                user={user}
              />
            </div>
          </header>

          {notice ? (
            <section className={`studio-inline-notice studio-inline-notice--${notice.tone}`}>
              <p>{notice.text}</p>
              <button type="button" aria-label="Dismiss notice" onClick={() => setNotice(null)}>
                <X size={14} />
              </button>
            </section>
          ) : null}

          <div className="studio-main__content">
            {activeTab === 'home' ? (
              <>
                {analyticsErrorNotice}

                <section className="studio-welcome-card studio-card studio-card--mist">
                  <div className="studio-welcome-card__copy">
                    <p className="studio-overline">HOME</p>
                    <h1>Good evening, {displayName} 👋</h1>
                    <p>Welcome back. Keep shaping your course pipeline and release cadence.</p>
                  </div>

                  <div className="studio-welcome-card__actions">
                    <button
                      type="button"
                      className="studio-button studio-button--primary"
                      onClick={() => {
                        setFormError(null);
                        setCourseForForm(null);
                        setFormMode('create');
                      }}
                    >
                      <Plus size={16} />
                      <span>Create new course</span>
                    </button>
                    <button
                      type="button"
                      className="studio-button studio-button--secondary"
                      onClick={() => {
                        if (latestCourse) {
                          navigate(`/builder/editor/${latestCourse.id}`);
                          return;
                        }
                        changeTab('course');
                        showInfo('Create a course first, then continue editing.');
                      }}
                    >
                      <Pencil size={16} />
                      <span>Continue editing</span>
                    </button>
                    <button
                      type="button"
                      className="studio-button studio-button--ghost"
                      onClick={() => changeTab('data')}
                    >
                      <BarChart3 size={16} />
                      <span>View analytics</span>
                    </button>
                  </div>
                </section>

                <section className="studio-home-grid">
                  <div className="studio-home-grid__main">
                    <section className="studio-card studio-panel">
                      <div className="studio-panel__header">
                        <div>
                          <h2>Learning overview</h2>
                          <p>Track completion, learner volume, and content momentum in one view.</p>
                        </div>
                      </div>

                      <div className="studio-split-metrics">
                        <MetricCard icon={Users} label="Weekly learners" value={weeklyLearners} tone="mist" />
                        <MetricCard icon={Clock3} label="Total study hours" value={`${totalStudyHours}h`} tone="sage" />
                      </div>

                      <div className="studio-chart-card__meta">
                        <span>Completion trend: {(completionRate * 100).toFixed(1)}%</span>
                        <strong>{formatSignedDelta(completionDelta)} vs last week</strong>
                      </div>

                      <TrendChart
                        labels={homeTrendLabels}
                        series={[
                          {
                            name: 'Completion',
                            values: completionTrendValues,
                            color: '#7a9e7e',
                            fillColor: 'rgba(122, 158, 126, 0.16)',
                          },
                        ]}
                      />
                    </section>

                    <section className="studio-card studio-panel">
                      <div className="studio-panel__header">
                        <div>
                          <h2>Top courses</h2>
                          <p>Ranked by engagement and overall course completion quality.</p>
                        </div>
                      </div>

                      {topCourses.length > 0 ? (
                        <div className="studio-top-course-list">
                          {topCourses.map((course) => (
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
                                <p>Views: {course.views} · Students: {course.students}</p>
                                <div className="studio-progress">
                                  <span style={{ width: `${course.momentum}%` }} />
                                </div>
                              </div>

                              <button
                                type="button"
                                className="studio-link-button"
                                onClick={() => navigate(`/builder/editor/${course.id}`)}
                              >
                                View course
                              </button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="studio-empty-card studio-empty-card--soft">
                          <BookOpen size={22} />
                          <div>
                            <strong>No course performance data yet</strong>
                            <p>Create content first and the workspace will start surfacing course signals.</p>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="studio-home-grid__aside">
                    <section className="studio-card studio-panel">
                      <div className="studio-panel__header">
                        <div>
                          <h2>Recent activity</h2>
                          <p>A compact feed of important course updates and learner signals.</p>
                        </div>
                        <button
                          type="button"
                          className="studio-link-button"
                          onClick={() => changeTab('course')}
                        >
                          View all
                        </button>
                      </div>

                      <div className="studio-activity-list">
                        {recentActivities.map((activity) => (
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
                          <h2>Revenue overview</h2>
                          <p>Reserved for paid courses, conversions, and pending payout tracking.</p>
                        </div>
                      </div>

                      <div className="studio-split-metrics">
                        <MetricCard icon={CircleDollarSign} label="Revenue this month" value={formatCurrency(Math.max(20, estimatedIncome))} tone="amber" />
                        <MetricCard icon={BadgeCheck} label="Pending payout" value={formatCurrency(Math.max(6, pendingIncome))} tone="sage" />
                      </div>

                      <TrendChart
                        labels={homeWeekLabels}
                        series={[
                          {
                            name: 'Income',
                            values: incomeTrendValues,
                            color: '#c4956a',
                            fillColor: 'rgba(196, 149, 106, 0.14)',
                          },
                        ]}
                      />
                    </section>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === 'course' ? (
              <>
                <PageHeader
                  eyebrow="COURSE MANAGEMENT"
                  title="Course management workspace"
                  description="Manage courses, lessons, and publish status from a single calm surface."
                  actions={(
                    <>
                      <button
                        type="button"
                        className="studio-button studio-button--ai"
                        onClick={() => setAiDraftOpen(true)}
                      >
                        <BrainCircuit size={16} />
                        <span>Create with AI</span>
                      </button>

                      <button
                        type="button"
                        className="studio-button studio-button--primary"
                        onClick={() => {
                          setFormError(null);
                          setCourseForForm(null);
                          setFormMode('create');
                        }}
                      >
                        <Plus size={16} />
                        <span>Create course</span>
                      </button>

                      <button
                        type="button"
                        className="studio-icon-button"
                        aria-label="Refresh course list"
                        onClick={() => void handleRefresh()}
                        disabled={isRefetching}
                      >
                        {isRefetching ? <Loader2 className="dashboard-spin" size={16} /> : <RefreshCcw size={16} />}
                      </button>
                    </>
                  )}
                />

                <section className="studio-summary-strip">
                  <MetricCard icon={BookCopy} label="Courses" value={courses.length} tone="mist" />
                  <MetricCard icon={BookText} label="Lessons" value={totalLessons} tone="sage" />
                  <MetricCard icon={ArrowUpRight} label="Published" value={publishedCourses} tone="amber" />
                  <MetricCard icon={LayoutGrid} label="Drafts" value={draftCourses} tone="lavender" />
                  <MetricCard icon={TriangleAlert} label="Needs content" value={emptyCourses} tone="sky" />
                </section>

                <section className="studio-controls-card studio-card studio-card--soft">
                  <label className="studio-search">
                    <Search size={16} />
                    <input
                      aria-label="Search courses"
                      placeholder="Search courses, descriptions, or lesson titles..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    {search ? (
                      <button
                        type="button"
                        className="studio-search__clear"
                        aria-label="Clear search"
                        onClick={() => setSearch('')}
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
                        className={`studio-chip ${statusFilter === filter.value ? 'is-active' : ''}`}
                        onClick={() => setStatusFilter(filter.value)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <label className="studio-sort">
                    <span>Sort</span>
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                      <option value="updated">Recently updated</option>
                      <option value="lessons">Most lessons</option>
                      <option value="student">Most students</option>
                      <option value="comments">Most comments</option>
                      <option value="title">Course title</option>
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </section>

                {hasInlineError ? (
                  <section className="studio-inline-notice studio-inline-notice--error">
                    <p>{getErrorMessage(error)}</p>
                    <button type="button" aria-label="Reload" onClick={() => void handleRefresh()}>
                      <RefreshCcw size={14} />
                    </button>
                  </section>
                ) : null}

                {analyticsErrorNotice}

                {isLoading && courses.length === 0 ? (
                  <section className="studio-card studio-empty-state">
                    <Loader2 className="dashboard-spin studio-empty-state__spinner" size={34} />
                    <h2>Loading courses…</h2>
                    <p>Syncing course and lesson data.</p>
                  </section>
                ) : null}

                {!isLoading && error && courses.length === 0 ? (
                  <section className="studio-card studio-empty-state">
                    <TriangleAlert size={38} />
                    <h2>Couldn&apos;t load the workspace</h2>
                    <p>{getErrorMessage(error)}</p>
                    <button
                      type="button"
                      className="studio-button studio-button--primary"
                      onClick={() => void handleRefresh()}
                    >
                      <RefreshCcw size={16} />
                      <span>Reload</span>
                    </button>
                  </section>
                ) : null}

                {hasEmptyState ? (
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
                        onClick={() => setAiDraftOpen(true)}
                      >
                        <BrainCircuit size={16} />
                        <span>Create with AI</span>
                      </button>
                      <button
                        type="button"
                        className="studio-button studio-button--primary"
                        onClick={() => {
                          setFormError(null);
                          setCourseForForm(null);
                          setFormMode('create');
                        }}
                      >
                        <Plus size={16} />
                        <span>Create course</span>
                      </button>
                    </div>
                  </section>
                ) : null}

                {hasNoResults ? (
                  <section className="studio-card studio-empty-state">
                    <Search size={34} />
                    <h2>No matching courses</h2>
                    <p>Try clearing the query or switching filters.</p>
                    <button
                      type="button"
                      className="studio-button studio-button--secondary"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                      }}
                    >
                      <RefreshCcw size={16} />
                      <span>Clear filters</span>
                    </button>
                  </section>
                ) : null}

                {visibleCourses.length > 0 ? (
                  <section className="studio-course-list" aria-label="Course list">
                    {visibleCourses.map((course) => {
                      return (
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
                                    setFormError(null);
                                    setCourseForForm(course);
                                    setFormMode('edit');
                                  }}
                                >
                                  <Pencil size={16} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="studio-button studio-button--ghost"
                                  onClick={() => void handleDuplicateCourse(course)}
                                  disabled={duplicateCourse.isPending}
                                >
                                  {duplicateCourse.isPending ? <Loader2 className="dashboard-spin" size={16} /> : <Copy size={16} />}
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  type="button"
                                  className="studio-button studio-button--danger-soft"
                                  onClick={() => setCourseToDelete(course)}
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
                              <span className="studio-meta-chip">{formatDifficulty(course.difficulty_level)}</span>
                              <span className="studio-meta-chip">{formatDuration(course.estimated_minutes)}</span>
                              <span className="studio-meta-chip">{formatPrice(course)}</span>
                              <span className="studio-meta-chip">{course.lessons.length} lessons</span>
                              <span className="studio-meta-chip">{courseMetricsById.get(course.id)?.students ?? 0} students</span>
                              <span className="studio-meta-chip">{courseMetricsById.get(course.id)?.comments ?? 0} comments</span>
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
                                          setNotice({
                                            tone: 'error',
                                            text: 'A course must keep at least one lesson.',
                                          });
                                          return;
                                        }
                                        setLessonToDelete({ course, lesson, index });
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </article>
                                ))}

                                <button
                                  type="button"
                                  className="studio-lesson-tile studio-lesson-tile--add"
                                  onClick={() => void handleAddLesson(course)}
                                  disabled={addLesson.isPending}
                                >
                                  {addLesson.isPending ? <Loader2 className="dashboard-spin" size={18} /> : <BookPlus size={18} />}
                                  <strong>Add lesson</strong>
                                  <small>Create a new lesson shell and continue refining it in the editor.</small>
                                </button>
                              </div>
                            </section>
                          </div>
                        </article>
                      );
                    })}
                  </section>
                ) : null}
              </>
            ) : null}

            {activeTab === 'data' ? (
              <>
                {analyticsErrorNotice}

                <PageHeader
                  eyebrow="DATA CENTER"
                  title="Data center overview"
                  description="Track course creation, publishing, revenue, and learning quality."
                  actions={(
                    <button
                      type="button"
                      className="studio-button studio-button--secondary"
                      onClick={() => showInfo('Report export is not available yet.')}
                    >
                      <Download size={16} />
                      <span>Export report</span>
                    </button>
                  )}
                />

                <section className="studio-summary-strip">
                  <MetricCard icon={BookCopy} label="Total courses" value={courses.length} tone="mist" detail={`Draft ${draftCourses} · Archived ${courses.filter((course) => course.status === 'archived').length}`} />
                  <MetricCard icon={ArrowUpRight} label="Published courses" value={publishedCourses} tone="sage" detail={courses.length > 0 ? `${Math.round((publishedCourses / courses.length) * 100)}% publish rate` : '0% publish rate'} />
                  <MetricCard icon={Activity} label="Published viewers" value={publishedViewers} tone="amber" />
                  <MetricCard icon={BadgeCheck} label="Average completion" value={`${(averageCompletionRate * 100).toFixed(1)}%`} tone="sky" />
                  <MetricCard icon={CircleDollarSign} label="Estimated monthly revenue" value={formatCurrency(estimatedIncome)} tone="lavender" detail="Estimated from pricing and audience scale" />
                </section>

                <section className="studio-analytics-grid">
                  <article className="studio-card studio-panel">
                    <div className="studio-panel__header">
                      <div>
                        <h2>Course volume trend</h2>
                        <p>Monthly counts for newly created and published courses.</p>
                      </div>
                    </div>

                    <div className="studio-legend">
                      <span><i style={{ backgroundColor: '#7a9e7e' }} /> Created</span>
                      <span><i style={{ backgroundColor: '#c4956a' }} /> Published</span>
                    </div>

                    <TrendChart
                      labels={dataMonthLabels}
                      series={[
                          {
                            name: 'Created',
                            values: courseVolumeCreatedSeries,
                            color: '#7a9e7e',
                            fillColor: 'rgba(122, 158, 126, 0.12)',
                          },
                        {
                          name: 'Published',
                          values: publishedByMonth,
                          color: '#c4956a',
                        },
                      ]}
                    />
                  </article>

                  <article className="studio-card studio-panel">
                    <div className="studio-panel__header">
                      <div>
                        <h2>Course type distribution</h2>
                        <p>Share of courses by topic or tag.</p>
                      </div>
                    </div>
                    <DonutChart items={courseTypeItems} />
                  </article>

                  <article className="studio-card studio-panel">
                    <div className="studio-panel__header">
                      <div>
                        <h2>Revenue trend</h2>
                        <p>Estimated revenue over time based on pricing and audience scale.</p>
                      </div>
                    </div>

                    <TrendChart
                      labels={dataMonthLabels}
                      series={[
                        {
                          name: 'Income',
                          values: incomeProgress,
                          color: '#c4956a',
                          fillColor: 'rgba(196, 149, 106, 0.12)',
                        },
                      ]}
                      formatLabel={(value) => `${value}`}
                    />
                  </article>

                  <article className="studio-card studio-panel">
                    <div className="studio-panel__header">
                      <div>
                        <h2>Learning progress tracking</h2>
                        <p>Compare overall completion rate and learner activity over time.</p>
                      </div>
                    </div>

                    <div className="studio-legend">
                      <span><i style={{ backgroundColor: '#7a9e7e' }} /> Completion</span>
                      <span><i style={{ backgroundColor: '#a99ab4' }} /> Activity</span>
                    </div>

                    <TrendChart
                      labels={dataMonthLabels}
                      series={[
                        {
                          name: 'Completion',
                          values: learningProgressA,
                          color: '#7a9e7e',
                          fillColor: 'rgba(122, 158, 126, 0.12)',
                        },
                        {
                          name: 'Activity',
                          values: learningProgressB,
                          color: '#a99ab4',
                        },
                      ]}
                    />
                  </article>
                </section>

                <section className="studio-data-bottom">
                  <article className="studio-card studio-panel studio-panel--compact">
                    <div className="studio-panel__header">
                      <div>
                        <h2>Published course viewers</h2>
                        <p>Real viewer totals across published courses ranked by live learner demand.</p>
                      </div>
                    </div>

                    {publishedCourseRanking.length > 0 ? (
                      <div className="studio-data-list">
                        {publishedCourseRanking.map((course) => (
                          <div key={course.id} className="studio-data-list__row">
                            <span>{course.title}</span>
                            <strong>{course.views}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="studio-panel__empty">No data yet</p>
                    )}
                  </article>
                </section>
              </>
            ) : null}

            {activeTab === 'fans' ? (
              <>
                <PageHeader
                  eyebrow="FANS MANAGEMENT"
                  title="Fan management"
                  description="Review follower growth, segment active users, and reserve space for outreach."
                  actions={(
                    <>
                      <button
                        type="button"
                        className="studio-button studio-button--ghost"
                        onClick={() => showInfo('Notifications will be enabled once real fan data is connected.')}
                        disabled
                      >
                        <Bell size={16} />
                        <span>Send notice (0)</span>
                      </button>
                      <button
                        type="button"
                        className="studio-button studio-button--secondary"
                        onClick={() => showInfo('Fan export will be enabled once real fan data is connected.')}
                      >
                        <Download size={16} />
                        <span>Export data</span>
                      </button>
                    </>
                  )}
                />

                <section className="studio-card studio-panel studio-card--mist">
                  <div className="studio-split-metrics">
                    <MetricCard icon={Users} label="Total fans" value={0} tone="mist" />
                    <MetricCard icon={Activity} label="New fans this week" value={0} tone="sage" detail="+0.0%" />
                  </div>

                  <div className="studio-panel__subheader">
                    <span>Fan growth trend</span>
                  </div>

                  <TrendChart
                    labels={fansWeekLabels}
                    series={[
                      {
                        name: 'Fans',
                        values: fansGrowthSeries,
                        color: '#7a9e7e',
                        fillColor: 'rgba(122, 158, 126, 0.14)',
                      },
                    ]}
                  />
                </section>

                <section className="studio-controls-card studio-card studio-card--soft studio-controls-card--fans">
                  <label className="studio-search">
                    <Search size={16} />
                    <input
                      aria-label="Search fans"
                      placeholder="Search user names..."
                      value={fansSearch}
                      onChange={(event) => setFansSearch(event.target.value)}
                    />
                    {fansSearch ? (
                      <button
                        type="button"
                        className="studio-search__clear"
                        aria-label="Clear fan search"
                        onClick={() => setFansSearch('')}
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </label>

                  <div className="studio-chip-group" aria-label="Fan filters">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'active', label: 'Highly active' },
                      { value: 'need-help', label: 'Needs help' },
                    ] as const).map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        className={`studio-chip ${fansFilter === filter.value ? 'is-active' : ''}`}
                        onClick={() => setFansFilter(filter.value)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </section>

                {filteredFans.length === 0 ? (
                  <section className="studio-card studio-empty-state studio-empty-state--left">
                    <Leaf size={28} />
                    <h2>No fans yet? Share your courses to start attracting learners.</h2>
                    <p>After publishing, follows, comments, and learning signals will gather here.</p>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        </main>
      </div>

      <CourseFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        course={courseForForm}
        pending={createCourse.isPending || updateCourse.isPending}
        error={formError}
        onOpenChange={(open) => {
          if (open) return;
          setFormMode(null);
          setCourseForForm(null);
          setFormError(null);
        }}
        onSubmit={(payload) =>
          formMode === 'edit' ? handleUpdateCourse(payload) : handleCreateCourse(payload)
        }
      />

      <AICourseDraftDialog
        open={aiDraftOpen}
        onOpenChange={setAiDraftOpen}
        onUseDraft={handleUseAICourseDraft}
      />

      <ConfirmDialog
        open={courseToDelete !== null}
        title="Delete course"
        description={
          courseToDelete
            ? `Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete course"
        pending={deleteCourse.isPending}
        onOpenChange={(open) => {
          if (!open) setCourseToDelete(null);
        }}
        onConfirm={handleDeleteCourse}
      />

      <ConfirmDialog
        open={lessonToDelete !== null}
        title="Delete lesson"
        description={
          lessonToDelete
            ? `Are you sure you want to delete lesson ${lessonToDelete.index + 1}, "${lessonToDelete.lesson.title}"?`
            : ''
        }
        confirmLabel="Delete lesson"
        pending={removeLesson.isPending}
        onOpenChange={(open) => {
          if (!open) setLessonToDelete(null);
        }}
        onConfirm={handleDeleteLesson}
      />
    </div>
  );
}

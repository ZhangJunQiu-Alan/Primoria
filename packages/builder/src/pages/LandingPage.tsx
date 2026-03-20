import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Blocks,
  Bot,
  CheckCircle2,
  Clock3,
  Layers3,
  MessageSquare,
  PenTool,
  Rocket,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import './landing.css';

type Tone = 'sage' | 'amber' | 'clay' | 'lavender';

interface CapabilityPill {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

interface HeroMetric {
  value: string;
  label: string;
  delta: string;
}

interface FeatureCardData {
  badge: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
}

interface WorkflowStepData {
  step: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const capabilityPills: CapabilityPill[] = [
  { label: 'Drag-and-drop course flow', icon: Layers3, tone: 'sage' },
  { label: 'AI one-line course drafting', icon: Sparkles, tone: 'lavender' },
  { label: 'Live preview and publish', icon: Rocket, tone: 'amber' },
  { label: 'Learner feedback insights', icon: BarChart3, tone: 'clay' },
];

const heroMetrics: HeroMetric[] = [
  { value: '48 min', label: 'Avg build time', delta: '-12%' },
  { value: '92%', label: 'Learner completion', delta: '+8.4%' },
  { value: '132', label: 'New learners', delta: '+26' },
  { value: '4x', label: 'Boosted income', delta: '+1.2x' },
];

const featureCards: FeatureCardData[] = [
  {
    badge: 'Guided',
    title: 'Course builder that feels like play',
    subtitle: 'Drag blocks, remix templates, and keep the publishing loop short.',
    icon: Blocks,
    tone: 'sage',
  },
  {
    badge: 'Feedback',
    title: 'Community feedback loops',
    subtitle: 'Turn comments into structured improvements with clear author signals.',
    icon: MessageSquare,
    tone: 'clay',
  },
  {
    badge: 'Momentum',
    title: 'Daily sprints for authors',
    subtitle: 'Keep course production moving with reusable systems and calm rituals.',
    icon: Clock3,
    tone: 'amber',
  },
];

const workflowSteps: WorkflowStepData[] = [
  {
    step: '01',
    title: 'Compose the course graph',
    subtitle: 'Start from a template and shape lessons with visual blocks instead of fragile docs.',
    icon: PenTool,
  },
  {
    step: '02',
    title: 'Let AI expand the draft',
    subtitle: 'Generate explanations, exercises, and challenge ramps from a single author brief.',
    icon: Bot,
  },
  {
    step: '03',
    title: 'Publish and track momentum',
    subtitle: 'Ship to Viewer and monitor completion, streaks, and learner feedback from one place.',
    icon: Workflow,
  },
];

const workbenchNodes = [
  { title: 'Intro Module', subtitle: 'Interactive Visual + warm-up quiz', tone: 'sage' as Tone },
  { title: 'Practice Stage', subtitle: 'Code task + hint ladder', tone: 'lavender' as Tone },
  { title: 'Assessment', subtitle: 'Adaptive challenge checkpoint', tone: 'amber' as Tone },
];

const aiSuggestions = [
  { title: 'Rewrite intro', subtitle: 'Make the hook more playful' },
  { title: 'Add challenge', subtitle: 'Turn practice into 2-step task' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { loading } = useAppSelector((s) => s.auth);

  const statusLabel = loading
    ? 'Checking session'
    : 'Sign in or register to continue';

  function handlePrimaryAction() {
    navigate('/login');
  }

  function handleSecondaryAction() {
    navigate('/register');
  }

  return (
    <div className="landing-page">
      <div className="landing-shell">
        <header className="landing-topbar">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="landing-topbar__brand"
            aria-label="Primoria home"
          >
            <span className="landing-topbar__brand-mark">
              <img
                src="/primoria-logo.png"
                alt=""
                className="landing-topbar__brand-image"
                aria-hidden="true"
              />
            </span>
            <span className="landing-topbar__brand-text">Primoria</span>
          </button>

          <nav className="landing-topbar__nav" aria-label="Landing sections">
            <a href="#capabilities">Capabilities</a>
            <a href="#workflow">Workflow</a>
            <a href="#launch">Launch</a>
          </nav>

          <div className="landing-topbar__actions">
            <span className="landing-status-pill">{statusLabel}</span>
            <LandingButton
              label="Sign in"
              variant="secondary"
              onClick={handlePrimaryAction}
            />
            <LandingButton
              label="Register"
              variant="primary"
              onClick={handleSecondaryAction}
            />
          </div>
        </header>

        <main>
          <section className="landing-hero" aria-labelledby="landing-hero-title">
            <div className="landing-hero__copy">
              <div className="landing-hero__tags">
                <Tag label="Learn by teaching" icon={Sparkles} tone="sage" />
                <Tag label="AI-native workflow" icon={Bot} tone="lavender" />
              </div>

              <p className="landing-overline">Builder landing</p>
              <h1 id="landing-hero-title" className="landing-hero__title">
                If you want to master something, <em>teach it.</em>
              </h1>
              <p className="landing-hero__summary">
                Build courses, share insights, and turn curiosity into a daily habit. Primoria
                blends Brilliant-style exploration with Duolingo-like momentum for authors.
              </p>

              <div className="landing-capability-grid">
                {capabilityPills.map((capability) => (
                  <CapabilityCard key={capability.label} capability={capability} />
                ))}
              </div>

              <div className="landing-hero__actions">
                <LandingButton
                  label="Sign in"
                  variant="primary"
                  icon={ArrowRight}
                  onClick={handlePrimaryAction}
                />
                <LandingButton
                  label="Register"
                  variant="ghost"
                  onClick={handleSecondaryAction}
                />
              </div>

              <p className="landing-hero__footnote">
                Calm information architecture, live route wiring, and a visual system ready to
                scale into auth, dashboard, and editor screens.
              </p>
            </div>

            <aside className="landing-hero-card" aria-label="Builder workbench preview">
              <div className="landing-hero-card__header">
                <div>
                  <p className="landing-hero-card__eyebrow">Today&apos;s Teaching Sprint</p>
                  <h2 className="landing-hero-card__title">
                    Build, preview, and publish in one botanical workspace.
                  </h2>
                  <p className="landing-hero-card__summary">
                    Create a bite-sized lesson, refine it with AI, and ship it without losing your
                    calm.
                  </p>
                </div>
                <Tag label="Live sync" icon={BadgeCheck} tone="sage" compact />
              </div>

              <WorkbenchPreview />

              <div className="landing-metric-grid">
                {heroMetrics.map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>
            </aside>
          </section>

          <section
            id="capabilities"
            className="landing-section"
            aria-labelledby="capabilities-title"
          >
            <SectionHeading
              id="capabilities-title"
              eyebrow="Capabilities"
              title="A builder that feels crafted, not cobbled together."
              description="The React landing page now mirrors the Flutter builder structure while adopting the botanical design language as the new presentation layer."
            />

            <div className="landing-feature-grid">
              {featureCards.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>
          </section>

          <section id="workflow" className="landing-section" aria-labelledby="workflow-title">
            <div className="landing-workflow-band">
              <div className="landing-workflow-band__intro">
                <p className="landing-workflow-band__eyebrow">Builder workflow</p>
                <h2 id="workflow-title" className="landing-workflow-band__title">
                  From concept to publishing in one calm flow.
                </h2>
                <p className="landing-workflow-band__summary">
                  Unify planning, production, and analytics so authors can stay in one workspace
                  instead of stitching tools together.
                </p>
              </div>

              <div className="landing-workflow-list">
                {workflowSteps.map((step) => (
                  <WorkflowStepCard key={step.step} step={step} />
                ))}
              </div>
            </div>
          </section>

          <section id="launch" className="landing-section">
            <div className="landing-cta-band">
              <div className="landing-cta-band__copy">
                <p className="landing-cta-band__eyebrow">Ready to launch?</p>
                <h2 className="landing-cta-band__title">Bring your expertise. Let Primoria handle the rest.</h2>
                <p className="landing-cta-band__summary">
                  Start with the landing page today, then carry the same system into auth,
                  dashboard, and editor views without resetting the design language.
                </p>
              </div>

              <LandingButton
                label="Sign in"
                variant="primary"
                icon={ArrowRight}
                onClick={handlePrimaryAction}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="landing-section-heading">
      <p className="landing-section-heading__eyebrow">{eyebrow}</p>
      <h2 id={id} className="landing-section-heading__title">
        {title}
      </h2>
      <p className="landing-section-heading__description">{description}</p>
    </header>
  );
}

function LandingButton({
  label,
  onClick,
  variant,
  icon: Icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`landing-button landing-button--${variant}`}
      disabled={disabled}
    >
      <span>{label}</span>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
    </button>
  );
}

function Tag({
  label,
  icon: Icon,
  tone,
  compact = false,
}: {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  compact?: boolean;
}) {
  return (
    <span
      className={`landing-tag${compact ? ' landing-tag--compact' : ''}`}
      data-tone={tone}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function CapabilityCard({ capability }: { capability: CapabilityPill }) {
  const Icon = capability.icon;

  return (
    <article className="landing-capability-card" data-tone={capability.tone}>
      <span className="landing-capability-card__icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>{capability.label}</span>
    </article>
  );
}

function MetricCard({ metric }: { metric: HeroMetric }) {
  return (
    <article className="landing-metric-card">
      <strong className="landing-metric-card__value">{metric.value}</strong>
      <span className="landing-metric-card__label">{metric.label}</span>
      <span className="landing-metric-card__delta">{metric.delta}</span>
    </article>
  );
}

function FeatureCard({ feature }: { feature: FeatureCardData }) {
  const Icon = feature.icon;

  return (
    <article className="landing-feature-card" data-tone={feature.tone}>
      <div className="landing-feature-card__header">
        <span className="landing-feature-card__icon">
          <Icon size={19} aria-hidden="true" />
        </span>
        <span className="landing-feature-card__badge">{feature.badge}</span>
      </div>
      <h3 className="landing-feature-card__title">{feature.title}</h3>
      <p className="landing-feature-card__summary">{feature.subtitle}</p>
    </article>
  );
}

function WorkflowStepCard({ step }: { step: WorkflowStepData }) {
  const Icon = step.icon;

  return (
    <article className="landing-workflow-step">
      <div className="landing-workflow-step__meta">
        <span className="landing-workflow-step__number">{step.step}</span>
        <span className="landing-workflow-step__icon">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <div>
        <h3 className="landing-workflow-step__title">{step.title}</h3>
        <p className="landing-workflow-step__summary">{step.subtitle}</p>
      </div>
    </article>
  );
}

function WorkbenchPreview() {
  return (
    <div className="landing-workbench">
      <div className="landing-workbench__topbar">
        <div className="landing-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="landing-workbench__tab">frontend-basics / module-01</div>
        <div className="landing-workbench__status">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>Publish-ready 92%</span>
        </div>
      </div>

      <div className="landing-workbench__body">
        <aside className="landing-workbench__sidebar">
          {['Flow', 'Quiz', 'Code', 'Media'].map((label) => (
            <span key={label} className="landing-workbench__sidebar-tag">
              {label}
            </span>
          ))}
        </aside>

        <section className="landing-workbench__canvas">
          <div className="landing-workbench__canvas-top">
            <div className="landing-workbench__canvas-title">lesson-structure.json</div>
            <div className="landing-workbench__canvas-chips">
              <span className="landing-mini-chip">Draft</span>
              <span className="landing-mini-chip landing-mini-chip--outline">Preview</span>
            </div>
          </div>

          <div className="landing-workbench__nodes">
            {workbenchNodes.map((node) => (
              <article key={node.title} className="landing-node-card" data-tone={node.tone}>
                <strong>{node.title}</strong>
                <span>{node.subtitle}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="landing-workbench__assistant">
          <p className="landing-workbench__assistant-title">AI co-pilot</p>
          <div className="landing-workbench__assistant-list">
            {aiSuggestions.map((suggestion) => (
              <article key={suggestion.title} className="landing-assist-card">
                <strong>{suggestion.title}</strong>
                <span>{suggestion.subtitle}</span>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

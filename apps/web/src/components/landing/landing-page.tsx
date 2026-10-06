"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FlowStageVisual } from "@/components/landing/flow-stage-visual";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PUBLIC_LANDING_PATH } from "@/lib/auth/routes";
import { useT } from "@/lib/i18n/client";

const SUBJECT_NAMES = [
  "Calculus",
  "Linear Algebra",
  "Discrete Math",
  "Data Structures",
  "Computer Networks",
  "Machine Learning",
  "Physics",
  "Chemistry",
  "Biology",
];

/** Index of the stage shown before the visitor picks one (the generated lesson). */
const DEFAULT_FLOW_STAGE = 2;

/** Tint/ink pairs rotated across cards; the same four series the learning objects use. */
const TINTS = ["pine", "amber", "rose", "lavender"] as const;

const DOMAIN_GLYPHS = [
  "M4 34C14 34 18 6 28 6S42 34 52 34",
  "M28 6v10M28 16L14 28M28 16l14 12M10 28h8v8h-8zM38 28h8v8h-8zM24 2h8v8h-8z",
  "M8 8v24M28 4v32M48 12v16M8 8L28 4M8 8l20 16M8 32L28 24M8 32l20 4M28 4l20 8M28 24l20-12M28 24l20 4M28 36l20-8",
  "M24 20a4 4 0 1 0 8 0a4 4 0 1 0-8 0M6 20c0-6 10-10 22-10s22 4 22 10-10 10-22 10S6 26 6 20z",
];

const BLOCK_ICONS = [
  "M6 7h16M6 12h16M6 17h10M6 22h12",
  "M14 4a7 7 0 0 0-4 12.7V20h8v-3.3A7 7 0 0 0 14 4zM11 24h6",
  "M4 22c4 0 6-12 10-12s6 8 10 8M4 4v20h20",
  "M10 8l-6 6 6 6M18 8l6 6-6 6M16 5l-4 18",
  "M4 14h16M14 8l6 6-6 6M24 4v20",
  "M6 14l5 5 11-12",
];

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function LandingPage() {
  const t = useT();
  const flowStages = t.landing.flowStages;
  const [activeStage, setActiveStage] = useState(DEFAULT_FLOW_STAGE);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stage = flowStages[activeStage] ?? flowStages[DEFAULT_FLOW_STAGE];

  // Roving-tabindex keyboard support for the tablist: arrows move between
  // stages, Home/End jump to the ends, and focus follows selection.
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = flowStages.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? lastIndex : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = lastIndex;
    if (next === null) return;
    event.preventDefault();
    setActiveStage(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="landing-shell">
      <header className="landing-nav" aria-label="Primoria landing navigation">
        <Link href={PUBLIC_LANDING_PATH} className="landing-brand" aria-label="Primoria home">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="7" cy="19" r="4" fill="#c8881a" />
            <circle cx="19" cy="7" r="4" fill="#1e4d40" />
            <path d="M9.5 16.5 16.5 9.5" stroke="#1a1814" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{t.common.brand}</span>
        </Link>
        <nav className="landing-nav-links" aria-label="Landing sections">
          <a href="#product">{t.landing.navProduct}</a>
          <a href="#stem">{t.landing.navStem}</a>
          <a href="#how-it-works">{t.landing.navPath}</a>
        </nav>
        <div className="landing-nav-actions">
          <LanguageSwitcher className="landing-language-switcher" />
          <Link href="/auth/sign-in?next=/">{t.landing.login}</Link>
          <Link href="/auth/sign-up?next=/" className="primary">{t.landing.start}</Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span aria-hidden="true" />{t.landing.eyebrow}</p>
          <h1 id="landing-title">
            {t.landing.headlineLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className="landing-hero-subtitle">{t.landing.subtitle}</p>
          <div className="landing-hero-actions">
            <Link href="/auth/sign-up?next=/" className="landing-cta primary">
              <span>{t.landing.primaryCta}</span>
              <ArrowIcon />
            </Link>
            <Link href="/auth/sign-in?next=/" className="landing-cta secondary">{t.landing.secondaryCta}</Link>
          </div>
          <ul className="landing-proof-line" aria-label="Primoria product pillars">
            {t.landing.proofPoints.map((point, index) => (
              <li key={point} className={`tint-${TINTS[index % TINTS.length]}`}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-flow-preview" role="tablist" aria-label={t.landing.flowLabel}>
            {flowStages.map((item, index) => (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`landing-flow-tab-${item.id}`}
                aria-controls="landing-flow-panel"
                aria-selected={index === activeStage}
                tabIndex={index === activeStage ? 0 : -1}
                onClick={() => setActiveStage(index)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="landing-map-stage"
            id="landing-flow-panel"
            role="tabpanel"
            aria-labelledby={`landing-flow-tab-${stage.id}`}
            tabIndex={0}
          >
            <div className={`landing-map-caption stage-${stage.id}`}>
              <span>{stage.kicker}</span>
              <strong>{stage.title}</strong>
            </div>
            <FlowStageVisual key={stage.id} stageId={stage.id} labels={t.landing.visualLabels} />
          </div>
        </div>
      </section>

      <section id="product" className="landing-section landing-band">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <span>{t.landing.productKicker}</span>
            <h2>{t.landing.productTitle}</h2>
          </div>
          <div className="landing-capability-list">
            {t.landing.capabilities.map((item, index) => (
              <article key={item.label} className={`tint-${TINTS[index % TINTS.length]}`}>
                <div className="landing-capability-band">
                  <span className="landing-capability-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="landing-capability-tag">{item.label}</span>
                </div>
                <div className="landing-capability-content">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <span>{item.tags}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="stem" className="landing-section">
        <div className="landing-section-inner">
          <div className="landing-section-heading split">
            <div>
              <span>{t.landing.stemKicker}</span>
              <h2>{t.landing.stemTitle}</h2>
            </div>
            <p>{t.landing.stemBody}</p>
          </div>
          <dl className="landing-stem-stats-bar">
            {t.landing.stemStats.map((stat, index) => (
              <div key={stat.label} className={`landing-stem-stat-item tint-${TINTS[index % TINTS.length]}`}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
          <div className="landing-stem-domains-grid">
            {t.landing.stemDomains.map((domain, index) => (
              <article key={domain.name} className={`landing-stem-domain-card tint-${TINTS[index % TINTS.length]}`}>
                <span className="landing-stem-domain-glyph" aria-hidden="true">
                  <svg width="56" height="40" viewBox="0 0 56 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={DOMAIN_GLYPHS[index % DOMAIN_GLYPHS.length]} />
                  </svg>
                </span>
                <div className="landing-stem-domain-header">
                  <h3>{domain.name}</h3>
                  <small>{domain.enName}</small>
                </div>
                <p>{domain.desc}</p>
                <div className="landing-stem-domain-pills">
                  {domain.highlights.map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="landing-stem-all-subjects">
            <span>{t.landing.allSubjectsLabel}</span>
            <div className="landing-subject-cloud" aria-label="Current STEM subjects">
              {SUBJECT_NAMES.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-ruled">
        <div className="landing-section-inner">
          <div className="landing-section-heading">
            <span>{t.landing.howKicker}</span>
            <h2>{t.landing.howTitle}</h2>
          </div>
          <ol className="landing-workflow-line">
            {t.landing.workflowDetails.map((item, index) => (
              <li key={item.title} className={`tint-${TINTS[index % TINTS.length]}`}>
                <span className="landing-workflow-dot" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-section landing-band">
        <div className="landing-section-inner">
          <div className="landing-section-heading split">
            <div>
              <span>{t.landing.lessonKicker}</span>
              <h2>{t.landing.lessonTitle}</h2>
            </div>
            <p>{t.landing.lessonBody}</p>
          </div>
          <div className="landing-blocks-cards-grid">
            {t.landing.lessonBlocks.map((block, index) => (
              <article key={block.title} className={`landing-block-feature-card tint-${TINTS[index % TINTS.length]}`}>
                <span className="landing-block-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={BLOCK_ICONS[index % BLOCK_ICONS.length]} />
                  </svg>
                </span>
                <div>
                  <h3>
                    {block.title}
                    <span>{block.tag}</span>
                  </h3>
                  <p>{block.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <svg className="landing-final-cta-map" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M0 105H1440M0 210H1440M0 315H1440M240 0V420M480 0V420M720 0V420M960 0V420M1200 0V420" stroke="#f6f3ec" strokeOpacity="0.06" />
          <path d="M-20 360C120 340 200 290 290 262" stroke="#c8881a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M1150 196C1240 160 1320 100 1460 70" stroke="#d9603f" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="290" cy="262" r="10" fill="#c8881a" />
          <circle cx="1150" cy="196" r="10" fill="#d9603f" />
        </svg>
        <div className="landing-final-cta-content">
          <span>{t.landing.finalKicker}</span>
          <p>{t.landing.finalCopy}</p>
          <Link href="/auth/sign-up?next=/" className="landing-cta light">
            <span>{t.landing.finalCta}</span>
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>{t.common.brand}</span>
        <span>© 2026 Primoria</span>
      </footer>
    </main>
  );
}

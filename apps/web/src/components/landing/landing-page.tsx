"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FlowStageVisual } from "@/components/landing/flow-stage-visual";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PUBLIC_LANDING_PATH } from "@/lib/auth/routes";
import { useT } from "@/lib/i18n/client";

const subjectGroups = [
  "Calculus",
  "Linear Algebra",
  "Data Structures",
  "Computer Networks",
  "Artificial Intelligence",
  "Machine Learning",
  "Physics",
  "Chemistry",
  "Biology",
  "Discrete Math",
];

/** Index of the stage shown before the visitor picks one (the generated lesson). */
const DEFAULT_FLOW_STAGE = 2;

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
          <span className="landing-brand-mark" aria-hidden="true" />
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
          <p className="landing-eyebrow">{t.landing.eyebrow}</p>
          <h1 id="landing-title">
            <span>{t.landing.headlineProduct}</span>
            {t.landing.headline}
          </h1>
          <p className="landing-hero-subtitle">{t.landing.subtitle}</p>
          <div className="landing-hero-actions">
            <Link href="/auth/sign-up?next=/" className="landing-cta primary">{t.landing.primaryCta}</Link>
            <Link href="/auth/sign-in?next=/" className="landing-cta secondary">{t.landing.secondaryCta}</Link>
          </div>
          <div className="landing-proof-line" aria-label="Primoria product pillars">
            {t.landing.proofPoints.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="Primoria adaptive learning map preview">
            <div className="landing-map-stage">
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
                  {item.label}
                </button>
              ))}
            </div>
            <FlowStageVisual key={stage.id} stageId={stage.id} />
            <div
              className="landing-flow-panel"
              id="landing-flow-panel"
              role="tabpanel"
              aria-labelledby={`landing-flow-tab-${stage.id}`}
              tabIndex={0}
            >
              <div className="landing-map-caption">
                <span>{stage.kicker}</span>
                <strong>{stage.title}</strong>
              </div>
              <div className="landing-map-status">
                <span>{stage.statusKicker}</span>
                <strong>{stage.statusCopy}</strong>
                <small>{stage.statusNote}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="landing-section landing-product">
        <div className="landing-section-heading">
          <span>{t.landing.productKicker}</span>
          <h2>{t.landing.productTitle}</h2>
        </div>
        <div className="landing-capability-list">
          {t.landing.capabilities.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="stem" className="landing-section landing-stem">
        <div className="landing-section-heading">
          <span>{t.landing.stemKicker}</span>
          <h2>{t.landing.stemTitle}</h2>
          <p>{t.landing.stemBody}</p>
        </div>
        <div className="landing-subject-cloud" aria-label="Current STEM subjects">
          {subjectGroups.map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-workflow">
        <div className="landing-section-heading">
          <span>{t.landing.howKicker}</span>
          <h2>{t.landing.howTitle}</h2>
        </div>
        <ol className="landing-workflow-line">
          {t.landing.workflow.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-blocks">
        <div className="landing-section-heading">
          <span>{t.landing.lessonKicker}</span>
          <h2>{t.landing.lessonTitle}</h2>
          <p>{t.landing.lessonBody}</p>
        </div>
        <div className="landing-final-cta">
          <p>{t.landing.finalCopy}</p>
          <Link href="/auth/sign-up?next=/">{t.landing.finalCta}</Link>
        </div>
      </section>
    </main>
  );
}

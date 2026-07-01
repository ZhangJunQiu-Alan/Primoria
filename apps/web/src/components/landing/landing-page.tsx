"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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

export function LandingPage() {
  const t = useT();

  return (
    <main className="landing-shell">
      <header className="landing-nav" aria-label="Primoria landing navigation">
        <Link href="/" className="landing-brand" aria-label="Primoria home">
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
              <div className="landing-flow-preview" aria-label="Learning generation flow">
              {t.landing.flow.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="landing-map-caption">
              <span>{t.landing.mapKicker}</span>
              <strong>{t.landing.mapTitle}</strong>
            </div>
            <svg className="landing-map-svg" viewBox="0 0 720 520" role="img" aria-label="Knowledge graph, lesson path, and visualization preview">
              <defs>
                <linearGradient id="landingPathGradient" x1="74" y1="390" x2="590" y2="96" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c8881a" />
                  <stop offset="0.48" stopColor="#ef7358" />
                  <stop offset="1" stopColor="#17130f" />
                </linearGradient>
              </defs>
              <path className="landing-map-gridline" d="M80 96H642M80 202H642M80 308H642M80 414H642" />
              <path className="landing-map-gridline" d="M160 62V452M280 62V452M400 62V452M520 62V452" />
              <path className="landing-map-edge faint" d="M144 384C214 242 290 184 390 205" />
              <path className="landing-map-edge faint" d="M390 205C452 132 522 112 606 150" />
              <path className="landing-map-edge faint" d="M390 205C424 298 500 356 596 390" />
              <path className="landing-map-path" d="M144 384C226 318 284 258 390 205C475 162 530 126 606 150" />
              <circle className="landing-map-node muted" cx="144" cy="384" r="44" />
              <circle className="landing-map-node active" cx="390" cy="205" r="64" />
              <circle className="landing-map-node next" cx="606" cy="150" r="42" />
              <circle className="landing-map-node small" cx="596" cy="390" r="34" />
              <circle className="landing-map-node small warm" cx="268" cy="160" r="28" />
              <text x="118" y="391">Goal</text>
              <text x="344" y="213">Light</text>
              <text x="576" y="157">Next</text>
            </svg>
            <div className="landing-map-status" aria-label="Generated lesson preview">
              <span>{t.landing.visualKicker}</span>
              <strong>{t.landing.visualCopy}</strong>
              <small>{t.landing.visualNote}</small>
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

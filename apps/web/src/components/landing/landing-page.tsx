"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import {
  EngineVisual,
  MasteryVisual,
  PositioningVisual,
  TutorVisual,
} from "@/components/landing/landing-capability-visuals";
import { LandingLessonAnatomy } from "@/components/landing/landing-lesson-anatomy";
import { PALETTE as C, accentStyle, isCjk } from "@/components/landing/landing-palette";
import { LandingWalkthrough, usePrefersReducedMotion } from "@/components/landing/landing-walkthrough";
import { PUBLIC_LANDING_PATH } from "@/lib/auth/routes";
import { useI18n, useT } from "@/lib/i18n/client";

/** One accent per position in the four-item rows (proof points, capabilities, stats, domains). */
const ROW_ACCENTS = ["var(--pine)", "var(--amber-ink)", "var(--coral-ink)", "var(--lavender-ink)"] as const;
const ROW_TINTS = ["var(--pine-tint)", "var(--amber-tint)", "var(--rose-tint)", "var(--lavender-tint)"] as const;
const DOMAIN_GLYPH_COLORS = [C.pine, C.amber, C.coral, C.lavender] as const;

const DOMAIN_GLYPHS = [
  "M4 34C14 34 18 6 28 6S42 34 52 34",
  "M28 6v10M28 16L14 28M28 16l14 12M10 28h8v8h-8zM38 28h8v8h-8zM24 2h8v8h-8z",
  "M8 8v24M28 4v32M48 12v16M8 8L28 4M8 8l20 16M8 32L28 24M8 32l20 4M28 4l20 8M28 24l20-12M28 24l20 4M28 36l20-8",
  "M24 20a4 4 0 1 0 8 0a4 4 0 1 0-8 0M6 20c0-6 10-10 22-10s22 4 22 10-10 10-22 10S6 26 6 20z",
];

/** Learning-path nodes sit at the left edge of each of the five step columns (viewBox width 1000). */
const PATH_NODES = [
  { x: 8, y: 78, color: C.amber },
  { x: 208, y: 38, color: "#7ed6ae" },
  { x: 408, y: 70, color: C.coral },
  { x: 608, y: 30, color: "#b7a9f0" },
  { x: 808, y: 62, color: C.paper },
];
const STEP_COLORS = ["#e0a84a", "#7ed6ae", "#ee8a6c", "#b7a9f0", C.paper];

const CAPABILITY_VISUALS = [PositioningVisual, EngineVisual, TutorVisual, MasteryVisual];
const CAPABILITY_SPANS = ["wide", "narrow", "narrow", "wide"] as const;

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** The closing call to action types example goals into a composer-shaped link. */
function GoalComposer({ examples, label }: { examples: readonly string[]; label: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [text, setText] = useState(examples[0] ?? "");

  useEffect(() => {
    if (reducedMotion || examples.length === 0) return;
    let index = 0;
    let length = examples[0].length;
    let direction = -1;
    let timer = 0;
    const step = () => {
      const current = examples[index];
      length += direction;
      setText(current.slice(0, length));
      if (direction === 1 && length >= current.length) {
        direction = -1;
        timer = window.setTimeout(step, 2000);
        return;
      }
      if (direction === -1 && length <= 0) {
        direction = 1;
        index = (index + 1) % examples.length;
        timer = window.setTimeout(step, 350);
        return;
      }
      timer = window.setTimeout(step, direction === 1 ? (isCjk(current) ? 110 : 60) : 26);
    };
    timer = window.setTimeout(step, 4200);
    return () => window.clearTimeout(timer);
  }, [examples, reducedMotion]);

  return (
    <Link href="/auth/sign-up?next=/" className="landing-composer" aria-label={label}>
      <span className="landing-composer-text" aria-hidden="true">
        <span>{reducedMotion ? examples[0] : text}</span>
        <span className="landing-caret" />
      </span>
      <span className="landing-composer-send" aria-hidden="true">
        <ArrowIcon size={18} />
      </span>
    </Link>
  );
}

export function LandingPage() {
  const t = useT();
  const { language } = useI18n();
  const copy = t.landing;
  const shellRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // The shell is the scroll container (the document body does not scroll).
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onScroll = () => setScrolled(shell.scrollTop > 8);
    shell.addEventListener("scroll", onScroll, { passive: true });
    return () => shell.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main ref={shellRef} className="landing-shell">
      <header className="landing-nav" data-scrolled={scrolled ? "true" : "false"} aria-label="Primoria landing navigation">
        <div className="landing-wrap landing-nav-inner">
          <Link href={PUBLIC_LANDING_PATH} className="landing-brand" aria-label="Primoria home">
            <BrandLogo />
          </Link>
          <nav className="landing-nav-links" aria-label="Landing sections">
            <a href="#product">{copy.navProduct}</a>
            <a href="#stem">{copy.navStem}</a>
            <a href="#how-it-works">{copy.navPath}</a>
          </nav>
          <div className="landing-nav-actions">
            <LanguageToggle />
            <Link href="/auth/sign-in?next=/" className="landing-nav-login">{copy.login}</Link>
            <Link href="/auth/sign-up?next=/" className="landing-btn primary">{copy.start}</Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-wrap">
          <div className="landing-hero-top">
            <p className="landing-kicker">{copy.eyebrow}</p>
            <h1 id="landing-title">
              {t.landing.headlineLines.map((line, index) => (
                <span key={line} className={index > 0 ? "landing-headline-accent" : undefined}>
                  {index > 0 && language === "en" ? " " : null}
                  {line}
                </span>
              ))}
            </h1>
          </div>
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-hero-subtitle">{copy.subtitle}</p>
              <div className="landing-hero-actions">
                <Link href="/auth/sign-up?next=/" className="landing-btn primary large">
                  <span>{copy.primaryCta}</span>
                  <ArrowIcon />
                </Link>
                <Link href="/auth/sign-in?next=/" className="landing-btn ghost large">{copy.secondaryCta}</Link>
              </div>
              <ul className="landing-proof-line" aria-label="Primoria product pillars">
                {copy.proofPoints.map((point, index) => (
                  <li key={point} style={accentStyle(ROW_ACCENTS[index % ROW_ACCENTS.length])}>{point}</li>
                ))}
              </ul>
            </div>
            <LandingWalkthrough copy={copy} />
          </div>
        </div>
      </section>

      <section id="product" className="landing-section landing-band" aria-labelledby="landing-product-title">
        <div className="landing-wrap">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker" style={accentStyle("var(--pine)")}>{copy.productKicker}</p>
              <h2 id="landing-product-title">{copy.productTitle}</h2>
            </div>
          </div>
          <div className="landing-capability-list">
            {copy.capabilities.map((item, index) => {
              const Visual = CAPABILITY_VISUALS[index];
              return (
                <article
                  key={item.label}
                  className="landing-capability"
                  data-span={CAPABILITY_SPANS[index]}
                  style={accentStyle(ROW_ACCENTS[index], ROW_TINTS[index])}
                >
                  <div className="landing-capability-visual">
                    <Visual copy={copy.capabilityVisuals} />
                  </div>
                  <div className="landing-capability-body">
                    <div className="landing-capability-meta">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{item.label}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="stem" className="landing-section" aria-labelledby="landing-stem-title">
        <div className="landing-wrap">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">{copy.stemKicker}</p>
              <h2 id="landing-stem-title">{copy.stemTitle}</h2>
            </div>
            <p>{copy.stemBody}</p>
          </div>
          <dl className="landing-stem-stats">
            {copy.stemStats.map((stat, index) => (
              <div key={stat.label} className="landing-stem-stat" style={accentStyle(ROW_ACCENTS[index])}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
          <div className="landing-domains">
            {copy.stemDomains.map((domain, index) => (
              <article key={domain.name} className="landing-domain" style={accentStyle(ROW_ACCENTS[index], ROW_TINTS[index])}>
                <span className="landing-domain-num">{String(index + 1).padStart(2, "0")}</span>
                <h3>
                  {domain.name}
                  {language === "zh" ? <small>{domain.enName}</small> : null}
                </h3>
                <p>{domain.desc}</p>
                <ul>
                  {domain.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                <svg className="landing-domain-glyph" width="56" height="40" viewBox="0 0 56 40" fill="none" stroke={DOMAIN_GLYPH_COLORS[index]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={DOMAIN_GLYPHS[index % DOMAIN_GLYPHS.length]} />
                </svg>
              </article>
            ))}
          </div>
          <div className="landing-all-subjects">
            <span>{copy.allSubjectsLabel}</span>
            <p className="landing-subject-cloud" aria-label={copy.allSubjectsLabel}>
              {copy.allSubjects.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-how" aria-labelledby="landing-how-title">
        <div className="landing-wrap">
          <p className="landing-kicker">{copy.howKicker}</p>
          <h2 id="landing-how-title">{copy.howTitle}</h2>
          <svg className="landing-path-svg" viewBox="0 0 1000 110" aria-hidden="true">
            <defs>
              <linearGradient id="landing-how-gradient" x1="0" x2="1">
                <stop offset="0" stopColor={C.amber} />
                <stop offset="0.5" stopColor={C.coral} />
                <stop offset="1" stopColor="#9c8be6" />
              </linearGradient>
            </defs>
            <path
              id="landing-how-path"
              d="M8 78 C 90 78, 130 38, 208 38 S 330 70, 408 70 S 530 30, 608 30 S 730 62, 808 62 S 950 40, 1000 36"
              fill="none"
              stroke="url(#landing-how-gradient)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {PATH_NODES.map((node) => (
              <circle key={node.x} cx={node.x} cy={node.y} r={8} fill="#15372e" stroke={node.color} strokeWidth={3} />
            ))}
            {reducedMotion ? null : (
              <circle r={5} fill={C.paper}>
                <animateMotion dur="10s" repeatCount="indefinite">
                  <mpath href="#landing-how-path" />
                </animateMotion>
              </circle>
            )}
          </svg>
          <ol className="landing-workflow-line">
            {copy.workflowDetails.map((item, index) => (
              <li key={item.title} style={accentStyle(STEP_COLORS[index])}>
                <span className="landing-workflow-num">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-lesson-title">
        <div className="landing-wrap">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker" style={accentStyle("var(--lavender-ink)")}>{copy.lessonKicker}</p>
              <h2 id="landing-lesson-title">{copy.lessonTitle}</h2>
            </div>
            <p>{copy.lessonBody}</p>
          </div>
          <LandingLessonAnatomy copy={copy} />
        </div>
      </section>

      <section className="landing-final" aria-labelledby="landing-final-title">
        <div className="landing-wrap">
          <div className="landing-final-card">
            <svg className="landing-final-art" viewBox="0 0 1160 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <path d="M-20 352 C 150 340, 300 330, 430 308" fill="none" stroke={C.amber} strokeWidth={3} strokeLinecap="round" opacity={0.55} />
              <circle cx={430} cy={308} r={7} fill={C.amber} opacity={0.55} />
              <path d="M900 -10 C 960 40, 1060 60, 1180 50" fill="none" stroke={C.coral} strokeWidth={3} strokeLinecap="round" opacity={0.45} />
            </svg>
            <div className="landing-final-copy">
              <p className="landing-kicker">{copy.finalKicker}</p>
              <h2 id="landing-final-title">{copy.finalCopy}</h2>
            </div>
            <div className="landing-final-action">
              <GoalComposer examples={copy.finalExamples} label={copy.finalCta} />
              <small>{copy.finalNote}</small>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-inner">
          <Link href={PUBLIC_LANDING_PATH} className="landing-brand" aria-label="Primoria home">
            <BrandLogo />
          </Link>
          <nav className="landing-footer-links" aria-label="Footer">
            <a href="#product">{copy.navProduct}</a>
            <a href="#stem">{copy.navStem}</a>
            <a href="#how-it-works">{copy.navPath}</a>
            <Link href="/auth/sign-in?next=/">{copy.login}</Link>
          </nav>
          <span>© 2026 Primoria</span>
        </div>
      </footer>
    </main>
  );
}

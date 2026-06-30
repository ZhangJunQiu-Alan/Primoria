import Link from "next/link";

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

const capabilities = [
  {
    label: "KG positioning",
    title: "先定位你真正要学的节点",
    body: "从一句目标落到 STEM KG 的 topic / concept / prerequisite，不把宽泛问题直接交给生成器乱发挥。",
  },
  {
    label: "Lesson engine",
    title: "课程按 lesson 逐节展开",
    body: "当前 lesson 只呈现当前 blocks，下一节预加载但不会干扰正在学习的内容。",
  },
  {
    label: "Course Tutor",
    title: "围绕当前 block 提问",
    body: "Course Tutor 知道你正在看哪一节、哪一个 block，可以解释、举例、出题或检查理解。",
  },
  {
    label: "Mastery loop",
    title: "根据测验反馈推进或补课",
    body: "Quiz 和学习事件会更新 mastery；掌握稳定就进入下一节，薄弱处会触发补救 lesson。",
  },
];

const proofPoints = [
  "知识图谱 KG 定位",
  "逐节 Lazy Generation",
  "Interactive Visualization",
  "Mastery-aware feedback",
];

const workflow = [
  "输入目标",
  "KG 定位",
  "生成 lesson",
  "互动练习",
  "推进或补课",
];

export function LandingPage() {
  return (
    <main className="landing-shell">
      <header className="landing-nav" aria-label="Primoria landing navigation">
        <Link href="/" className="landing-brand" aria-label="Primoria home">
          <span className="landing-brand-mark" aria-hidden="true" />
          <span>Primoria</span>
        </Link>
        <nav className="landing-nav-links" aria-label="Landing sections">
          <a href="#product">产品能力</a>
          <a href="#stem">STEM 覆盖</a>
          <a href="#how-it-works">学习路径</a>
        </nav>
        <div className="landing-nav-actions">
          <Link href="/auth/sign-in?next=/">我已有账号</Link>
          <Link href="/auth/sign-up?next=/" className="primary">开始定制</Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Adaptive STEM learning</p>
          <h1 id="landing-title">
            <span>Primoria</span>
            学习更加智能、更加定制化、更加高效
          </h1>
          <p className="landing-hero-subtitle">
            输入一个学习目标，Primoria 会把它定位到 STEM 知识图谱 KG，生成适合你的课程路径、逐节 lesson、Interactive Visualization、可运行代码和测验反馈。
          </p>
          <div className="landing-hero-actions">
            <Link href="/auth/sign-up?next=/" className="landing-cta primary">生成我的第一条学习路径</Link>
            <Link href="/auth/sign-in?next=/" className="landing-cta secondary">我已有账号</Link>
          </div>
          <div className="landing-proof-line" aria-label="Primoria product pillars">
            {proofPoints.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="Primoria adaptive learning map preview">
          <div className="landing-map-stage">
            <div className="landing-flow-preview" aria-label="Learning generation flow">
              <span>Goal</span>
              <span>KG</span>
              <span>Lesson</span>
              <span>Visual</span>
              <span>Feedback</span>
            </div>
            <div className="landing-map-caption">
              <span>Learning path</span>
              <strong>Photosynthesis: Light, Carbon, and Limits</strong>
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
              <span>Interactive Visualization</span>
              <strong>知识不只是单薄的点，而是可观察、可操作、可被提问的实体。</strong>
              <small>围绕当前 lesson 生成可视化、练习和 Course Tutor 上下文。</small>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="landing-section landing-product">
        <div className="landing-section-heading">
          <span>Product system</span>
          <h2>从定位到反馈，学习过程闭环运行。</h2>
        </div>
        <div className="landing-capability-list">
          {capabilities.map((item) => (
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
          <span>STEM coverage</span>
          <h2>专注 STEM 领域，让知识图谱驱动课程路径。</h2>
          <p>当前覆盖数学、计算机科学、AI、物理、化学、生物等核心学习方向。</p>
        </div>
        <div className="landing-subject-cloud" aria-label="Current STEM subjects">
          {subjectGroups.map((subject) => (
            <span key={subject}>{subject}</span>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-workflow">
        <div className="landing-section-heading">
          <span>How it works</span>
          <h2>学习路径不是预设目录，而是根据你的位置持续展开。</h2>
        </div>
        <ol className="landing-workflow-line">
          {workflow.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-blocks">
        <div className="landing-section-heading">
          <span>Lesson experience</span>
          <h2>每一节课都能读、看、运行、练习。</h2>
          <p>text、analogy、transfer、visual、code、quiz 会围绕当前 lesson 组合，而不是把整门课内容铺满屏幕。</p>
        </div>
        <div className="landing-final-cta">
          <p>从“讲讲二分查找”到“带我入门光合作用”，Primoria 会把目标落成可继续学习的课程。</p>
          <Link href="/auth/sign-up?next=/">开始定制我的学习路径</Link>
        </div>
      </section>
    </main>
  );
}

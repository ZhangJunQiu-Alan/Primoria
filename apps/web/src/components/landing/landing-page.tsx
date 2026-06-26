import Link from "next/link";

const subjectGroups = [
  "Calculus",
  "Linear Algebra",
  "Data Structures",
  "Computer Networks",
  "Artificial Intelligence",
  "Machine Learning",
  "A Level Biology",
  "A Level Chemistry",
];

const workflow = [
  {
    step: "01",
    title: "输入学习目标",
    body: "用自然语言说清楚你想学什么，Primoria 会先判断这是具体概念、宽泛主题，还是跨学科路径。",
  },
  {
    step: "02",
    title: "KG 定位路径",
    body: "系统把目标落到 STEM 知识图谱中的 topic / concept，并按先修关系规划从哪里开始。",
  },
  {
    step: "03",
    title: "生成第一节课",
    body: "课程按 lesson 逐节生成，当前 lesson 会读取相关子图、先修节点和你的 mastery 状态。",
  },
  {
    step: "04",
    title: "根据表现推进",
    body: "Quiz、对话和完成情况会推动学习进度；掌握稳定就继续，发现缺口就补一节。",
  },
];

const blockTypes = [
  "text",
  "analogy",
  "transfer",
  "visual",
  "code",
  "quiz",
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
          <p className="landing-eyebrow">Adaptive learning for STEM</p>
          <h1 id="landing-title">学习更加智能、更加定制化、更加高效</h1>
          <p className="landing-hero-subtitle">
            Primoria 把一句学习目标定位到 STEM KG，生成适合你的课程路径、逐节 lesson、Interactive Visualization、可运行代码和测验反馈。
          </p>
          <div className="landing-hero-actions">
            <Link href="/auth/sign-up?next=/" className="landing-cta primary">开始定制我的学习路径</Link>
            <Link href="/auth/sign-in?next=/" className="landing-cta secondary">我已有账号</Link>
          </div>
          <dl className="landing-proof-grid" aria-label="Product highlights">
            <div>
              <dt>20</dt>
              <dd>STEM knowledge graphs</dd>
            </div>
            <div>
              <dt>KG</dt>
              <dd>topic / concept / prerequisite</dd>
            </div>
            <div>
              <dt>1:1</dt>
              <dd>mastery-aware lessons</dd>
            </div>
          </dl>
        </div>

        <div className="landing-hero-visual" aria-label="Primoria adaptive learning preview">
          <div className="landing-visual-card path-card">
            <span className="landing-card-kicker">Learning path</span>
            <strong>Photosynthesis: Light, Carbon, and Limits</strong>
            <div className="landing-path-line" aria-hidden="true">
              <span className="done">Goal</span>
              <span className="active">Light reaction</span>
              <span>Calvin cycle</span>
              <span>Limits</span>
            </div>
          </div>

          <div className="landing-visual-card graph-card">
            <span className="landing-card-kicker">KG positioning</span>
            <svg viewBox="0 0 360 240" role="img" aria-label="Knowledge graph preview">
              <path d="M78 160 C115 92 168 78 212 115" />
              <path d="M155 186 C188 154 230 154 282 178" />
              <path d="M212 115 C230 72 272 65 310 86" />
              <circle cx="78" cy="160" r="28" />
              <circle cx="155" cy="186" r="22" />
              <circle cx="212" cy="115" r="36" className="active" />
              <circle cx="282" cy="178" r="26" />
              <circle cx="310" cy="86" r="20" />
            </svg>
            <div className="landing-graph-labels">
              <span>concept</span>
              <span>topic anchor</span>
              <span>next lesson</span>
            </div>
          </div>

          <div className="landing-visual-card visual-card">
            <span className="landing-card-kicker">Interactive Visualization</span>
            <div className="landing-visual-canvas" aria-hidden="true">
              <span className="molecule one" />
              <span className="molecule two" />
              <span className="molecule three" />
              <span className="energy-beam" />
            </div>
            <p>知识不只是单薄的点，而是可观察、可操作的实体。</p>
          </div>

          <div className="landing-visual-card quiz-card">
            <span>quiz.submit</span>
            <strong>{"Mastery: learning -> mastered"}</strong>
          </div>
        </div>
      </section>

      <section id="product" className="landing-section landing-product">
        <div className="landing-section-heading">
          <span>Product system</span>
          <h2>从课程生成到学习进度，Primoria 是一个闭环工作台。</h2>
        </div>
        <div className="landing-product-grid">
          <article>
            <span>Course Copilot</span>
            <h3>围绕当前 lesson 和 block 提问</h3>
            <p>不是泛聊机器人，而是知道你正在学哪门课、哪一节、哪一个 block 的课程助手。</p>
          </article>
          <article>
            <span>Lesson blocks</span>
            <h3>讲解、类比、迁移、可视化、代码、测验</h3>
            <p>内容不是一篇长文，而是拆成可阅读、可交互、可验证的学习块。</p>
          </article>
          <article>
            <span>Recoverable jobs</span>
            <h3>建课任务可恢复</h3>
            <p>课程生成和 lesson 生成走统一任务体系，页面切换后也能回到正在生成的课程。</p>
          </article>
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
        <div className="landing-workflow-grid">
          {workflow.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-blocks">
        <div className="landing-section-heading">
          <span>Lesson experience</span>
          <h2>每一节课都能读、看、运行、练习。</h2>
        </div>
        <div className="landing-block-strip" aria-label="Supported lesson block types">
          {blockTypes.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
        <div className="landing-final-cta">
          <p>从“讲讲二分查找”到“带我入门光合作用”，Primoria 会把目标落成可继续学习的课程。</p>
          <Link href="/auth/sign-up?next=/">开始定制我的学习路径</Link>
        </div>
      </section>
    </main>
  );
}

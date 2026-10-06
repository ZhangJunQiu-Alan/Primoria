export default function CourseLoading() {
  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace">
        <div className="course-reader course-route-loading" role="status" aria-live="polite">
          <span className="sr-only">Loading course</span>

          {/* Background Ambient Lighting Orbs */}
          <div className="course-loading-ambient" aria-hidden="true">
            <div className="course-loading-aura course-loading-aura-amber" />
            <div className="course-loading-aura course-loading-aura-blue" />
          </div>

          <header className="course-reader-topbar" aria-hidden="true">
            <div className="course-loading-close-wrap">
              <i className="course-loading-shape course-loading-circle" />
            </div>
            <div className="course-loading-title-group">
              <i className="course-loading-shape course-loading-badge" />
              <i className="course-loading-shape course-loading-title" />
            </div>
            <div className="course-loading-progress">
              <i className="course-loading-progress-runner" />
            </div>
            <div className="course-loading-count-wrap">
              <i className="course-loading-shape course-loading-count" />
            </div>
          </header>

          <main className="course-reader-stage" aria-hidden="true">
            <div className="course-reader-card course-loading-card">
              {/* Card Header: Topic badge & Headline */}
              <div className="course-loading-card-header">
                <div className="course-loading-tag-row">
                  <i className="course-loading-shape course-loading-tag" />
                  <i className="course-loading-shape course-loading-concept-id" />
                </div>
                <i className="course-loading-shape course-loading-heading" />
              </div>

              {/* Text Paragraph Lines */}
              <div className="course-loading-text-block">
                <i className="course-loading-shape course-loading-line" style={{ width: "98%" }} />
                <i className="course-loading-shape course-loading-line" style={{ width: "92%" }} />
                <i className="course-loading-shape course-loading-line short" style={{ width: "68%" }} />
              </div>

              {/* Dynamic Interactive Stage / Visual Canvas Loading Preview */}
              <div className="course-loading-panel">
                <div className="course-loading-orbit-system">
                  <div className="course-loading-orbit-core">
                    <span className="course-loading-spark" />
                  </div>
                  <div className="course-loading-orbit-ring ring-1">
                    <span className="course-loading-satellite sat-1" />
                  </div>
                  <div className="course-loading-orbit-ring ring-2">
                    <span className="course-loading-satellite sat-2" />
                  </div>
                </div>
                <div className="course-loading-status-badge">
                  <span className="course-loading-status-pulse" />
                  <span className="course-loading-status-text">
                    正在编排知识结构与交互实验
                  </span>
                  <span className="course-loading-status-dots">
                    <i /><i /><i />
                  </span>
                </div>
                <span className="course-loading-canvas-hint">
                  Synthesizing knowledge graph &amp; interactive modules
                </span>
              </div>

              {/* Card Footer: Key concept chips */}
              <div className="course-loading-chips-row">
                <i className="course-loading-shape course-loading-chip" style={{ width: "110px" }} />
                <i className="course-loading-shape course-loading-chip" style={{ width: "135px" }} />
                <i className="course-loading-shape course-loading-chip" style={{ width: "80px" }} />
              </div>
            </div>
          </main>

          <footer className="course-reader-controls" aria-hidden="true">
            <i className="course-loading-shape course-loading-control" />
            <div className="course-loading-primary-wrap">
              <i className="course-loading-shape course-loading-primary" />
            </div>
            <i className="course-loading-shape course-loading-control" />
          </footer>
        </div>
      </section>
    </main>
  );
}

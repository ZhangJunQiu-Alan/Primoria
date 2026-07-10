export default function CourseLoading() {
  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace">
        <div className="course-reader course-route-loading" role="status" aria-live="polite">
          <span className="sr-only">Loading course</span>
          <header className="course-reader-topbar" aria-hidden="true">
            <i className="course-loading-shape course-loading-circle" />
            <i className="course-loading-shape course-loading-title" />
            <i className="course-loading-shape course-loading-progress" />
            <i className="course-loading-shape course-loading-count" />
          </header>
          <main className="course-reader-stage" aria-hidden="true">
            <div className="course-reader-card course-loading-card">
              <i className="course-loading-shape course-loading-heading" />
              <i className="course-loading-shape course-loading-line" />
              <i className="course-loading-shape course-loading-line short" />
              <i className="course-loading-shape course-loading-panel" />
            </div>
          </main>
          <footer className="course-reader-controls" aria-hidden="true">
            <i className="course-loading-shape course-loading-control" />
            <i className="course-loading-shape course-loading-primary" />
            <i className="course-loading-shape course-loading-control" />
          </footer>
        </div>
      </section>
    </main>
  );
}

export default function CourseLoading() {
  return (
    <main className="app-shell course-app-shell">
      <section className="workspace course-workspace">
        <div className="lesson-reader lesson-loading" role="status" aria-live="polite">
          <span className="sr-only">Loading lesson</span>
          <header className="lesson-topbar" aria-hidden="true">
            <i className="lesson-skeleton" style={{ width: 28, height: 28, borderRadius: 8 }} />
            <i className="lesson-skeleton" style={{ width: 280, height: 14 }} />
            <span className="lesson-tools">
              <i className="lesson-skeleton" style={{ width: 96, height: 34, borderRadius: 9 }} />
              <i className="lesson-skeleton" style={{ width: 84, height: 34, borderRadius: 9 }} />
            </span>
          </header>
          <div className="lesson-steps" aria-hidden="true" style={{ ["--lesson-steps" as string]: 6 }}>
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index}>
                <i />
              </span>
            ))}
          </div>
          <div className="lesson-stage" aria-hidden="true">
            <div className="lesson-page">
              <i className="lesson-skeleton" style={{ width: "58%", height: 34, marginBottom: 30 }} />
              {["100%", "96%", "98%", "72%", "0", "100%", "93%", "64%"].map((width, index) => (
                <i key={index} className="lesson-skeleton" style={{ width, height: width === "0" ? 14 : 15, marginBottom: 14 }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserForRsc } from "@/lib/auth/session";
import { canViewInternalAnalytics } from "@/lib/telemetry/internal-access";
import { getVisualizationAnalytics } from "@/lib/telemetry/visualization-analytics";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function VisualizationAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await getCurrentUserForRsc();
  if (!user) redirect("/auth/sign-in?next=/internal/visualization-analytics");
  if (!canViewInternalAnalytics(user)) notFound();

  const params = await searchParams;
  const days = params.days === "14" ? 14 : 28;
  const report = await getVisualizationAnalytics(days);

  return (
    <main className="internal-analytics-page">
      <header className="internal-analytics-header">
        <div>
          <p>Internal · visualization.render</p>
          <h1>Visualization catalog signals</h1>
          <span>Catalog misses and component reliability over the last {days} days.</span>
        </div>
        <nav aria-label="Analysis window">
          <Link aria-current={days === 14 ? "page" : undefined} href="?days=14">14 days</Link>
          <Link aria-current={days === 28 ? "page" : undefined} href="?days=28">28 days</Link>
        </nav>
      </header>

      {report.truncated ? <p className="internal-analytics-warning">Showing the newest 50,000 events. Export the database for full analysis.</p> : null}

      <section className="internal-analytics-metrics" aria-label="Visualization totals">
        {[
          ["Total", report.totals.all],
          ["Interactive", report.totals.interactive],
          ["Sandbox misses", report.totals.sandbox],
          ["Failures", report.totals.failed],
        ].map(([label, value]) => (
          <article key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      <section className="internal-analytics-panel">
        <div className="internal-analytics-panel-heading">
          <div><p>Expansion demand</p><h2>Sandbox misses by normalized topic</h2></div>
          <span>{report.sandboxClusters.length} clusters</span>
        </div>
        <div className="internal-analytics-table-wrap">
          <table>
            <thead><tr><th>Topic cluster</th><th>Attempts</th><th>Rendered</th><th>Failed</th><th>Examples</th></tr></thead>
            <tbody>
              {report.sandboxClusters.map((cluster) => (
                <tr key={cluster.topic}>
                  <td><strong>{cluster.topic}</strong></td>
                  <td>{cluster.attempts}</td>
                  <td>{cluster.rendered}</td>
                  <td>{cluster.failed}</td>
                  <td>{cluster.examples.join(" · ")}</td>
                </tr>
              ))}
              {!report.sandboxClusters.length ? <tr><td colSpan={5}>No sandbox misses in this window.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="internal-analytics-panel">
        <div className="internal-analytics-panel-heading">
          <div><p>Runtime reliability</p><h2>Interactive success rate by component</h2></div>
          <span>{report.interactiveComponents.length} components</span>
        </div>
        <div className="internal-analytics-table-wrap">
          <table>
            <thead><tr><th>Component</th><th>Attempts</th><th>Rendered</th><th>Failed</th><th>Success</th></tr></thead>
            <tbody>
              {report.interactiveComponents.map((component) => (
                <tr key={component.componentId}>
                  <td><code>{component.componentId}</code></td>
                  <td>{component.attempts}</td>
                  <td>{component.rendered}</td>
                  <td>{component.failed}</td>
                  <td><strong>{percent(component.successRate)}</strong></td>
                </tr>
              ))}
              {!report.interactiveComponents.length ? <tr><td colSpan={5}>No interactive renders in this window.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <footer>Generated {new Date(report.generatedAt).toLocaleString()} · access is production allowlist gated.</footer>
    </main>
  );
}

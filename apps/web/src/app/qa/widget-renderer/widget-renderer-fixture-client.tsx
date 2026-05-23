"use client";

import { useState } from "react";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { StemRenderer } from "@/components/generative-ui/stem-renderer";

const streamingInitialHtml = `
<section data-testid="stream-fixture">
  <strong>Streaming fixture</strong>
  <p id="stream-status">preview only</p>
  <button id="stream-action">Waiting</button>
</section>`;

const streamingFinalHtml = `
<section data-testid="stream-fixture">
  <strong>Streaming fixture</strong>
  <p id="stream-status">final preview</p>
  <button id="stream-action">Waiting</button>
</section>
<script>
  window.__streamExecCount = (window.__streamExecCount || 0) + 1;
  document.getElementById('stream-status').textContent = 'executed ' + window.__streamExecCount;
  document.getElementById('stream-action').textContent = 'Clicked 0';
  document.getElementById('stream-action').addEventListener('click', function () {
    var count = Number(this.dataset.count || '0') + 1;
    this.dataset.count = String(count);
    this.textContent = 'Clicked ' + count;
  });
</script>`;

const badHtml = `
<section>
  <strong>Broken fixture</strong>
  <p>This script throws during final execution.</p>
</section>
<script>
  throw new Error('fixture bad widget');
</script>`;

const unclosedScriptHtml = `
<section>
  <strong>Unclosed script fixture</strong>
  <p>The renderer should show an incomplete script error.</p>
</section>
<script>
  window.__neverFinishes =`;

const mathCode = `
const scene = MathGL.scene({ title: 'linear fixture', xMin: -3, xMax: 3, yMin: -3, yMax: 3 });
scene.plot(x => x, { label: 'y = x' });
scene.point(1, 1, { label: '(1, 1)', color: '#1D9E75' });
scene.run();`;

const csCode = `
const scene = AlgoViz.scene({ title: 'array fixture', height: 260 });
const arr = scene.array([3, 1, 2]);
arr.highlight(0, 'compare');
scene.step('Compare the first item');
arr.swap(0, 1);
arr.clearHighlights();
arr.highlight(1, 'sorted');
scene.step('Swap into order');
scene.run();`;

const physicsCode = `
const world = Physics.world({ gravity: 9.8, height: 260 });
world.surface({ y: 240 });
const ball = world.ball({ x: 80, y: 80, radius: 18, restitution: 0.8, color: '#6366f1' });
ball.impulse({ x: 0.04, y: -0.08 });
world.label(() => 'speed: ' + ball.speed.toFixed(1));
world.run();`;

export function WidgetRendererFixtureClient() {
  const [streamHtml, setStreamHtml] = useState(streamingInitialHtml);

  return (
    <main style={{ padding: 24, display: "grid", gap: 24 }}>
      <header>
        <h1>Widget renderer QA fixture</h1>
        <p>Development-only route for renderer, error, export, and STEM fixture checks.</p>
      </header>

      <section data-testid="streaming-section">
        <h2>Streaming/final execution</h2>
        <button type="button" data-testid="push-stream-final" onClick={() => setStreamHtml(streamingFinalHtml)}>
          Push final widget HTML
        </button>
        <WidgetRenderer title="Streaming fixture" description="Streaming fixture" html={streamHtml} />
      </section>

      <section data-testid="bad-section">
        <h2>Runtime error</h2>
        <WidgetRenderer title="Bad fixture" description="Bad fixture" html={badHtml} />
      </section>

      <section data-testid="empty-section">
        <h2>Empty widget</h2>
        <WidgetRenderer title="Empty fixture" description="Empty fixture" html="" />
      </section>

      <section data-testid="unclosed-section">
        <h2>Unclosed script</h2>
        <WidgetRenderer title="Unclosed fixture" description="Unclosed fixture" html={unclosedScriptHtml} />
      </section>

      <section data-testid="stem-section">
        <h2>STEM renderers</h2>
        <StemRenderer subject="math" scene="line" title="Math fixture" description="Math fixture" code={mathCode} status="complete" />
        <StemRenderer subject="cs" scene="array" title="CS fixture" description="CS fixture" code={csCode} status="complete" />
        <StemRenderer subject="physics" scene="projectile" title="Physics fixture" description="Physics fixture" code={physicsCode} status="complete" />
      </section>
    </main>
  );
}

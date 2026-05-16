import { describe, expect, it } from 'vitest';
import { validateOfflineInteractiveHtml } from '@/shared/interactive/interactiveVisual';

function html(body: string) {
  return `<!doctype html><html><head></head><body>${body}</body></html>`;
}

describe('interactive visual offline validation', () => {
  it('allows SVG namespace constants used for dynamic SVG elements', () => {
    const error = validateOfflineInteractiveHtml(html(`
      <svg id="graph" viewBox="0 0 100 100"></svg>
      <script>
        const svg = document.getElementById('graph');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const label = document.createElementNS("https://www.w3.org/2000/svg", "text");
        svg.append(line, label);
      </script>
    `));

    expect(error).toBeNull();
  });

  it('still rejects real external URLs', () => {
    const error = validateOfflineInteractiveHtml(html('<img src="https://example.com/graph.png" />'));

    expect(error).toBe('Interactive visuals must run offline and cannot reference external URLs.');
  });

  it('allows allowlisted ESM module imports', () => {
    const error = validateOfflineInteractiveHtml(html(`
      <script type="module">
        import * as THREE from "https://esm.sh/three";
        THREE.Vector3;
      </script>
    `));
    expect(error).toBeNull();
  });

  it('allows allowlisted module script src', () => {
    const error = validateOfflineInteractiveHtml(html('<script type="module" src="https://cdn.jsdelivr.net/npm/chart.js/auto/+esm"></script>'));
    expect(error).toBeNull();
  });

  it('rejects non-allowlisted CDN imports', () => {
    const error = validateOfflineInteractiveHtml(html('<script type="module">import x from "https://unpkg.com/foo";</script>'));
    expect(error).toMatch(/esm\.sh or cdn\.jsdelivr\.net\/npm/);
  });

  it('rejects dynamic import()', () => {
    const error = validateOfflineInteractiveHtml(html('<script>const _ = import("https://esm.sh/d3");</script>'));
    expect(error).toBe('Interactive visuals must not use dynamic import().');
  });
});

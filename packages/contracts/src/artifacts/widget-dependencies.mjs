// Single source of truth for the widget external-dependency allowlist.
// Consumed by the agent (widgetRenderer tool normalization + tool description)
// and by the web iframe host (widget-renderer.tsx injects it into the sandbox
// bootstrap script). Only exact CDN URLs listed here may load inside widgets.
export const WIDGET_DEPENDENCY_ALLOWLIST = Object.freeze({
  d3: Object.freeze({ global: "d3", url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", kind: "script" }),
  cytoscape: Object.freeze({ global: "cytoscape", url: "https://cdn.jsdelivr.net/npm/cytoscape@3.29.2/dist/cytoscape.min.js", kind: "script" }),
  Chart: Object.freeze({ global: "Chart", url: "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js", kind: "script" }),
  gsap: Object.freeze({ global: "gsap", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js", kind: "script" }),
  THREE: Object.freeze({ global: "THREE", url: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js", kind: "script" }),
  anime: Object.freeze({ global: "anime", url: "https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js", kind: "script" }),
  Matter: Object.freeze({ global: "Matter", url: "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js", kind: "script" }),
  p5: Object.freeze({ global: "p5", url: "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js", kind: "script" }),
  math: Object.freeze({ global: "math", url: "https://cdn.jsdelivr.net/npm/mathjs@14.2.1/lib/browser/math.min.js", kind: "script" }),
  L: Object.freeze({ global: "L", url: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js", kind: "script" }),
  mermaid: Object.freeze({ global: "mermaid", url: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js", kind: "script" }),
  echarts: Object.freeze({ global: "echarts", url: "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js", kind: "script" }),
});

export const WIDGET_DEPENDENCIES_BY_URL = new Map(
  Object.values(WIDGET_DEPENDENCY_ALLOWLIST).map((dep) => [dep.url, dep]),
);

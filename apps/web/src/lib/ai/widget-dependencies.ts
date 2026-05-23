export type WidgetDependencyKind = "script" | "module" | "style";

export type WidgetDependency = {
  url: string;
  global?: string;
  kind?: WidgetDependencyKind;
};

export const WIDGET_DEPENDENCY_ALLOWLIST = {
  d3: { global: "d3", url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", kind: "script" },
  Chart: { global: "Chart", url: "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js", kind: "script" },
  gsap: { global: "gsap", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js", kind: "script" },
  THREE: { global: "THREE", url: "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.min.js", kind: "script" },
  anime: { global: "anime", url: "https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js", kind: "script" },
  Matter: { global: "Matter", url: "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js", kind: "script" },
  p5: { global: "p5", url: "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js", kind: "script" },
  math: { global: "math", url: "https://cdn.jsdelivr.net/npm/mathjs@14.2.1/lib/browser/math.min.js", kind: "script" },
  L: { global: "L", url: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js", kind: "script" },
  mermaid: { global: "mermaid", url: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js", kind: "script" },
} satisfies Record<string, WidgetDependency>;

const ALLOWED_BY_URL = new Map(
  Object.values(WIDGET_DEPENDENCY_ALLOWLIST).map((dep) => [dep.url, dep]),
);

export function normalizeWidgetDependency(value: unknown): WidgetDependency | null {
  if (typeof value === "string") {
    return WIDGET_DEPENDENCY_ALLOWLIST[value as keyof typeof WIDGET_DEPENDENCY_ALLOWLIST] ?? null;
  }

  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WidgetDependency>;
  const url = String(raw.url ?? "").trim();
  const allowed = ALLOWED_BY_URL.get(url);
  if (!allowed) return null;

  return {
    url: allowed.url,
    global: allowed.global,
    kind: allowed.kind,
  };
}

export function normalizeWidgetDependencies(value: unknown, maxCount = 6): WidgetDependency[] {
  if (!Array.isArray(value)) return [];

  const normalized: WidgetDependency[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const dep = normalizeWidgetDependency(item);
    if (!dep || seen.has(dep.url)) continue;
    seen.add(dep.url);
    normalized.push(dep);
    if (normalized.length >= maxCount) break;
  }
  return normalized;
}

export function isAllowedWidgetDependencyUrl(url: string) {
  return ALLOWED_BY_URL.has(url);
}

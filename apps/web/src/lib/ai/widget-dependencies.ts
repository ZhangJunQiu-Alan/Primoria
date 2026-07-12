import {
  WIDGET_DEPENDENCIES_BY_URL,
  WIDGET_DEPENDENCY_ALLOWLIST,
} from "@primoria/contracts/artifacts/widget-dependencies";
import type { WidgetDependency, WidgetDependencyKind } from "@primoria/contracts/artifacts";

export type { WidgetDependency, WidgetDependencyKind };
export { WIDGET_DEPENDENCY_ALLOWLIST };

const ALLOWED_BY_URL = WIDGET_DEPENDENCIES_BY_URL;

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

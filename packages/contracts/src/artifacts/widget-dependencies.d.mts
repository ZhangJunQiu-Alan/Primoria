export type WidgetAllowlistedDependency = {
  readonly global: string;
  readonly url: string;
  readonly kind: "script";
};

export declare const WIDGET_DEPENDENCY_ALLOWLIST: Readonly<Record<string, WidgetAllowlistedDependency>>;
export declare const WIDGET_DEPENDENCIES_BY_URL: Map<string, WidgetAllowlistedDependency>;

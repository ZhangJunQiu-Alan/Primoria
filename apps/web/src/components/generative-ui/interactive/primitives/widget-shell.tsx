import type { ReactNode } from "react";
import { WIDGET_COLORS } from "../palette";

export function WidgetShell({ componentId, title, children, className }: {
  componentId: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      data-component-id={componentId}
      className={className}
      style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface, containerType: "inline-size", containerName: "primoria-scene" }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <strong style={{ color: WIDGET_COLORS.ink, fontSize: 13.5 }}>{title}</strong>
      </header>
      {children}
    </section>
  );
}

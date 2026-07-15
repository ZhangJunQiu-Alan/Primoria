import type { ReactNode } from "react";
import { WIDGET_COLORS } from "../palette";

export function WidgetShell({ componentId, title, children }: {
  componentId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      style={{ overflow: "hidden", border: `1px solid ${WIDGET_COLORS.line}`, borderRadius: 10, background: WIDGET_COLORS.surface }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${WIDGET_COLORS.line}`, background: WIDGET_COLORS.surfaceSoft }}>
        <strong style={{ color: WIDGET_COLORS.ink, fontSize: 13.5 }}>{title}</strong>
        <span style={{ color: WIDGET_COLORS.muted, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10.5 }}>{componentId}</span>
      </header>
      {children}
    </section>
  );
}

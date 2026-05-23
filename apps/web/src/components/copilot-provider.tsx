"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import "@copilotkit/react-ui/v2/styles.css";
import { type ReactNode } from "react";

export function CopilotKitProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  if (!enabled) return <>{children}</>;
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="primoria_tutor">
      {children}
    </CopilotKit>
  );
}

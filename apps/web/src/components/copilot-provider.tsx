"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";

export function CopilotKitProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="primoria_tutor">
      {children}
    </CopilotKit>
  );
}

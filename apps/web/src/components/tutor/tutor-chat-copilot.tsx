"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";
import { PlanProgressCard } from "./plan-progress-card";

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();

  return (
    <div className="copilot-chat-shell">
      <PlanProgressCard />
      <CopilotChat
        labels={{
          chatInputPlaceholder: "Ask anything, or ask for an interactive visualization…",
        }}
      />
    </div>
  );
}

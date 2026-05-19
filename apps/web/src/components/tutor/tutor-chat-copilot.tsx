"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { usePrimoriaGenerativeUI } from "@/hooks/use-primoria-copilot";

export function TutorChatCopilot() {
  usePrimoriaGenerativeUI();

  return (
    <CopilotChat
      labels={{
        chatInputPlaceholder: "Ask anything, or ask for an interactive visualization…",
      }}
    />
  );
}

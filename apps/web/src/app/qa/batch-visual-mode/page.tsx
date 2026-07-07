import { notFound } from "next/navigation";
import { BatchVisualModeClient } from "./batch-visual-mode-client";

export default function BatchVisualModePage() {
  if (process.env.NODE_ENV === "production" || process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }

  return <BatchVisualModeClient />;
}

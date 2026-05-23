import { notFound } from "next/navigation";
import { WidgetRendererFixtureClient } from "./widget-renderer-fixture-client";

export default function WidgetRendererQaPage() {
  if (process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }

  return <WidgetRendererFixtureClient />;
}

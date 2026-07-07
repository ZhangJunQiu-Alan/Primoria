import { notFound } from "next/navigation";
import { InteractiveVisualResultsClient } from "./interactive-visual-results-client";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InteractiveVisualResultsPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production" || process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }

  const params = await searchParams;
  const runParam = params?.run;
  const run = typeof runParam === "string" && runParam ? runParam : "latest";
  return <InteractiveVisualResultsClient run={run} />;
}

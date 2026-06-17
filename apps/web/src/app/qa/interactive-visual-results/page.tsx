import { InteractiveVisualResultsClient } from "./interactive-visual-results-client";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InteractiveVisualResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const runParam = params?.run;
  const run = typeof runParam === "string" && runParam ? runParam : "latest";
  return <InteractiveVisualResultsClient run={run} />;
}

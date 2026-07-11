// Shared types for the in-browser code runner (Python via Pyodide, JS in-worker).

export type RunnableLanguage = "python" | "javascript";

export type OutputChunk =
  | { kind: "stdout"; text: string }
  | { kind: "stderr"; text: string }
  | { kind: "image"; mime: "image/png"; dataBase64: string };

export type RunResult = {
  status: "ok" | "error" | "timeout";
  chunks: OutputChunk[];
  errorMessage?: string;
};

export type RunPhase = "loading-runtime" | "running";

// Messages exchanged with the worker.
export type WorkerRequest = {
  id: number;
  language: RunnableLanguage;
  source: string;
};

export type WorkerResponse =
  | { id: number; type: "status"; phase: RunPhase }
  | { id: number; type: "result"; result: RunResult };

const NORMALIZE: Record<string, RunnableLanguage> = {
  python: "python",
  py: "python",
  python3: "python",
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  nodejs: "javascript",
};

/** Map a block's free-form language tag to a runnable language, or null if it
 * cannot run in the browser (C, SQL, pseudocode, …). */
export function runnableLanguage(language: string | undefined | null): RunnableLanguage | null {
  if (!language) return null;
  return NORMALIZE[language.trim().toLowerCase()] ?? null;
}

// Main-thread entry for the in-browser code runner. Owns a singleton worker
// (Pyodide stays warm across runs on the same page) and a hard 5s timeout that
// terminates the worker to kill infinite loops.
import type { RunnableLanguage, RunPhase, RunResult, WorkerRequest, WorkerResponse } from "./types";

export type { RunResult, OutputChunk, RunnableLanguage, RunPhase } from "./types";
export { runnableLanguage } from "./types";

// Code execution timeout (decision #4). Measured from when the worker reports
// "running" — Pyodide cold-load is covered separately by LOAD_TIMEOUT_MS.
const EXEC_TIMEOUT_MS = 5000;
// Watchdog for the load+dispatch window (CDN download + Pyodide init). Generous
// so slow networks aren't mistaken for runaway code.
const LOAD_TIMEOUT_MS = 60000;

let worker: Worker | null = null;
let seq = 0;
// Runs are serialized: the single shared worker can only execute one task at a
// time, and the timeout clock must not start while a task waits its turn.
// Without this, a second Run queued behind a first would have its timer already
// ticking (premature timeout) and could be killed when the first times out.
let queue: Promise<unknown> = Promise.resolve();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url));
  }
  return worker;
}

function killWorker() {
  worker?.terminate();
  worker = null;
}

export type RunOptions = {
  onStatus?: (phase: RunPhase) => void;
};

/** Run `source` in `language`, resolving with captured output. Rejects nothing —
 * errors and timeouts are reported via RunResult.status. Concurrent calls are
 * serialized so they never share the worker thread simultaneously. */
export function runCode(
  language: RunnableLanguage,
  source: string,
  options: RunOptions = {},
): Promise<RunResult> {
  const exec = () => runOnce(language, source, options);
  // Chain onto the queue regardless of the previous run's outcome.
  const result = queue.then(exec, exec);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function runOnce(
  language: RunnableLanguage,
  source: string,
  options: RunOptions,
): Promise<RunResult> {
  const w = getWorker();
  const id = ++seq;

  return new Promise<RunResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;

    function fail(errorMessage: string) {
      cleanup();
      killWorker(); // hard-kill: only way to stop a synchronous infinite loop
      resolve({ status: "timeout", chunks: [], errorMessage });
    }

    // The execution clock (5s) must not include Pyodide cold-load from CDN. Until
    // the worker reports "running", use a generous load watchdog so a slow CDN
    // download isn't mistaken for a runaway program; swap to the 5s exec timer
    // once execution actually starts.
    function armLoadWatchdog() {
      clearTimeout(timer);
      timer = setTimeout(
        () => fail(`运行环境加载超时（超过 ${LOAD_TIMEOUT_MS / 1000} 秒）`),
        LOAD_TIMEOUT_MS,
      );
    }

    function armExecTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => fail(`运行超时（超过 ${EXEC_TIMEOUT_MS / 1000} 秒已中止）`), EXEC_TIMEOUT_MS);
    }

    function cleanup() {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent<WorkerResponse>) {
      const data = event.data;
      if (data.id !== id) return;
      if (data.type === "status") {
        if (data.phase === "running") armExecTimer();
        options.onStatus?.(data.phase);
        return;
      }
      cleanup();
      resolve(data.result);
    }

    armLoadWatchdog();
    w.addEventListener("message", onMessage);
    const request: WorkerRequest = { id, language, source };
    w.postMessage(request);
  });
}

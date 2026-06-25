/// <reference lib="webworker" />
// Classic Web Worker that executes user code. Python runs on Pyodide (loaded
// from CDN on first use); JavaScript runs in-worker with console capture.
// The main thread (index.ts) owns the 5s timeout and terminates this worker on
// timeout. See temple/code_block_execution.md §4.
//
// NOTE: bundled by Next as a worker. Keep imports to the shared types only.
import type { OutputChunk, RunResult, WorkerRequest, WorkerResponse } from "./types";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Python harness: runs user source in a fresh namespace, captures stdout/stderr,
// blocks input(), and serializes any matplotlib figures to base64 PNG.
const PY_HARNESS = `
import sys, io, base64, json, traceback

def __primoria_run(user_src):
    out, err = io.StringIO(), io.StringIO()
    images = []
    g = {"__name__": "__main__"}
    def _no_input(*a, **k):
        raise RuntimeError("暂不支持输入(input)")
    g["input"] = _no_input
    status, msg = "ok", None
    _so, _se = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    try:
        exec(user_src, g)
    except Exception:
        status = "error"
        msg = traceback.format_exc()
    finally:
        # Always collect+close figures, even on error, so an aborted run cannot
        # leak open figures into the next run (which would then grab them).
        if "matplotlib" in sys.modules:
            try:
                import matplotlib.pyplot as plt
                for num in plt.get_fignums():
                    fig = plt.figure(num)
                    buf = io.BytesIO()
                    fig.savefig(buf, format="png", bbox_inches="tight")
                    images.append(base64.b64encode(buf.getvalue()).decode("ascii"))
                plt.close("all")
            except Exception:
                pass
        sys.stdout, sys.stderr = _so, _se
    return json.dumps({"status": status, "stdout": out.getvalue(), "stderr": err.getvalue(), "images": images, "msg": msg})
`;

type PyodideApi = {
  loadPackagesFromImports: (src: string) => Promise<void>;
  runPython: (src: string) => unknown;
  globals: { set: (k: string, v: unknown) => void };
};

let pyodide: PyodideApi | null = null;
let pyodideLoading: Promise<PyodideApi> | null = null;

function post(message: WorkerResponse) {
  ctx.postMessage(message);
}

async function getPyodide(id: number): Promise<PyodideApi> {
  if (pyodide) return pyodide;
  if (!pyodideLoading) {
    post({ id, type: "status", phase: "loading-runtime" });
    pyodideLoading = (async () => {
      (ctx as any).importScripts(`${PYODIDE_BASE}pyodide.js`);
      const py: PyodideApi = await (ctx as any).loadPyodide({ indexURL: PYODIDE_BASE });
      py.runPython('import os; os.environ["MPLBACKEND"] = "AGG"');
      py.runPython(PY_HARNESS);
      pyodide = py;
      return py;
    })();
  }
  return pyodideLoading;
}

async function runPython(id: number, source: string): Promise<RunResult> {
  let py: PyodideApi;
  try {
    py = await getPyodide(id);
  } catch (e) {
    return { status: "error", chunks: [], errorMessage: `运行环境加载失败：${String(e)}` };
  }
  post({ id, type: "status", phase: "running" });
  try {
    try {
      await py.loadPackagesFromImports(source);
    } catch {
      // Unknown/unavailable packages surface as ImportError in user code below.
    }
    py.globals.set("__primoria_src", source);
    const raw = py.runPython("__primoria_run(__primoria_src)") as string;
    const parsed = JSON.parse(raw) as {
      status: "ok" | "error";
      stdout: string;
      stderr: string;
      images: string[];
      msg: string | null;
    };
    const chunks: OutputChunk[] = [];
    if (parsed.stdout) chunks.push({ kind: "stdout", text: parsed.stdout });
    if (parsed.stderr) chunks.push({ kind: "stderr", text: parsed.stderr });
    for (const img of parsed.images) chunks.push({ kind: "image", mime: "image/png", dataBase64: img });
    if (parsed.status === "error" && parsed.msg) chunks.push({ kind: "stderr", text: parsed.msg });
    return {
      status: parsed.status,
      chunks,
      errorMessage: parsed.status === "error" ? "运行出错" : undefined,
    };
  } catch (e) {
    return { status: "error", chunks: [], errorMessage: String(e) };
  }
}

async function runJavascript(id: number, source: string): Promise<RunResult> {
  post({ id, type: "status", phase: "running" });
  const chunks: OutputChunk[] = [];
  const fmt = (args: unknown[]) =>
    args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ") + "\n";

  const sink: Record<string, (...a: unknown[]) => void> = {
    log: (...a) => chunks.push({ kind: "stdout", text: fmt(a) }),
    info: (...a) => chunks.push({ kind: "stdout", text: fmt(a) }),
    warn: (...a) => chunks.push({ kind: "stderr", text: fmt(a) }),
    error: (...a) => chunks.push({ kind: "stderr", text: fmt(a) }),
    debug: (...a) => chunks.push({ kind: "stdout", text: fmt(a) }),
  };
  const noop = () => {};
  // Any console method we don't implement (table, dir, group, assert, time, …)
  // resolves to a no-op so user code can't crash by calling it.
  const console = new Proxy(sink, {
    get: (target, prop, receiver) => (prop in target ? Reflect.get(target, prop, receiver) : noop),
  });

  try {
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
      ...args: string[]
    ) => (console: unknown) => Promise<unknown>;
    const fn = new AsyncFunction("console", source);
    await fn(console);
    return { status: "ok", chunks };
  } catch (e) {
    chunks.push({ kind: "stderr", text: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    return { status: "error", chunks, errorMessage: "运行出错" };
  }
}

ctx.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { id, language, source } = event.data;
  const result = language === "python" ? await runPython(id, source) : await runJavascript(id, source);
  post({ id, type: "result", result });
});

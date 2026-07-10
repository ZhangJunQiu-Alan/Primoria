import { Worker } from "node:worker_threads";

export const MERMAID_PARSE_TIMEOUT_MS = 30_000;
export const MAX_PENDING_MERMAID_PARSES = 32;

type ParseRequest = { id: number; definition: string };
type ParseResponse = { id: number; ok: true } | { id: number; ok: false; diagnostic: string };

export type MermaidWorker = {
  on(event: "message", listener: (message: unknown) => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "exit", listener: (code: number) => void): unknown;
  postMessage(message: ParseRequest): void;
  terminate(): Promise<number>;
  unref(): void;
};

type PendingParse = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type MermaidParserWorkerClientOptions = {
  createWorker?: () => MermaidWorker;
  timeoutMs?: number;
  maxPending?: number;
};

function workerError(message: string) {
  return new Error(message);
}

function isParseResponse(value: unknown): value is ParseResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "number" || typeof record.ok !== "boolean") return false;
  return record.ok || typeof record.diagnostic === "string";
}

function createNodeWorker(): MermaidWorker {
  return new Worker(new URL("./mermaid-validation-worker.mjs", import.meta.url));
}

export class MermaidParserWorkerClient {
  private readonly createWorker: () => MermaidWorker;
  private readonly timeoutMs: number;
  private readonly maxPending: number;
  private readonly pending = new Map<number, PendingParse>();
  private worker: MermaidWorker | null = null;
  private sequence = 0;

  constructor(options: MermaidParserWorkerClientOptions = {}) {
    this.createWorker = options.createWorker ?? createNodeWorker;
    this.timeoutMs = options.timeoutMs ?? MERMAID_PARSE_TIMEOUT_MS;
    this.maxPending = options.maxPending ?? MAX_PENDING_MERMAID_PARSES;
  }

  async parse(definition: string): Promise<void> {
    if (this.pending.size >= this.maxPending) {
      throw workerError(`Mermaid parser queue is full (${this.maxPending} pending requests).`);
    }

    const worker = this.getWorker();
    const id = ++this.sequence;

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        console.error("[mermaid-validation] parser worker timed out", {
          timeoutMs: this.timeoutMs,
          pendingRequests: this.pending.size,
        });
        this.failWorker(workerError(`Mermaid parser timed out after ${this.timeoutMs}ms.`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });

      try {
        worker.postMessage({ id, definition });
      } catch (error) {
        console.error("[mermaid-validation] parser worker dispatch failed", { error });
        this.failWorker(workerError("Mermaid parser dispatch failed."));
      }
    });
  }

  dispose(): void {
    this.failWorker(workerError("Mermaid parser worker was disposed."));
  }

  private getWorker(): MermaidWorker {
    if (this.worker) return this.worker;

    const worker = this.createWorker();
    this.worker = worker;
    worker.on("message", (message) => this.handleMessage(message));
    worker.on("error", (error) => {
      console.error("[mermaid-validation] parser worker failed", { error });
      this.failWorker(workerError("Mermaid parser worker failed."));
    });
    worker.on("exit", (code) => {
      if (this.worker !== worker) return;
      this.worker = null;
      if (this.pending.size > 0) {
        console.error("[mermaid-validation] parser worker exited with pending requests", {
          code,
          pendingRequests: this.pending.size,
        });
        this.rejectPending(workerError(`Mermaid parser worker exited before completion (code ${code}).`));
      }
    });
    worker.unref();
    return worker;
  }

  private handleMessage(message: unknown): void {
    if (!isParseResponse(message)) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.ok) pending.resolve();
    else pending.reject(workerError(message.diagnostic));
  }

  private failWorker(error: Error): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) void worker.terminate().catch(() => undefined);
    this.rejectPending(error);
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export const mermaidParserWorkerClient = new MermaidParserWorkerClient();

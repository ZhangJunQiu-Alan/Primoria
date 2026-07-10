import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MermaidParserWorkerClient,
  type MermaidWorker,
} from "../src/lib/courses/mermaid-parser-worker-client";

type ParseRequest = { id: number; definition: string };

class FakeWorker extends EventEmitter implements MermaidWorker {
  readonly requests: ParseRequest[] = [];
  terminated = false;

  constructor(private readonly onRequest?: (request: ParseRequest, worker: FakeWorker) => void) {
    super();
  }

  postMessage(request: ParseRequest): void {
    this.requests.push(request);
    this.onRequest?.(request, this);
  }

  async terminate(): Promise<number> {
    this.terminated = true;
    return 0;
  }

  unref(): void {}
}

const clients: MermaidParserWorkerClient[] = [];

function client(options: ConstructorParameters<typeof MermaidParserWorkerClient>[0]) {
  const instance = new MermaidParserWorkerClient(options);
  clients.push(instance);
  return instance;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const instance of clients.splice(0)) instance.dispose();
  vi.restoreAllMocks();
});

describe("Mermaid parser worker client", () => {
  it("resolves successful worker responses and returns safe parser diagnostics", async () => {
    const worker = new FakeWorker((request, currentWorker) => {
      queueMicrotask(() => {
        currentWorker.emit(
          "message",
          request.definition === "valid"
            ? { id: request.id, ok: true }
            : { id: request.id, ok: false, diagnostic: "safe syntax diagnostic" },
        );
      });
    });
    const parser = client({ createWorker: () => worker, timeoutMs: 100, maxPending: 2 });

    await expect(parser.parse("valid")).resolves.toBeUndefined();
    await expect(parser.parse("invalid")).rejects.toThrow("safe syntax diagnostic");
  });

  it("hard-terminates a worker that exceeds the total parse deadline", async () => {
    const worker = new FakeWorker();
    const parser = client({ createWorker: () => worker, timeoutMs: 5, maxPending: 2 });

    await expect(parser.parse("slow")).rejects.toThrow("timed out after 5ms");
    expect(worker.terminated).toBe(true);
  });

  it("creates a clean worker after a timeout", async () => {
    const firstWorker = new FakeWorker();
    const secondWorker = new FakeWorker((request, currentWorker) => {
      queueMicrotask(() => currentWorker.emit("message", { id: request.id, ok: true }));
    });
    const workers = [firstWorker, secondWorker];
    const parser = client({ createWorker: () => workers.shift()!, timeoutMs: 5, maxPending: 2 });

    await expect(parser.parse("slow")).rejects.toThrow("timed out");
    await expect(parser.parse("valid")).resolves.toBeUndefined();
    expect(firstWorker.terminated).toBe(true);
    expect(secondWorker.requests).toHaveLength(1);
  });

  it("rejects excess work instead of growing an unbounded queue", async () => {
    const worker = new FakeWorker();
    const parser = client({ createWorker: () => worker, timeoutMs: 100, maxPending: 1 });
    const firstResult = parser.parse("first").catch((error) => error);

    await expect(parser.parse("second")).rejects.toThrow("queue is full");
    parser.dispose();
    await expect(firstResult).resolves.toBeInstanceOf(Error);
  });
});

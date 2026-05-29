import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView } from "@/lib/workspaces/store";
import type { WorkspaceView } from "@/lib/workspaces/types";

export const dynamic = "force-dynamic";

type Subscriber = {
  controller: ReadableStreamDefaultController<Uint8Array>;
};

type WorkspaceEventHub = {
  subscribers: Set<Subscriber>;
  interval?: ReturnType<typeof setInterval>;
  ticking: boolean;
  lastVersion: string;
  ownerId?: string | null;
  workspaceId: string;
  createdAt: number;
};

const encoder = new TextEncoder();
const hubs = new Map<string, WorkspaceEventHub>();
const MAX_HUB_AGE_MS = 5 * 60 * 1000;

function workspaceVersion(view: WorkspaceView) {
  return [
    view.workspace.updatedAt,
    view.threads.map((thread) => `${thread.id}:${thread.updatedAt}`).join(","),
    view.messages.map((message) => `${message.id}:${message.createdAt}`).join(","),
    view.tasks.map((task) => `${task.id}:${task.updatedAt}:${task.status}:${task.resultSummary ?? ""}:${task.submittedAt ?? ""}`).join(","),
    view.members.map((member) => `${member.id}:${member.displayName}:${member.role}:${member.status ?? ""}`).join(","),
  ].join("|");
}

function sendEvent(subscriber: Subscriber, event: string, data: unknown) {
  subscriber.controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

function removeSubscriber(hubKey: string, subscriber: Subscriber) {
  const hub = hubs.get(hubKey);
  if (!hub) return;
  hub.subscribers.delete(subscriber);
  if (hub.subscribers.size === 0) {
    if (hub.interval) clearInterval(hub.interval);
    hubs.delete(hubKey);
  }
}

function closeHub(hubKey: string, event: string, data: unknown) {
  const hub = hubs.get(hubKey);
  if (!hub) return;
  if (hub.interval) clearInterval(hub.interval);
  hubs.delete(hubKey);
  for (const subscriber of hub.subscribers) {
    try {
      sendEvent(subscriber, event, data);
      subscriber.controller.close();
    } catch {
      // Client already disconnected.
    }
  }
  hub.subscribers.clear();
}

function retireHub(hubKey: string) {
  const hub = hubs.get(hubKey);
  if (!hub) return;
  if (hub.interval) clearInterval(hub.interval);
  hubs.delete(hubKey);
  for (const subscriber of hub.subscribers) {
    try {
      subscriber.controller.close();
    } catch {
      // Client already disconnected.
    }
  }
  hub.subscribers.clear();
}

async function tickHub(hubKey: string) {
  const hub = hubs.get(hubKey);
  if (!hub || hub.ticking) return;
  if (Date.now() - hub.createdAt > MAX_HUB_AGE_MS) {
    retireHub(hubKey);
    return;
  }
  hub.ticking = true;
  try {
    const view = await getWorkspaceView(hub.ownerId, hub.workspaceId);
    if (view.workspace.id !== hub.workspaceId) {
      closeHub(hubKey, "error", { error: "Workspace not found" });
      return;
    }

    const version = workspaceVersion(view);
    const event = version !== hub.lastVersion ? "workspace" : "ping";
    const data = event === "workspace" ? view : { at: Date.now() };
    if (event === "workspace") hub.lastVersion = version;

    for (const subscriber of Array.from(hub.subscribers)) {
      try {
        sendEvent(subscriber, event, data);
      } catch {
        removeSubscriber(hubKey, subscriber);
      }
    }
  } catch (error) {
    closeHub(hubKey, "error", { error: error instanceof Error ? error.message : "Workspace stream failed" });
  } finally {
    const latestHub = hubs.get(hubKey);
    if (latestHub) latestHub.ticking = false;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const { id } = await context.params;
  const hubKey = `${ownerId ?? "anonymous"}:${id}`;
  let subscriber: Subscriber | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let hub = hubs.get(hubKey);
      if (!hub) {
        hub = {
          subscribers: new Set<Subscriber>(),
          ticking: false,
          lastVersion: "",
          ownerId,
          workspaceId: id,
          createdAt: Date.now(),
        };
        hubs.set(hubKey, hub);
        hub.interval = setInterval(() => void tickHub(hubKey), 3000);
      }

      subscriber = { controller };
      hub.subscribers.add(subscriber);
      void tickHub(hubKey);
    },
    cancel() {
      if (subscriber) removeSubscriber(hubKey, subscriber);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

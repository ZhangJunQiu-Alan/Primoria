import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceView } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  function closeStream() {
    closed = true;
    if (interval) clearInterval(interval);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastVersion = "";

      async function sendEvent(event: string, data: unknown) {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      async function tick() {
        try {
          const view = await getWorkspaceView(user?.id, id);
          if (view.workspace.id !== id) {
            await sendEvent("error", { error: "Workspace not found" });
            controller.close();
            closeStream();
            return;
          }
          const version = [
            view.workspace.updatedAt,
            view.threads.map((thread) => `${thread.id}:${thread.updatedAt}`).join(","),
            view.messages.at(-1)?.id ?? "",
            view.tasks.map((task) => `${task.id}:${task.updatedAt}`).join(","),
            view.members.length,
          ].join("|");
          if (version !== lastVersion) {
            lastVersion = version;
            await sendEvent("workspace", view);
          } else {
            await sendEvent("ping", { at: Date.now() });
          }
        } catch (error) {
          await sendEvent("error", { error: error instanceof Error ? error.message : "Workspace stream failed" });
        }
      }

      await tick();
      interval = setInterval(() => void tick(), 3000);
    },
    cancel() {
      closeStream();
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

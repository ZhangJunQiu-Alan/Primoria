#!/usr/bin/env node
// Browser smoke for direct agent chat with real workspace data.
// Usage against an existing dev server:
//   WORKSPACE_E2E_BASE=http://localhost:3000 node apps/web/tests/workspace-direct-agent.e2e.mjs
// Without WORKSPACE_E2E_BASE it starts a Next dev server on PORT or 3120.

import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { startNextDevServer, stopNextDevServer } from "./workspace-e2e-next.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const PORT = process.env.PORT || "3120";
const BASE = process.env.WORKSPACE_E2E_BASE || `http://localhost:${PORT}`;
const BASE_HOSTNAME = new URL(BASE).hostname;
const SERVER_READY_TIMEOUT_MS = 90_000;
const RUN_ID = Date.now().toString(36);
const NEXT_DIST_DIR = `.next-direct-agent-e2e-${RUN_ID}`;
const WORKSPACE_NAME = `Direct Agent Workspace ${RUN_ID}`;
const EMPTY_WORKSPACE_NAME = `Empty Agent Workspace ${RUN_ID}`;
const PERSON_NAME = `Study Partner ${RUN_ID}`;
const ROOM_AGENT_NAME = `Room Coach ${RUN_ID}`;
const ROOM_NAME = `Focused Room ${RUN_ID}`;
const LIBRARY_AGENT_NAME = `Library Coach ${RUN_ID}`;
const PICKER_AGENT_NAME = `Picker Coach ${RUN_ID}`;
const AGENT_NAME = `Direct Coach ${RUN_ID}`;
const EMPTY_CUSTOM_AGENT_NAME = `Empty Space Coach ${RUN_ID}`;
const THREAD_NAME = `Direct Agent Chat ${RUN_ID}`;
const PERSON_MESSAGE = `Just checking notes with a person ${RUN_ID}`;
const LIBRARY_MESSAGE = `Use the library-created chat ${RUN_ID}`;
const PICKER_MESSAGE = `Use the picker-created chat ${RUN_ID}`;
const USER_MESSAGE = `Help me reason about derivatives ${RUN_ID}`;

function log(...args) {
  process.stdout.write(`[workspace-direct-agent.e2e] ${args.join(" ")}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function startServerIfNeeded() {
  if (process.env.WORKSPACE_E2E_BASE) return null;
  return startNextDevServer({ repoRoot, port: PORT, distDir: NEXT_DIST_DIR, log });
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE}/api/workspaces`, { cache: "no-store" });
      const text = await response.text();
      if (response.ok && text) {
        const data = JSON.parse(text);
        if (data?.workspace?.id) return;
      }
    } catch {
      /* retry */
    }
    await delay(750);
  }
  throw new Error(`server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms`);
}

async function requestJson(pathname, init, cookieHeader) {
  const response = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(cookieHeader ? { cookie: cookieHeader } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${pathname} failed: ${response.status} ${text || "<empty response>"}`);
  return data;
}

async function main() {
  const server = startServerIfNeeded();
  let browser;
  let failed = false;

  try {
    await waitForServer();

    const ownerCookie = `primoria_workspace_owner=local_direct_agent_${RUN_ID.replace(/[^a-z0-9]/gi, "")}`;

    const created = await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: WORKSPACE_NAME }),
    }, ownerCookie);
    const workspaceId = created.workspace.id;

    const emptyCreated = await requestJson("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name: EMPTY_WORKSPACE_NAME }),
    }, ownerCookie);
    const emptyWorkspaceId = emptyCreated.workspace.id;

    const personData = await requestJson(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify({
        displayName: PERSON_NAME,
        role: "Person",
        status: "active",
      }),
    }, ownerCookie);
    assert(personData.member?.id, "real person member is created before opening the workspace");

    const libraryAgentData = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        templateKey: "socratic-coach",
        displayName: LIBRARY_AGENT_NAME,
        visibility: "private",
      }),
    }, ownerCookie);
    assert(libraryAgentData.profile?.id, "saved personal agent profile is created before opening the workspace");
    assert(!libraryAgentData.member, "saved personal agent is not forced into workspace members");

    const roomData = await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({
        type: "room",
        name: ROOM_NAME,
        agentTriggerMode: "mention_only",
        allowedAgentProfileIds: [],
      }),
    }, ownerCookie);
    assert(Array.isArray(roomData.thread?.allowedAgentProfileIds), "focused room starts with explicit agent allowlist");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await page.context().addCookies([{ name: "primoria_workspace_owner", value: ownerCookie.split("=")[1], domain: BASE_HOSTNAME, path: "/" }]);
    await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });

    await page.locator(".workspace-list", { hasText: EMPTY_WORKSPACE_NAME }).getByText(EMPTY_WORKSPACE_NAME).click();
    await page.locator(".workspace-directory-head", { hasText: EMPTY_WORKSPACE_NAME }).waitFor();
    await page.locator(".active-chat-empty", { hasText: "No messages yet" }).waitFor();
    await page.locator(".active-chat-empty").getByRole("button", { name: "Add an agent" }).click();
    const emptyWorkspaceAgentForm = page.locator(".workspace-member-popover");
    await emptyWorkspaceAgentForm.waitFor();
    await emptyWorkspaceAgentForm.getByRole("button", { name: "Custom agent" }).click();
    await emptyWorkspaceAgentForm.getByLabel("Agent display name").fill(EMPTY_CUSTOM_AGENT_NAME);
    await emptyWorkspaceAgentForm.getByLabel("Agent purpose").fill(`Help an empty workspace get started ${RUN_ID}`);
    await emptyWorkspaceAgentForm.getByLabel("Agent behavior").fill("Ask one clear question, then propose a concrete next step.");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${emptyWorkspaceId}/agents`) && response.request().method() === "POST" && response.status() === 200),
      emptyWorkspaceAgentForm.locator('.workspace-member-popover-actions button[type="submit"]').click(),
    ]);
    const emptyWorkspaceView = await requestJson(`/api/workspaces/${emptyWorkspaceId}`, undefined, ownerCookie);
    assert(emptyWorkspaceView.threads.length === emptyCreated.threads.length, "custom agent creation in an empty room does not invent extra threads");
    assert(
      emptyWorkspaceView.members.some((member) => member.displayName === EMPTY_CUSTOM_AGENT_NAME && member.agentProfileId),
      "custom agent creation in an empty workspace creates a real agent member",
    );
    assert(
      emptyWorkspaceView.agentProfiles.some((profile) => profile.displayName === EMPTY_CUSTOM_AGENT_NAME),
      "custom agent creation in an empty workspace creates a real agent profile",
    );

    await page.locator(".workspace-list", { hasText: WORKSPACE_NAME }).getByText(WORKSPACE_NAME).click();
    await page.locator(".workspace-directory-head", { hasText: WORKSPACE_NAME }).waitFor();
    await page.locator(".workspace-empty-actions").getByRole("button", { name: "Add a person" }).waitFor();
    await page.locator(".workspace-empty-actions").getByRole("button", { name: "Add an agent" }).waitFor();
    await page.locator(".workspace-empty-actions").getByRole("button", { name: "Add a person" }).click();
    const emptyPersonForm = page.locator(".workspace-member-popover");
    await emptyPersonForm.waitFor();
    await emptyPersonForm.getByRole("button", { name: "Person", exact: true }).evaluate((element) => {
      if (!element.classList.contains("active")) throw new Error("empty chat Add a person opens the People picker");
    });
    await emptyPersonForm.getByRole("button", { name: "Cancel" }).click();
    await page.locator(".workspace-empty-actions").getByRole("button", { name: "Add an agent" }).click();
    const emptyAgentForm = page.locator(".workspace-member-popover");
    await emptyAgentForm.waitFor();
    await emptyAgentForm.getByRole("button", { name: "Agent", exact: true }).evaluate((element) => {
      if (!element.classList.contains("active")) throw new Error("empty chat Add an agent opens the Agent picker");
    });
    await emptyAgentForm.getByRole("button", { name: "Cancel" }).click();
    await page.locator(".workspace-empty-actions").getByRole("button", { name: "New task" }).click();
    await page.locator("details.workspace-side-drawer[open]").waitFor();
    const emptyTaskTitle = await page.getByLabel("Task title").inputValue();
    assert(emptyTaskTitle === `Follow up from ${ROOM_NAME}`, "empty chat New task opens the real task form with current room context");
    await page.getByRole("button", { name: /Private/ }).click();
    await page.locator(".workspace-start-state", { hasText: "No private chats yet" }).waitFor();
    await page.locator(".workspace-start-state").getByRole("button", { name: "Add an agent" }).click();
    const privateStartAgentForm = page.locator(".workspace-member-popover");
    await privateStartAgentForm.waitFor();
    await privateStartAgentForm.getByRole("button", { name: "Agent", exact: true }).evaluate((element) => {
      if (!element.classList.contains("active")) throw new Error("private start Add an agent opens the Agent picker");
    });
    await privateStartAgentForm.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: /Groups/ }).click();
    await page.getByRole("button", { name: "Invite" }).click();
    const personForm = page.locator(".workspace-member-popover");
    await personForm.waitFor();
    await personForm.getByLabel("Search people or agents").fill("Study Partner");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/threads`) && response.request().method() === "POST" && response.status() === 200),
      personForm.getByRole("button", { name: new RegExp(PERSON_NAME) }).click(),
    ]);
    await page.locator(".workspace-room", { hasText: PERSON_NAME }).waitFor();
    const personDirectView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    const personThread = personDirectView.threads.find((thread) => thread.type === "direct" && thread.name === PERSON_NAME);
    assert(personThread?.participantIds?.includes(personData.member.id), "people picker creates a private chat with the selected person");
    await page.getByLabel("Message").fill(PERSON_MESSAGE);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/messages`) && response.status() === 200),
      page.getByRole("button", { name: "Send" }).click(),
    ]);
    const personMessageView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    assert(personMessageView.messages.some((message) => message.content === PERSON_MESSAGE), "people private chat persists a real human message");
    assert(
      !personMessageView.agentRuns.some((run) => run.threadId === personThread.id),
      "people private chat does not auto-trigger agent runs",
    );

    await page.getByRole("button", { name: /Groups/ }).click();
    await page.locator(".workspace-chat-section", { hasText: ROOM_NAME }).getByText(ROOM_NAME).click();
    await page.getByRole("button", { name: "Invite" }).click();
    const roomMemberForm = page.locator(".workspace-member-popover");
    await roomMemberForm.waitFor();
    await roomMemberForm.getByRole("button", { name: "Agent", exact: true }).click();
    await roomMemberForm.getByLabel("Search people or agents").fill("generate_course");
    await roomMemberForm.getByRole("button", { name: /Course Designer/ }).waitFor();
    assert(!(await roomMemberForm.getByRole("button", { name: /Socratic Coach/ }).count()), "agent picker filters templates by action capability");
    await roomMemberForm.getByLabel("Search people or agents").fill("socratic-questioning");
    await roomMemberForm.getByRole("button", { name: /Socratic Coach/ }).waitFor();
    await roomMemberForm.getByLabel("Search people or agents").fill("Practice questions");
    await roomMemberForm.getByRole("button", { name: /Examiner/ }).waitFor();
    await roomMemberForm.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Invite" }).click();
    await roomMemberForm.waitFor();
    await roomMemberForm.getByRole("button", { name: "Agent", exact: true }).click();
    await roomMemberForm.getByRole("button", { name: /Course Designer/ }).waitFor();
    await roomMemberForm.getByRole("button", { name: /Socratic Coach/ }).waitFor();
    await roomMemberForm.getByRole("button", { name: "Add to workspace" }).first().click();
    await roomMemberForm.getByRole("button", { name: /Socratic Coach/ }).click();
    await roomMemberForm.getByLabel("Agent display name").fill(ROOM_AGENT_NAME);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/agents`) && response.request().method() === "POST" && response.status() === 200),
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/threads`) && response.request().method() === "PATCH" && response.status() === 200),
      roomMemberForm.locator('.workspace-member-popover-actions button[type="submit"]').click(),
    ]);

    const roomAllowlistView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    const roomAgent = roomAllowlistView.members.find((member) => member.displayName === ROOM_AGENT_NAME);
    const updatedRoom = roomAllowlistView.threads.find((thread) => thread.id === roomData.thread.id);
    assert(roomAgent?.agentProfileId, "room add flow creates a real agent member");
    assert(updatedRoom?.allowedAgentProfileIds?.includes(roomAgent.agentProfileId), "room add flow adds the new agent profile to the active room allowlist");

    if (!(await page.locator("details.workspace-side-drawer[open]").count())) {
      await page.getByRole("button", { name: "Panel" }).click();
    }
    const assigneeOptions = await page.getByLabel("Task assignee").locator("option").allTextContents();
    assert(
      assigneeOptions.includes(`${ROOM_AGENT_NAME} / Agent collaborator`),
      "task assignee picker labels agent members as agent collaborators",
    );
    assert(
      assigneeOptions.includes(`${PERSON_NAME} / Person collaborator`),
      "task assignee picker labels human members as person collaborators",
    );
    const libraryCard = page.locator(".workspace-agent-library-card", { hasText: LIBRARY_AGENT_NAME });
    await libraryCard.waitFor();
    await libraryCard.getByText("No runs yet").waitFor();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/agents`) && response.request().method() === "POST" && response.status() === 200),
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/threads`) && response.request().method() === "POST" && response.status() === 200),
      libraryCard.getByRole("button", { name: "Start direct chat" }).click(),
    ]);
    await page.locator(".workspace-room", { hasText: LIBRARY_AGENT_NAME }).waitFor();
    await page.getByLabel("Message").fill(LIBRARY_MESSAGE);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/messages`) && response.status() === 200),
      page.getByRole("button", { name: "Send" }).click(),
    ]);
    await page.locator(".workspace-message.agent", { hasText: LIBRARY_AGENT_NAME }).waitFor();

    const libraryView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    const libraryAgent = libraryView.members.find((member) => member.displayName === LIBRARY_AGENT_NAME);
    const libraryThread = libraryView.threads.find((thread) => thread.type === "direct" && thread.name === LIBRARY_AGENT_NAME);
    assert(libraryAgent?.agentProfileId === libraryAgentData.profile.id, "library action adds the saved profile as a real agent member");
    assert(libraryThread?.participantIds?.includes(libraryAgent.id), "library action creates a direct thread with the agent participant");
    assert(libraryView.messages.some((message) => message.content === LIBRARY_MESSAGE), "library direct flow sends a real human message");
    assert(
      libraryView.agentRuns.some((run) => run.trigger === "direct_chat" && run.threadId === libraryThread?.id),
      "library direct flow triggers the agent through direct_chat",
    );

    await page.getByRole("button", { name: "Invite" }).click();
    const memberForm = page.locator(".workspace-member-popover");
    await memberForm.waitFor();
    await memberForm.getByRole("button", { name: "Agent", exact: true }).click();
    await memberForm.getByRole("button", { name: "Start private chat" }).first().click();
    await memberForm.getByRole("button", { name: /Socratic Coach/ }).click();
    await memberForm.getByLabel("Agent display name").fill(PICKER_AGENT_NAME);
    const submitAgent = memberForm.locator('.workspace-member-popover-actions button[type="submit"]');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/threads`) && response.status() === 200),
      submitAgent.click(),
    ]);
    await page.locator(".workspace-room", { hasText: PICKER_AGENT_NAME }).waitFor();
    await page.locator(".workspace-chat-section", { hasText: PICKER_AGENT_NAME }).getByText(PICKER_AGENT_NAME).waitFor();
    await page.getByLabel("Message").fill(PICKER_MESSAGE);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/workspaces/${workspaceId}/messages`) && response.status() === 200),
      page.getByRole("button", { name: "Send" }).click(),
    ]);
    await page.locator(".workspace-message.agent", { hasText: PICKER_AGENT_NAME }).waitFor();
    await page.locator(".workspace-agent-run-chip", { hasText: "direct chat" }).waitFor();

    const pickerView = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    const pickerAgent = pickerView.members.find((member) => member.displayName === PICKER_AGENT_NAME);
    const pickerThread = pickerView.threads.find((thread) => thread.type === "direct" && thread.name === PICKER_AGENT_NAME);
    assert(pickerAgent?.agentProfileId, "picker direct flow creates a real agent member");
    assert(pickerThread?.participantIds?.includes(pickerAgent.id), "picker direct flow creates a direct thread with the agent participant");
    assert(pickerView.messages.some((message) => message.content === PICKER_MESSAGE), "picker direct flow sends a real human message");
    assert(
      pickerView.agentRuns.some((run) => run.trigger === "direct_chat" && run.threadId === pickerThread?.id),
      "picker direct flow triggers the agent through direct_chat",
    );

    const agentData = await requestJson(`/api/workspaces/${workspaceId}/agents`, {
      method: "POST",
      body: JSON.stringify({
        templateKey: "socratic-coach",
        displayName: AGENT_NAME,
      }),
    }, ownerCookie);
    const agentMemberId = agentData.member.id;

    const threadData = await requestJson(`/api/workspaces/${workspaceId}/threads`, {
      method: "POST",
      body: JSON.stringify({
        type: "direct",
        name: THREAD_NAME,
        description: "direct agent e2e",
        participantIds: [agentMemberId],
      }),
    }, ownerCookie);
    const threadId = threadData.thread.id;
    assert(threadData.thread.participantIds.includes(agentMemberId), "direct thread includes agent participant");

    const messageData = await requestJson(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ threadId, content: USER_MESSAGE }),
    }, ownerCookie);
    assert(messageData.message.content === USER_MESSAGE, "message API persists real human message");
    assert(messageData.agentMessages?.length === 1, "message API returns one real agent message");
    assert(messageData.agentMessages[0].senderName === AGENT_NAME, "direct chat agent response uses agent identity");
    assert(messageData.agentRuns?.length === 1, "message API returns one agent run");
    assert(messageData.agentRuns[0].trigger === "direct_chat", "agent run records direct_chat trigger");
    assert(messageData.agentRuns[0].inputMessageId === messageData.message.id, "agent run links input message");
    assert(messageData.agentRuns[0].outputMessageId === messageData.agentMessages[0].id, "agent run links output message");
    assert(messageData.agentRunEvents?.some((event) => event.label === "completed"), "agent run events include completion");

    const view = await requestJson(`/api/workspaces/${workspaceId}`, undefined, ownerCookie);
    assert(view.messages.some((message) => message.id === messageData.message.id), "workspace view includes human message");
    assert(view.messages.some((message) => message.id === messageData.agentMessages[0].id), "workspace view includes agent response");
    assert(view.agentRuns.some((run) => run.id === messageData.agentRuns[0].id && run.trigger === "direct_chat"), "workspace view includes direct chat run");

    await page.locator(".workspace-message.agent", { hasText: PICKER_AGENT_NAME }).waitFor();
    await page.locator(".workspace-agent-run-chip", { hasText: "direct chat" }).waitFor();

    log("ALL CHECKS PASSED");
  } catch (error) {
    failed = true;
    log("TEST FAILED:", error.message);
  } finally {
    if (browser) await browser.close();
    if (server) await stopNextDevServer({ ...server, log });
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  log("fatal:", error.message);
  process.exit(1);
});

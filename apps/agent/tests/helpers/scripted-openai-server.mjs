import { createServer } from "node:http";

function messageText(body) {
  return JSON.stringify(body?.messages ?? []);
}

function messageContent(body, role) {
  return (body?.messages ?? [])
    .filter((message) => !role || message.role === role)
    .map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? ""))
    .join("\n");
}

function streamChunk(response, value) {
  response.write(`data: ${JSON.stringify(value)}\n\n`);
}

function textResponse(response, content) {
  response.writeHead(200, { "content-type": "text/event-stream" });
  streamChunk(response, {
    id: "scripted-text",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }],
  });
  streamChunk(response, {
    id: "scripted-text",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  });
  streamChunk(response, {
    id: "scripted-text",
    object: "chat.completion.chunk",
    created: 0,
    model: "test",
    choices: [],
    usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
  });
  response.end("data: [DONE]\n\n");
}

function jsonResponse(response, body, content) {
  const tool = body?.tools?.[0]?.function;
  if (body?.stream) {
    if (!tool) {
      textResponse(response, JSON.stringify(content));
      return;
    }
    response.writeHead(200, { "content-type": "text/event-stream" });
    streamChunk(response, {
      id: "scripted-json-tool",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, id: "call_scripted_json", type: "function", function: { name: tool.name, arguments: JSON.stringify(content) } }] }, finish_reason: null }],
    });
    streamChunk(response, {
      id: "scripted-json-tool",
      object: "chat.completion.chunk",
      created: 0,
      model: "test",
      choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
    });
    response.end("data: [DONE]\n\n");
    return;
  }
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    id: "scripted-json",
    object: "chat.completion",
    created: 0,
    model: "test",
    choices: [{
      index: 0,
      message: tool
        ? { role: "assistant", content: null, tool_calls: [{ id: "call_scripted_json", type: "function", function: { name: tool.name, arguments: JSON.stringify(content) } }] }
        : { role: "assistant", content: JSON.stringify(content) },
      finish_reason: tool ? "tool_calls" : "stop",
    }],
    usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
  }));
}

function lessonPlan(body) {
  const system = messageContent(body, "system");
  const match = system.match(/VALID CONCEPT IDS:\s*([^\n]+)/);
  const concepts = match?.[1].split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (concepts.length < 1 || concepts.length > 3) throw new Error(`scripted planner received ${concepts.length} concepts`);
  const blocks = [];
  let order = 1;
  const add = (type, role, conceptIds, goal) => blocks.push({
    order: order++,
    type,
    role,
    conceptIds,
    goal,
    writerInstruction: `Write deterministic regression content that clearly satisfies this ${role} block.`,
  });
  add("T", "hook", [concepts[0]], "Connect the lesson to a concrete question");
  for (const concept of concepts) {
    add("T", "explanation", [concept], `Explain ${concept}`);
    add("A", "example", [concept], `Give an example of ${concept}`);
    add("V", "deepening", [concept], `Visualize the mechanism of ${concept}`);
    add("V", "deepening", [concept], `Let the learner vary ${concept}`);
    add("Q", "assessment", [concept], `Check understanding of ${concept}`);
  }
  add("X", "transfer", concepts, "Transfer the connected concepts to a new setting");
  add("T", "summary", concepts, "Summarize the lesson and next step");
  return { v: 2, lesson: ["Deterministic generated lesson", 12], blocks };
}

function visualContent(engine, order) {
  const base = { title: `Interactive concept check ${order}`, description: "Adjust the representation and observe the relationship." };
  if (engine === "math_explorer") {
    return { ...base, mathExplorer: { mode: "cartesian", functions: [{ expr: "a*x" }], parameters: [{ name: "a", min: -2, max: 2, default: 1 }] } };
  }
  if (engine === "physics") {
    return { ...base, physicsScene: { render: { width: 600, height: 400 }, bodies: [{ shape: "circle", x: 300, y: 80, r: 20 }] } };
  }
  if (engine === "algorithm") {
    return { ...base, algorithmViz: { algorithm: "Deterministic steps", steps: [{ description: "Inspect the input", kind: "array", array: { values: [3, 1, 2] } }] } };
  }
  if (engine === "echarts") {
    return { ...base, echartsOption: { xAxis: { type: "category", data: ["A", "B"] }, yAxis: { type: "value" }, series: [{ type: "bar", data: [1, 2] }] } };
  }
  if (engine === "mermaid") return { ...base, mermaidDefinition: "flowchart LR\nA[Input] --> B[Result]" };
  return {
    ...base,
    html: '<div><label>Value <input id="v" type="range" min="0" max="10" value="5"></label><output id="o">5</output><script>const v=document.getElementById("v"),o=document.getElementById("o");v.addEventListener("input",()=>o.textContent=v.value);</script></div>',
  };
}

function blockBatch(body) {
  const user = messageContent(body, "user");
  const lines = user.split("\n").filter((line) => /^- order \d+:/.test(line));
  return lines.map((line) => {
    const match = line.match(/^- order (\d+): ([a-z]+) \(role ([a-z]+)\)/);
    if (!match) throw new Error(`unrecognized scripted block line: ${line}`);
    const order = Number(match[1]);
    const type = match[2];
    if (type === "text") return { order, title: `Concept ${order}`, markdown: "This deterministic explanation connects the idea to a concrete result." };
    if (type === "analogy") return { order, title: `Analogy ${order}`, source: "A map", target: "The concept", mapping: "Both connect a starting point to a dependable destination." };
    if (type === "transfer") return { order, title: "Transfer", fromDomain: "Lesson example", toDomain: "New situation", explanation: "Preserve the same relationship while changing the context.", example: "Apply the rule to a fresh input and compare the result." };
    if (type === "quiz") return { order, title: `Concept check ${order}`, questions: [{ kind: "single", id: `q${order}`, question: "Which answer demonstrates the relationship?", choices: [{ id: "a", text: "The connected result" }, { id: "b", text: "An unrelated result" }], correctId: "a", explanation: "The connected result follows the lesson relationship." }] };
    if (type === "visual") {
      const engine = line.match(/engine is FIXED to "([a-z_]+)"/)?.[1] ?? "html";
      return { order, ...visualContent(engine, order) };
    }
    throw new Error(`unsupported scripted block type: ${type}`);
  });
}

export async function startScriptedOpenAIServer() {
  const attempts = new Map();
  const requests = [];
  const sockets = new Set();
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    requests.push(body);
    const text = messageText(body);
    const system = messageContent(body, "system");

    if (system.includes("Lesson Planner")) {
      jsonResponse(response, body, lessonPlan(body));
      return;
    }

    if (system.includes("Block Writer")) {
      jsonResponse(response, body, blockBatch(body));
      return;
    }

    if (text.includes("PRE_OUTPUT_RETRY_MARKER")) {
      const count = (attempts.get("pre-output") ?? 0) + 1;
      attempts.set("pre-output", count);
      if (count === 1) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "temporary scripted failure" } }));
        return;
      }
      textResponse(response, "recovered after retry");
      return;
    }

    if (text.includes("POST_OUTPUT_FAILURE_MARKER")) {
      attempts.set("post-output", (attempts.get("post-output") ?? 0) + 1);
      response.writeHead(200, { "content-type": "text/event-stream" });
      streamChunk(response, {
        id: "scripted-partial",
        object: "chat.completion.chunk",
        created: 0,
        model: "test",
        choices: [{ index: 0, delta: { role: "assistant", content: "visible partial output" }, finish_reason: null }],
      });
      setTimeout(() => response.destroy(new Error("scripted post-output disconnect")), 25);
      return;
    }

    if (text.includes("TOOL_DIAGRAM_MARKER") && !text.includes('"role":"tool"')) {
      attempts.set("tool", (attempts.get("tool") ?? 0) + 1);
      response.writeHead(200, { "content-type": "text/event-stream" });
      streamChunk(response, {
        id: "scripted-tool",
        object: "chat.completion.chunk",
        created: 0,
        model: "test",
        choices: [{
          index: 0,
          delta: {
            role: "assistant",
            tool_calls: [{
              index: 0,
              id: "call_scripted_diagram",
              type: "function",
              function: {
                name: "render_diagram",
                arguments: JSON.stringify({ title: "Regression path", definition: "flowchart LR;A-->B" }),
              },
            }],
          },
          finish_reason: null,
        }],
      });
      streamChunk(response, {
        id: "scripted-tool",
        object: "chat.completion.chunk",
        created: 0,
        model: "test",
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
      });
      response.end("data: [DONE]\n\n");
      return;
    }

    textResponse(response, "runtime ok");
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    requests,
    attemptCount(scenario) {
      return attempts.get(scenario) ?? 0;
    },
    async close() {
      await new Promise((resolve) => {
        server.close(resolve);
        for (const socket of sockets) socket.destroy();
      });
    },
  };
}

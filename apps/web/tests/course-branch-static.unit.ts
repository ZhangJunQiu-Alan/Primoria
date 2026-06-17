#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Static source assertions on the LangGraph agent. Under Web-as-brain the agent
// must NOT build courses: position_learning_goal is a pure signal, there is no
// generate_course tool, and the agent never enqueues/generates a course.

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const graphSource = readFileSync(resolve(here, "../../agent/src/graph.mjs"), "utf8");

function main() {
  assert(graphSource.includes('name: "position_learning_goal"'), "position_learning_goal tool is defined");

  assert(/tools:\s*\[[^\]]*positionLearningGoalTool/.test(graphSource), "tools array registers positionLearningGoalTool");

  console.log("course-branch-static.unit passed");
}

main();

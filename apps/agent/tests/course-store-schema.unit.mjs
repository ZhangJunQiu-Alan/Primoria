#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { courseBlocks, summarizeCourse } from "../src/course-types.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const storeSource = readFileSync(resolve(here, "../src/course-store.mjs"), "utf8");
const courseTypesSource = readFileSync(resolve(here, "../src/course-types.mjs"), "utf8");

const coursesSelects = storeSource.match(/select[\s\S]*?from courses/gi) ?? [];

assert(storeSource.includes("export async function getCourse"), "agent exposes the course-card read path");
assert(!storeSource.includes("export async function saveCourse"), "agent does not own course writes");
assert(!storeSource.includes("export async function updateBlock"), "agent does not own block writes");
assert(!storeSource.includes("export async function listCourses"), "agent does not expose unused course listing");
assert(!/\b(?:insert\s+into|update\s+(?:courses|lessons)|delete\s+from)\b/i.test(storeSource), "agent course store contains no mutating SQL");
assert(coursesSelects.every((select) => !/\bblocks\b/.test(select)), "agent courses select does not read removed courses.blocks");
assert(storeSource.includes("where id = ${id} and owner_id = ${ownerId}"), "agent course read is owner-scoped");
assert(storeSource.includes("from lessons"), "agent store reads lesson rows");
assert(courseTypesSource.includes("export function courseBlocks"), "agent exposes courseBlocks compatibility helper");

const sample = {
  id: "crs_test",
  title: "Algorithms",
  topic: "Algorithms",
  summary: "Algorithm basics",
  estimatedMinutes: 60,
  lessons: [
    {
      id: "lesson_2",
      title: "Later",
      role: "new",
      progress: "not_started",
      status: "generated",
      sortKey: 2,
      blocks: [{ id: "b2", type: "quiz", title: "Check" }],
      estimatedMinutes: 20,
      updatedAt: 2,
    },
    {
      id: "lesson_1",
      title: "First",
      role: "new",
      progress: "in_progress",
      status: "generated",
      sortKey: 1,
      blocks: [{ id: "b1", type: "text", title: "Intro" }],
      estimatedMinutes: 15,
      updatedAt: 1,
    },
    {
      id: "lesson_3",
      title: "Planned",
      role: "remediation",
      progress: "not_started",
      status: "planned",
      sortKey: 3,
      blocks: null,
      estimatedMinutes: null,
      updatedAt: 3,
    },
  ],
  version: 1,
  createdAt: 1,
  updatedAt: 2,
};

assert(courseBlocks(sample).map((block) => block.id).join(",") === "b1,b2", "courseBlocks flattens generated lessons in order");
const summary = summarizeCourse(sample);
assert(summary.outline.length === 2, "summary outline comes from flattened lesson blocks");
assert(summary.lessonCount === 3, "summary preserves lesson count");
assert(summary.generatedLessonCount === 2, "summary counts generated lessons");
assert(summary.plannedLessonCount === 1, "summary counts planned lessons");
assert(summary.currentLesson?.id === "lesson_1", "summary keeps current lesson metadata");

process.stdout.write("[agent course-store-schema.unit] ALL CHECKS PASSED\n");

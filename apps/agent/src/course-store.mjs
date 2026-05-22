// @ts-check

import fs from "node:fs";
import path from "node:path";
import { summarizeCourse } from "./course-types.mjs";

const globalKey = "__primoria_course_store__";
const storeFile = path.join(findWorkspaceRoot(), ".primoria-courses.json");

function getStore() {
  const globalAny = /** @type {any} */ (globalThis);
  let store = globalAny[globalKey];
  if (!store) {
    store = { courses: new Map(), hydrated: false, fileMtimeMs: 0 };
    globalAny[globalKey] = store;
  }
  if (!store.hydrated) hydrateStore(store);
  else refreshStoreIfChanged(store);
  return store;
}

/**
 * @param {any} course
 */
export function saveCourse(course) {
  getStore().courses.set(course.id, course);
  persistStore();
  return course;
}

/**
 * @param {string} id
 */
export function getCourse(id) {
  return getStore().courses.get(id);
}

export function listCourses() {
  const courses = Array.from(getStore().courses.values());
  courses.sort((a, b) => b.createdAt - a.createdAt);
  return courses.map(summarizeCourse);
}

/**
 * @param {string} courseId
 * @param {string} blockId
 * @param {any} next
 */
export function updateBlock(courseId, blockId, next) {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const blocks = course.blocks.map((/** @type {any} */ block) => (block.id === blockId ? next : block));
  const updated = { ...course, blocks, updatedAt: Date.now() };
  return saveCourse(updated);
}

/**
 * @param {{ hydrated: boolean; courses: Map<string, any>; fileMtimeMs: number }} store
 */
function hydrateStore(store) {
  store.hydrated = true;
  try {
    if (!fs.existsSync(storeFile)) {
      store.fileMtimeMs = 0;
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((/** @type {any} */ course) => [course.id, course]));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to hydrate course store", error);
  }
}

/**
 * @param {{ hydrated: boolean; courses: Map<string, any>; fileMtimeMs?: number }} store
 */
function refreshStoreIfChanged(store) {
  try {
    if (!fs.existsSync(storeFile)) {
      if ((store.fileMtimeMs ?? 0) !== 0) {
        store.courses = new Map();
        store.fileMtimeMs = 0;
      }
      return;
    }

    const mtimeMs = fs.statSync(storeFile).mtimeMs;
    if (mtimeMs === (store.fileMtimeMs ?? 0)) return;

    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((/** @type {any} */ course) => [course.id, course]));
    store.fileMtimeMs = mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to refresh course store", error);
  }
}

function persistStore() {
  try {
    const store = getStore();
    const courses = Array.from(store.courses.values());
    fs.writeFileSync(storeFile, JSON.stringify({ courses }, null, 2));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to persist course store", error);
  }
}

function findWorkspaceRoot() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

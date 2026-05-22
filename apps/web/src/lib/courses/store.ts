import type { Course, CourseBlock, CourseSummary } from "./types";
import { summarizeCourse } from "./types";
import fs from "node:fs";
import path from "node:path";

type GlobalStore = {
  courses: Map<string, Course>;
  hydrated: boolean;
  fileMtimeMs: number;
};

const globalKey = "__primoria_course_store__";
const globalAny = globalThis as unknown as Record<string, GlobalStore | undefined>;
const storeFile = path.join(findWorkspaceRoot(), ".primoria-courses.json");

function getStore(): GlobalStore {
  let store = globalAny[globalKey];
  if (!store) {
    store = { courses: new Map(), hydrated: false, fileMtimeMs: 0 };
    globalAny[globalKey] = store;
  }
  if (!store.hydrated) {
    hydrateStore(store);
  } else {
    refreshStoreIfChanged(store);
  }
  return store;
}

export function saveCourse(course: Course): Course {
  getStore().courses.set(course.id, course);
  persistStore();
  return course;
}

export function getCourse(id: string): Course | undefined {
  return getStore().courses.get(id);
}

export function listCourses(): CourseSummary[] {
  const courses = Array.from(getStore().courses.values());
  courses.sort((a, b) => b.createdAt - a.createdAt);
  return courses.map(summarizeCourse);
}

export function updateBlock(courseId: string, blockId: string, next: CourseBlock): Course | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;
  const blocks = course.blocks.map((block) => (block.id === blockId ? next : block));
  const updated: Course = { ...course, blocks, updatedAt: Date.now() };
  return saveCourse(updated);
}

function hydrateStore(store: GlobalStore) {
  store.hydrated = true;
  try {
    if (!fs.existsSync(storeFile)) {
      store.fileMtimeMs = 0;
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { courses?: Course[] };
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((course) => [course.id, course]));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[courses/store] Failed to hydrate course store", error);
  }
}

function refreshStoreIfChanged(store: GlobalStore) {
  try {
    if (!fs.existsSync(storeFile)) {
      if (store.fileMtimeMs !== 0) {
        store.courses = new Map();
        store.fileMtimeMs = 0;
      }
      return;
    }

    const mtimeMs = fs.statSync(storeFile).mtimeMs;
    if (mtimeMs === store.fileMtimeMs) return;

    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { courses?: Course[] };
    if (!Array.isArray(parsed.courses)) return;
    store.courses = new Map(parsed.courses.map((course) => [course.id, course]));
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

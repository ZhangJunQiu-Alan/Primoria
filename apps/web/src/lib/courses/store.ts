import type { Course, CourseBlock, CourseSummary } from "./types";
import { summarizeCourse } from "./types";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";
import fs from "node:fs";
import path from "node:path";

// Storage strategy:
// - When Supabase auth is configured AND there is a signed-in user, courses are
//   persisted per-user in public.app_courses (RLS-scoped to auth.users).
// - Otherwise (auth not configured / dev), fall back to the on-disk JSON store.
// All public functions are async and resolve the owner internally — every call
// site already runs inside a request scope (route handler, server component, or
// the in-process deep agent), so cookies/getUser() are available.

const TABLE = "app_courses";

type CourseRow = {
  id: string;
  owner_id: string;
  title: string;
  topic: string;
  summary: string;
  estimated_minutes: number;
  blocks: CourseBlock[];
  created_at: string;
  updated_at: string;
};

async function resolveOwner(): Promise<string | null> {
  if (!supabaseEnv()) return null;
  const user = await getUser();
  return user?.id ?? null;
}

function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    estimatedMinutes: row.estimated_minutes,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function saveCourse(course: Course): Promise<Course> {
  const owner = await resolveOwner();
  if (!owner) {
    jsonStore().courses.set(course.id, course);
    persistStore();
    return course;
  }

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).upsert({
    id: course.id,
    owner_id: owner,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimated_minutes: course.estimatedMinutes,
    blocks: course.blocks,
    created_at: new Date(course.createdAt).toISOString(),
    updated_at: new Date(course.updatedAt).toISOString(),
  });
  if (error) throw new Error(`Failed to save course: ${error.message}`);
  return course;
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const owner = await resolveOwner();
  if (!owner) return jsonStore().courses.get(id);

  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load course: ${error.message}`);
  return data ? rowToCourse(data as CourseRow) : undefined;
}

export async function listCourses(): Promise<CourseSummary[]> {
  const owner = await resolveOwner();
  if (!owner) {
    const courses = Array.from(jsonStore().courses.values());
    courses.sort((a, b) => b.createdAt - a.createdAt);
    return courses.map(summarizeCourse);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list courses: ${error.message}`);
  return (data as CourseRow[]).map((row) => summarizeCourse(rowToCourse(row)));
}

export async function updateBlock(
  courseId: string,
  blockId: string,
  next: CourseBlock,
): Promise<Course | undefined> {
  const course = await getCourse(courseId);
  if (!course) return undefined;
  const blocks = course.blocks.map((block) => (block.id === blockId ? next : block));
  const updated: Course = { ...course, blocks, updatedAt: Date.now() };
  return saveCourse(updated);
}

// --- JSON fallback store (dev / auth not configured) -----------------------

type GlobalStore = {
  courses: Map<string, Course>;
  hydrated: boolean;
  fileMtimeMs: number;
};

const globalKey = "__primoria_course_store__";
const globalAny = globalThis as unknown as Record<string, GlobalStore | undefined>;
const storeFile = path.join(findWorkspaceRoot(), ".primoria-courses.json");

function jsonStore(): GlobalStore {
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
    const store = jsonStore();
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

import { describe, expect, it } from "vitest";

import type { TopicGraph } from "../src/lib/knowledge-graph/topic-graph";
import { reconcileFolderLessons, type LessonAnchor } from "../src/lib/materials/folder-course-reconcile";
import { folderCourseScopeKey, planFolderCourseAdditions } from "../src/lib/materials/folder-course";
import { folderGraphId } from "../src/lib/materials/folder-graph";

/** Topics of concept ids, chained in order (like an assembled folder graph). */
function graph(topics: Record<string, string[]>): TopicGraph {
  const entries = Object.entries(topics);
  const ids = entries.flatMap(([, concepts]) => concepts);
  return {
    graphId: "mat_0123456789abcdef",
    subject: "S",
    topics: entries.map(([topicId, concepts], index) => ({
      topicId,
      name: topicId,
      nameZh: null,
      defaultOrder: index + 1,
      conceptIds: concepts.map((conceptId, i) => ({ conceptId, name: conceptId, nameZh: null, defaultOrder: i + 1 })),
      successors: [],
      prereqTopics: index > 0 ? [entries[index - 1][0]] : [],
      isRoot: index === 0,
    })),
    conceptEdges: ids.slice(1).map((to, i) => ({ from: ids[i], to, strength: "hard" as const })),
  };
}

const anchor = (id: string, topicId: string, conceptIds: string[], extra: Partial<LessonAnchor> = {}): LessonAnchor => ({
  id,
  topicId,
  conceptIds,
  status: "planned",
  hasBlocks: false,
  ...extra,
});

describe("folderCourseScopeKey", () => {
  it("is the full-graph scope of the folder graph", () => {
    expect(folderCourseScopeKey("mf_1")).toBe(`graph:${folderGraphId("mf_1")}:full`);
  });
});

describe("reconcileFolderLessons", () => {
  const current = graph({ t_l2: ["b", "c"], t_l1: ["a"] });

  it("re-anchors lessons to the topic of their first remaining concept", () => {
    const plan = reconcileFolderLessons([anchor("l1", "t_l1", ["b", "a"]), anchor("l2", "t_l1", ["a"]), anchor("l3", "t_old", ["gone", "c"])], current);
    expect(plan.reanchor).toEqual([
      { id: "l1", topicId: "t_l2" },
      { id: "l3", topicId: "t_l2" },
    ]);
    expect(plan.remove).toEqual([]);
  });

  it("removes only planned, never-generated lessons whose concepts all left", () => {
    const plan = reconcileFolderLessons(
      [
        anchor("planned", "t_x", ["gone"]),
        anchor("generated", "t_x", ["gone"], { status: "generated", hasBlocks: true }),
        anchor("generating", "t_x", ["gone"], { status: "generating" }),
        anchor("legacy", "t_x", []),
      ],
      current,
    );
    expect(plan.remove).toEqual(["planned"]);
    expect(plan.reanchor).toEqual([]);
  });
});

describe("planFolderCourseAdditions", () => {
  const base = { courseId: "crs_1", mastered: new Set<string>(), language: "zh", now: 0 };
  // Lecture order: L1 (a, b), new L1.5 (x, y), L2 (c, d), new L3 (e).
  const after = graph({ t1: ["a", "b"], t15: ["x", "y"], t2: ["c", "d"], t3: ["e"] });
  const lessons = [
    { sortKey: 1, conceptIds: ["a", "b"] },
    { sortKey: 2, conceptIds: ["c", "d"] },
  ];

  it("slots new concepts before the first lesson that teaches a later concept", () => {
    const added = planFolderCourseAdditions({ ...base, lessons, graph: after });
    expect(added.map((lesson) => [lesson.conceptIds, lesson.sortKey])).toEqual([
      [["x", "y"], 1.5],
      [["e"], 3],
    ]);
    expect(added.every((lesson) => lesson.status === "planned" && lesson.blocks === null)).toBe(true);
    expect(added[0].topicId).toBe("t15");
    expect(added[0].title).toBe("x 与 y");
  });

  it("is idempotent in ids and skips covered and mastered concepts", () => {
    const first = planFolderCourseAdditions({ ...base, lessons, graph: after });
    const again = planFolderCourseAdditions({ ...base, lessons, graph: after });
    expect(again.map((lesson) => lesson.id)).toEqual(first.map((lesson) => lesson.id));
    expect(planFolderCourseAdditions({ ...base, courseId: "crs_2", lessons, graph: after })[0].id).not.toBe(first[0].id);

    const mastered = planFolderCourseAdditions({ ...base, mastered: new Set(["x", "y"]), lessons, graph: after });
    expect(mastered.map((lesson) => lesson.conceptIds)).toEqual([["e"]]);
    const covered = [...lessons, ...first];
    expect(planFolderCourseAdditions({ ...base, lessons: covered, graph: after })).toEqual([]);
  });

  it("places several new lessons in one gap in order, and before the first lesson", () => {
    const g = graph({ t0: ["p", "q", "r", "s", "u"], t1: ["a", "b"] });
    const added = planFolderCourseAdditions({ ...base, lessons: [{ sortKey: 1, conceptIds: ["a", "b"] }], graph: g });
    expect(added.map((lesson) => lesson.conceptIds)).toEqual([["p", "q", "r"], ["s", "u"]]);
    const keys = added.map((lesson) => lesson.sortKey);
    expect(keys[0]).toBeGreaterThan(0);
    expect(keys[0]).toBeLessThan(keys[1]);
    expect(keys[1]).toBeLessThan(1);
  });

  it("appends to an empty or orphaned course", () => {
    const g = graph({ t1: ["a", "b"] });
    expect(planFolderCourseAdditions({ ...base, lessons: [], graph: g }).map((lesson) => lesson.sortKey)).toEqual([1]);
    const orphaned = planFolderCourseAdditions({ ...base, lessons: [{ sortKey: 5, conceptIds: ["gone"] }], graph: g });
    expect(orphaned.map((lesson) => lesson.sortKey)).toEqual([6]);
  });
});

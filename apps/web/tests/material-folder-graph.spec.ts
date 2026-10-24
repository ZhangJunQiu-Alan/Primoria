import { describe, expect, it } from "vitest";

import { buildConceptFrontierOutline } from "../src/lib/knowledge-graph/concept-frontier";
import type { LearningMaterialRow, MaterialFolderRow } from "../src/lib/db/schema";
import {
  assembleFolderGraph,
  folderGraphId,
  LECTURE_SUBGRAPH_VERSION,
  newFolderConceptId,
  toLectureSubgraph,
  type AssemblyLecture,
  type LectureSubgraph,
  type SubgraphConcept,
} from "../src/lib/materials/folder-graph";
import type { FolderLectureState } from "../src/lib/materials/folder-graph-store";
import { buildFolderOverview } from "../src/lib/materials/folder-overview";
import { buildLectureOrderUserPrompt, parseLectureOrder, positionAfter } from "../src/lib/materials/lecture-order";
import { buildLectureGraphUserPrompt, parseMaterialGraph, type RawMaterialGraph } from "../src/lib/materials/material-graph";
import { isMaterialGraphId, type MaterialChunkRef } from "../src/lib/materials/types";

function ref(materialId: string, ordinal: number): MaterialChunkRef {
  return { materialId, ordinal, pageStart: null, pageEnd: null } as MaterialChunkRef;
}

function concept(conceptId: string, extra: Partial<SubgraphConcept> = {}): SubgraphConcept {
  return { conceptId, sameAs: false, name: conceptId, nameZh: null, refs: [], requires: [], ...extra };
}

function subgraph(...topics: SubgraphConcept[][]): LectureSubgraph {
  return {
    version: LECTURE_SUBGRAPH_VERSION,
    title: "t",
    codeAdapted: false,
    topics: topics.map((concepts, index) => ({ name: `Topic ${index + 1}`, nameZh: null, concepts })),
  };
}

function lecture(materialId: string, position: number, graph: LectureSubgraph, createdAt = 0): AssemblyLecture {
  return { materialId, position, createdAt, subgraph: graph };
}

const conceptOrder = (graph: { topics: { conceptIds: { conceptId: string }[] }[] }) =>
  graph.topics.flatMap((topic) => topic.conceptIds.map((entry) => entry.conceptId));

describe("folderGraphId / newFolderConceptId", () => {
  it("derives a stable private mat_* id per folder", () => {
    expect(folderGraphId("mf_1")).toBe(folderGraphId("mf_1"));
    expect(folderGraphId("mf_1")).not.toBe(folderGraphId("mf_2"));
    expect(isMaterialGraphId(folderGraphId("mf_1"))).toBe(true);
  });

  it("mints unique slugged concept ids", () => {
    const a = newFolderConceptId("Symmetric Encryption");
    expect(a).toMatch(/^fc_[0-9a-f]{8}_symmetric[-_]encryption$/);
    expect(newFolderConceptId("Symmetric Encryption")).not.toBe(a);
  });
});

describe("toLectureSubgraph", () => {
  const raw = (concepts: RawMaterialGraph["topics"][number]["concepts"]): RawMaterialGraph => ({
    title: "Lecture 2",
    subject: "Security",
    codeAdapted: false,
    topics: [{ name: "Crypto", nameZh: "密码", concepts }],
  });
  let counter = 0;
  const newId = (name: string) => `new_${++counter}_${name}`;

  it("reuses an existing id for sameAs and mints ids for new concepts", () => {
    counter = 0;
    const result = toLectureSubgraph(
      raw([
        { name: "Hashing", nameZh: "哈希", refs: [ref("m2", 0)], sameAs: "K1" },
        { name: "HMAC", nameZh: "", refs: [ref("m2", 1)], requires: ["K1", "K2", "K9"], reason: "builds on hashing" },
      ]),
      new Map([
        ["K1", "fc_hash"],
        ["K2", "fc_keys"],
      ]),
      newId,
    );
    const [hashing, hmac] = result.topics[0].concepts;
    expect(hashing).toMatchObject({ conceptId: "fc_hash", sameAs: true, nameZh: "哈希" });
    expect(hmac).toMatchObject({ conceptId: "new_1_HMAC", sameAs: false, nameZh: null, requires: ["fc_hash", "fc_keys"], reason: "builds on hashing" });
    expect(result.version).toBe(LECTURE_SUBGRAPH_VERSION);
  });

  it("keeps a repeated or unknown match as a new concept and drops self-requires", () => {
    counter = 0;
    const result = toLectureSubgraph(
      raw([
        { name: "A", nameZh: "", refs: [], sameAs: "K1" },
        { name: "B", nameZh: "", refs: [], sameAs: "K1", requires: ["K1"] },
        { name: "C", nameZh: "", refs: [], sameAs: "K7" },
      ]),
      new Map([["K1", "fc_a"]]),
      newId,
    );
    expect(result.topics[0].concepts.map((entry) => [entry.conceptId, entry.sameAs])).toEqual([
      ["fc_a", true],
      ["new_1_B", false],
      ["new_2_C", false],
    ]);
    expect(result.topics[0].concepts[1].requires).toEqual(["fc_a"]);
  });
});

describe("parseMaterialGraph K-labels", () => {
  it("reads sameAs and requires labels and ignores malformed ones", () => {
    const parsed = parseMaterialGraph(
      JSON.stringify({
        title: "L2",
        topics: [
          {
            name: "T",
            concepts: [
              { name: "A", sources: ["S1"], sameAs: "[k3]" },
              { name: "B", sources: ["S1"], sameAs: "concept 3", requires: ["K1", "x", 4, "K12"] },
            ],
          },
        ],
      }),
      [ref("m", 0)],
    );
    expect(parsed?.topics[0].concepts[0].sameAs).toBe("K3");
    expect(parsed?.topics[0].concepts[1].sameAs).toBeUndefined();
    expect(parsed?.topics[0].concepts[1].requires).toEqual(["K1", "K12"]);
  });

  it("lists the folder's existing concepts in the lecture prompt", () => {
    const digest = { text: "[S1] (L2) body", refsByIndex: [ref("m", 0)] };
    const prompt = buildLectureGraphUserPrompt(digest, "zh", [{ label: "K1", name: "Hashing", nameZh: "哈希", lecture: "第1讲" }]);
    expect(prompt).toContain("[K1] Hashing / 哈希 (第1讲)");
    expect(prompt).toContain("<material_map>");
    expect(buildLectureGraphUserPrompt(digest, "en", [])).toContain("this is the first lecture");
  });
});

describe("assembleFolderGraph", () => {
  const l1 = subgraph(
    [concept("a", { refs: [ref("lm_one", 0)] }), concept("b", { reason: "b after a" })],
    [concept("c")],
  );
  const l2 = subgraph([concept("b", { sameAs: true, refs: [ref("lm_two", 3)] }), concept("d", { requires: ["a"] }), concept("e")]);

  it("places each concept in its first lecture, merges sources, and chains lectures", () => {
    const { graph, conceptSources, conceptLecture } = assembleFolderGraph({
      folderId: "mf_1",
      title: "Information Security",
      lectures: [lecture("lm_two", 2, l2), lecture("lm_one", 1, l1)],
    });
    expect(graph.graphId).toBe(folderGraphId("mf_1"));
    expect(graph.subject).toBe("Information Security");
    expect(conceptOrder(graph)).toEqual(["a", "b", "c", "d", "e"]);
    expect(conceptLecture).toMatchObject({ a: "lm_one", b: "lm_one", d: "lm_two" });
    expect(conceptSources.b).toEqual([ref("lm_two", 3)]);
    expect(conceptSources.a).toEqual([ref("lm_one", 0)]);
    expect(graph.conceptEdges).toEqual(
      expect.arrayContaining([
        { from: "a", to: "b", strength: "hard", reason: "b after a" },
        { from: "b", to: "c", strength: "hard" },
        { from: "c", to: "d", strength: "hard" },
        { from: "d", to: "e", strength: "hard" },
        { from: "a", to: "d", strength: "hard" },
      ]),
    );
    expect(graph.topics[0].isRoot).toBe(true);
    expect(graph.topics[1].prereqTopics).toEqual([graph.topics[0].topicId]);
    expect(new Set(graph.topics.map((topic) => topic.topicId)).size).toBe(graph.topics.length);
  });

  it("keeps concept ids when lectures are reordered and drops backward edges", () => {
    const { graph, conceptLecture } = assembleFolderGraph({
      folderId: "mf_1",
      title: "S",
      lectures: [lecture("lm_two", 1, l2), lecture("lm_one", 2, l1)],
    });
    expect(conceptOrder(graph).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(conceptLecture.b).toBe("lm_two");
    // d requires a, but a is now placed after d: the edge is dropped.
    expect(graph.conceptEdges?.some((edge) => edge.from === "a" && edge.to === "d")).toBe(false);
    const index = new Map(conceptOrder(graph).map((id, i) => [id, i]));
    for (const edge of graph.conceptEdges ?? []) expect(index.get(edge.from)!).toBeLessThan(index.get(edge.to)!);
  });

  it("breaks position ties by upload time and yields a usable concept frontier", () => {
    const first = subgraph([concept("x"), concept("y")]);
    const second = subgraph([concept("z"), concept("w")]);
    const { graph } = assembleFolderGraph({
      folderId: "mf_2",
      title: "S",
      lectures: [lecture("lm_b", 1, second, 20), lecture("lm_a", 1, first, 10)],
    });
    expect(conceptOrder(graph)).toEqual(["x", "y", "z", "w"]);
    const outline = buildConceptFrontierOutline({ graph, startTopicId: null, targetConceptId: null, masteredConceptIds: new Set() });
    expect(outline.flatMap((lesson) => lesson.conceptIds)).toEqual(["x", "y", "z", "w"]);
  });

  it("caps merged sources per concept", () => {
    const refs = Array.from({ length: 10 }, (_, i) => ref("lm_one", i));
    const more = Array.from({ length: 10 }, (_, i) => ref("lm_two", i));
    const { conceptSources } = assembleFolderGraph({
      folderId: "mf_3",
      title: "S",
      lectures: [lecture("lm_one", 1, subgraph([concept("a", { refs })])), lecture("lm_two", 2, subgraph([concept("a", { sameAs: true, refs: more })]))],
    });
    expect(conceptSources.a).toHaveLength(12);
  });

  it("returns an empty graph for a folder without ready lectures", () => {
    const { graph } = assembleFolderGraph({ folderId: "mf_4", title: "S", lectures: [] });
    expect(graph.topics).toEqual([]);
    expect(graph.conceptEdges).toBeUndefined();
  });
});

describe("lecture order fallback", () => {
  it("parses the model's slot and rejects out-of-range answers", () => {
    expect(parseLectureOrder('{"after": 2}', 3)).toBe(2);
    expect(parseLectureOrder('Sure: {"after":0}', 3)).toBe(0);
    expect(parseLectureOrder('{"after": 4}', 3)).toBeNull();
    expect(parseLectureOrder('{"after": 1.5}', 3)).toBeNull();
    expect(parseLectureOrder("second", 3)).toBeNull();
  });

  it("computes a fractional position between neighbours", () => {
    expect(positionAfter([1, 2, 3], 0)).toBe(0);
    expect(positionAfter([1, 2, 3], 1)).toBe(1.5);
    expect(positionAfter([1, 2, 3], 3)).toBe(4);
    expect(positionAfter([], 0)).toBe(1);
  });

  it("numbers existing lectures and caps concept lists", () => {
    const prompt = buildLectureOrderUserPrompt(
      [{ title: "Intro", concepts: ["a", "b"] }, { title: "Ciphers", concepts: Array.from({ length: 12 }, (_, i) => `c${i}`) }],
      { title: "Hashing", concepts: [] },
    );
    expect(prompt).toContain("1. Intro — a; b");
    expect(prompt).toContain("2. Ciphers — c0; c1; c2; c3; c4; c5; c6; c7\n");
    expect(prompt).toContain("NEW LECTURE: Hashing");
  });
});

describe("buildFolderOverview", () => {
  const material = (id: string, position: number, extra: Partial<LearningMaterialRow> = {}) =>
    ({ id, title: id, position, createdAt: new Date(0), role: "lecture", kgStatus: "ready", ...extra }) as LearningMaterialRow;

  it("groups concepts by introducing lecture with mastery and revisit counts", () => {
    const state: FolderLectureState = {
      folder: { id: "mf_1", name: "S", kind: "subject" } as MaterialFolderRow,
      materials: [material("lm_one", 1), material("lm_two", 2), material("lm_ref", 3, { role: "reference" }), material("lm_new", 4, { kgStatus: "pending" })],
      subgraphs: new Map([
        ["lm_one", subgraph([concept("a", { name: "Hash", nameZh: "哈希" }), concept("b")])],
        ["lm_two", subgraph([concept("a", { sameAs: true }), concept("c")])],
        ["lm_ref", subgraph([concept("a", { sameAs: true })])],
      ]),
    };
    const overview = buildFolderOverview(state, new Map([["a", "mastered"]]), "zh");
    expect(overview.graphId).toBe(folderGraphId("mf_1"));
    expect(overview.conceptCount).toBe(3);
    expect(overview.lectures.map((entry) => entry.materialId)).toEqual(["lm_one", "lm_two"]);
    expect(overview.lectures[0].concepts[0]).toEqual({ conceptId: "a", name: "哈希", status: "mastered", revisitedIn: 1 });
    expect(overview.lectures[1].concepts).toEqual([{ conceptId: "c", name: "c", status: "untested", revisitedIn: 0 }]);
  });
});

describe("masteryTableFor", () => {
  it("keeps material mastery out of the library-referencing table", async () => {
    const { getTableName } = await import("drizzle-orm");
    const { masteryTableFor } = await import("../src/lib/mastery/owner-store");
    expect(getTableName(masteryTableFor(folderGraphId("mf_1")))).toBe("material_concept_mastery");
    expect(getTableName(masteryTableFor("math_linear_algebra"))).toBe("user_concept_mastery");
    expect(getTableName(masteryTableFor("gen_mcp_1234abcd"))).toBe("user_concept_mastery");
  });
});

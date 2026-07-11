import { describe, expect, it } from "vitest";
import {
  CourseCardArtifactSchema,
  TutorArtifactSchema,
  isTutorArtifact,
  type TutorArtifact,
} from "@primoria/contracts/artifacts";

const validArtifacts: TutorArtifact[] = [
  { type: "html_widget", title: "Widget", description: "Demo", html: "<div />" },
  {
    type: "visualization_plan",
    title: "Plan",
    approach: "Compare",
    technology: "SVG",
    keyElements: ["axis"],
  },
  { type: "code", title: "Code", language: "ts", code: "const value = 1;" },
  {
    type: "course_card",
    courseId: "course-1",
    title: "Course",
    topic: "Topic",
    summary: "Summary",
    estimatedMinutes: 30,
    outline: [{ type: "text", title: "Intro" }],
    status: "ready",
  },
  { type: "todo_list", items: [{ title: "Read", status: "pending" }] },
  { type: "tool_status", name: "render_chart", status: "complete", description: "Done" },
  { type: "echarts_widget", title: "Chart", description: "Trend", option: { series: [] } },
  { type: "mermaid_diagram", title: "Flow", definition: "graph TD; A-->B" },
  {
    type: "physics_scene",
    title: "Pendulum",
    description: "Motion",
    scene: {
      bodies: [{ id: "ball", shape: "circle", x: 0, y: 1, radius: 1 }],
      render: { width: 640, height: 360 },
    },
  },
  {
    type: "algorithm_visualization",
    title: "Sort",
    description: "Steps",
    algorithm: "bubble-sort",
    steps: [{ description: "Compare", kind: "array", array: { values: [2, 1] } }],
  },
  {
    type: "math_explorer",
    title: "Function",
    description: "Plot",
    parameters: [{ name: "a", min: 0, max: 2, default: 1 }],
  },
  {
    type: "wave_visualization",
    title: "Wave",
    description: "Signal",
    waves: [{ amplitude: 1, frequency: 2 }],
    layout: "superposition",
  },
  {
    type: "graph_visualization",
    title: "Graph",
    description: "Network",
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b" }],
  },
  {
    type: "molecule",
    title: "Water",
    description: "H2O",
    atoms: [{ id: "o", element: "O", x: 0, y: 0, z: 0 }],
    bonds: [],
  },
];

describe("TutorArtifactSchema", () => {
  it("accepts every supported artifact family", () => {
    for (const artifact of validArtifacts) {
      expect(TutorArtifactSchema.safeParse(artifact).success, artifact.type).toBe(true);
    }
  });

  it("rejects unknown, incomplete, and nested-invalid artifacts", () => {
    expect(isTutorArtifact({ type: "unknown_artifact" })).toBe(false);
    expect(isTutorArtifact({ type: "html_widget" })).toBe(false);
    expect(isTutorArtifact({
      type: "physics_scene",
      title: "Broken",
      description: "Missing body id",
      scene: { bodies: [{ shape: "circle", x: 0, y: 0 }], render: { width: 640, height: 360 } },
    })).toBe(false);
  });

  it("keeps the course-card block vocabulary centralized", () => {
    const courseCard = validArtifacts.find((artifact) => artifact.type === "course_card");
    expect(CourseCardArtifactSchema.safeParse(courseCard).success).toBe(true);
    expect(CourseCardArtifactSchema.safeParse({
      ...courseCard,
      outline: [{ type: "unsupported", title: "Broken" }],
    }).success).toBe(false);
  });
});

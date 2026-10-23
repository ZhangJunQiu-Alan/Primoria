import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course, VisualBlock } from "../src/lib/courses/types";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/deepagent/model", () => ({ createTutorModel: () => ({ withStructuredOutput: () => ({ invoke }) }) }));
import { generateBlock } from "../src/lib/ai/deepagent/course-generator";

const interactive = { componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10, objectDistance: 30 } };
const source: VisualBlock = { id: "v1", type: "visual", title: "透镜", description: "观察成像", engine: "interactive", interactive };
const course = { title: "光学", topic: "凸透镜", lessons: [{ blocks: [source] }] } as Course;
const edit = () => generateBlock({ course, targetType: "visual", sourceBlock: source, instruction: "焦距改成15" });

describe("trusted course visualization edits", () => {
  beforeEach(() => { invoke.mockReset(); });
  it("retains the trusted component and validates the changed parameters", async () => {
    invoke.mockResolvedValue({ ...source, interactive: { ...interactive, config: { ...interactive.config, focalLength: 15 } } });
    await expect(edit()).resolves.toMatchObject({ engine: "interactive", interactive: { ...interactive, config: { focalLength: 15, objectDistance: 30 } } });
  });
  it.each([
    { type: "visual", title: "x", description: "x", engine: "html", html: "<div>replacement</div>" },
    { type: "visual", title: "x", description: "x", engine: "interactive", interactive: { componentId: "chem.acid-base-titration", configVersion: 1, config: {} } },
  ])("rejects a replacement engine or a different component", async (result) => {
    invoke.mockResolvedValue(result);
    await expect(edit()).rejects.toThrow(/preserve its component/);
  });
  it("still permits explicitly converting the visual block to text", async () => {
    invoke.mockResolvedValue({ type: "text", title: "透镜", markdown: "焦距是透镜的光学参数。" });
    await expect(generateBlock({ course, targetType: "text", sourceBlock: source, instruction: "转换成文字说明" })).resolves.toMatchObject({ type: "text" });
    expect(invoke.mock.calls[0][0][1].content).not.toContain("Preserve the trusted visualization engine");
  });
});

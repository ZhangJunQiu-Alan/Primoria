import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Course, CourseBlock } from "../src/lib/courses/types";

const invoke = vi.hoisted(() => vi.fn());
const findReusableImage = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/deepagent/model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/ai/deepagent/model")>()),
  createTutorModel: () => ({ withStructuredOutput: () => ({ invoke }) }),
}));
// Imaging is covered elsewhere; here the editor's brief is what matters.
vi.mock("../src/lib/ai/media/image-builder", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/ai/media/image-builder")>()),
  findReusableImage,
  finalizeImageBlocks: async (blocks: CourseBlock[]) => blocks,
}));
import { generateBlock } from "../src/lib/ai/deepagent/course-generator";

const course = { title: "Biology", topic: "Photosynthesis", language: "en", lessons: [{ blocks: [] }] } as unknown as Course;
const brief = {
  title: "Inside a chloroplast",
  learningGoal: "Locate where light reactions happen",
  imageKind: "structure_diagram",
  prompt: "A chloroplast cross-section with labelled thylakoid stacks and stroma.",
  alt: "A chloroplast cross-section with stacked thylakoids labelled and the surrounding stroma shaded.",
  caption: "Light reactions run in the thylakoid membranes; the Calvin cycle runs in the stroma.",
};
const addImage = () => generateBlock({ course, targetType: "image", instruction: "add a chloroplast picture" });

describe("editor image brief", () => {
  beforeEach(() => {
    invoke.mockReset();
    findReusableImage.mockReset().mockResolvedValue(null);
  });

  it("writes a fresh brief when the optional reusable-image lookup fails", async () => {
    findReusableImage.mockRejectedValueOnce(new Error("media cache unavailable"));
    invoke.mockResolvedValueOnce(brief);
    await expect(generateBlock({
      course,
      targetType: "image",
      instruction: "add a chloroplast picture",
      sourceBlock: { id: "source", type: "text", markdown: "Chloroplasts", conceptIds: ["chloroplast"] },
    })).resolves.toMatchObject({ type: "image", title: brief.title, caption: brief.caption });
    expect(findReusableImage).toHaveBeenCalledWith(["chloroplast"], { ownerId: null, language: "en" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("asks once more when alt and caption are unusable", async () => {
    invoke.mockResolvedValueOnce({ ...brief, caption: brief.alt }).mockResolvedValueOnce(brief);
    await expect(addImage()).resolves.toMatchObject({ type: "image", title: brief.title, caption: brief.caption });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][0][1].content).toContain("alt must differ from caption");
  });

  it("fails as an editor error instead of a broken image after the repair", async () => {
    invoke.mockResolvedValue({ ...brief, caption: "It needs light to2 run." });
    await expect(addImage()).rejects.toThrow('Could not generate a usable "image" block.');
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

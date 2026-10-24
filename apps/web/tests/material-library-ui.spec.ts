// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MaterialLibrary } from "../src/components/materials/material-library";
import type { MaterialSummary } from "../src/lib/materials/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function material(id: string, title: string): MaterialSummary {
  return {
    id,
    title,
    fileName: `${title}.pdf`,
    mimeType: "application/pdf",
    byteLength: 2048,
    charCount: 12_345,
    chunkCount: 10,
    pageCount: 4,
    language: "zh",
    createdAt: Date.UTC(2026, 9, 1),
  };
}

const roots = new Set<Root>();
let container: HTMLDivElement;

async function mount(materials: MaterialSummary[]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(async () => root.render(createElement(MaterialLibrary, { initialMaterials: materials })));
}

async function click(element: Element | null | undefined) {
  if (!element) throw new Error("element not found");
  await act(async () => {
    (element as HTMLElement).click();
  });
}

const buttonByText = (text: string) =>
  [...container.querySelectorAll("button")].find((button) => button.textContent === text) as HTMLButtonElement | undefined;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  push.mockReset();
});

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount());
  roots.clear();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("MaterialLibrary", () => {
  it("lists materials and builds a course from the selection", async () => {
    const fetchMock = vi.fn(async () => Response.json({ courseId: "crs_1" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await mount([material("lm_1", "讲义一"), material("lm_2", "讲义二")]);

    expect(container.textContent).toContain("讲义一");
    expect(container.textContent).toContain("4 页");
    const build = buttonByText("用选中的资料生成课程")!;
    expect(build.disabled).toBe(true);

    await click(container.querySelector('input[aria-label="选择「讲义二」"]'));
    expect(build.disabled).toBe(false);
    await click(build);

    expect(fetchMock).toHaveBeenCalledWith("/api/materials/courses", expect.objectContaining({ method: "POST", body: JSON.stringify({ materialIds: ["lm_2"] }) }));
    expect(push).toHaveBeenCalledWith("/course/crs_1");
  });

  it("caps the selection at five materials", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await mount(Array.from({ length: 6 }, (_, i) => material(`lm_${i}`, `资料${i}`)));
    for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) await click(checkbox);
    expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(5);
    expect(container.textContent).toContain("一门课最多选择 5 份资料。");
  });

  it("asks for confirmation and explains when a course still uses the material", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ code: "material_in_use", courses: [{ id: "crs_1", title: "向量入门" }] }, { status: 409 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await mount([material("lm_1", "讲义一")]);

    await click(buttonByText("删除"));
    expect(fetchMock).not.toHaveBeenCalled();
    await click(buttonByText("确认删除"));
    expect(fetchMock).toHaveBeenCalledWith("/api/materials/lm_1", { method: "DELETE" });
    expect(container.textContent).toContain("「讲义一」正被这些课程使用：《向量入门》");
    expect(container.textContent).toContain("讲义一");
  });

  it("rejects unsupported files before uploading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await mount([]);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [new File(["x"], "archive.zip", { type: "application/zip" })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("「archive.zip」不是支持的格式");
  });
});

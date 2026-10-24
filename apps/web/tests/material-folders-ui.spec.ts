// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FolderDetail } from "../src/components/materials/folder-detail";
import { FolderList } from "../src/components/materials/folder-list";
import type { FolderGraphOverview } from "../src/lib/materials/folder-overview";
import type { FolderSummary, MaterialSummary } from "../src/lib/materials/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function material(id: string, title: string, position: number, extra: Partial<MaterialSummary> = {}): MaterialSummary {
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
    folderId: "mf_sec",
    role: "lecture",
    position,
    lectureNumber: null,
    orderSource: "upload",
    kgStatus: "skipped",
    createdAt: Date.UTC(2026, 9, 1),
    ...extra,
  };
}

const folder = { id: "mf_sec", name: "Information Security", kind: "subject" as const };
const folders = [folder, { id: "mf_web", name: "H5+CSS3", kind: "subject" as const }, { id: "mf_inbox", name: "Unsorted", kind: "unsorted" as const }];

const roots = new Set<Root>();
let container: HTMLDivElement;

async function render(element: ReturnType<typeof createElement>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(async () => root.render(element));
}

const mountDetail = (materials: MaterialSummary[], target = folder, initialOverview: FolderGraphOverview | null = null) =>
  render(createElement(FolderDetail, { folder: target, folders, initialMaterials: materials, initialOverview }));

async function click(element: Element | null | undefined) {
  if (!element) throw new Error("element not found");
  await act(async () => {
    (element as HTMLElement).click();
  });
}

async function change(element: Element | null, value: string) {
  if (!element) throw new Error("element not found");
  await act(async () => {
    const select = element as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const buttonByText = (text: string) =>
  [...container.querySelectorAll("button")].find((button) => button.textContent === text) as HTMLButtonElement | undefined;
const titles = () => [...container.querySelectorAll(".materials-item-copy strong")].map((node) => node.textContent);

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

describe("FolderList", () => {
  const summaries: FolderSummary[] = [
    { id: "mf_sec", name: "Information Security", kind: "subject", materialCount: 3, lectureCount: 2, createdAt: 1, updatedAt: 1 },
    { id: "mf_inbox", name: "Unsorted", kind: "unsorted", materialCount: 1, lectureCount: 1, createdAt: 1, updatedAt: 1 },
  ];

  it("lists subjects and the unsorted inbox, and opens a created folder", async () => {
    const fetchMock = vi.fn(async () => Response.json({ folder: { id: "mf_new" } }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await render(createElement(FolderList, { initialFolders: summaries }));
    expect(container.textContent).toContain("Information Security");
    expect(container.textContent).toContain("2 讲 · 3 个文件");
    expect(container.textContent).toContain("未分类");

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "H5+CSS3");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/folders", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "H5+CSS3" }) }));
    expect(push).toHaveBeenCalledWith("/materials/mf_new");
  });
});

describe("FolderDetail", () => {
  it("numbers lectures in order and skips references", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await mountDetail([
      material("lm_2", "第2讲", 2),
      material("lm_ref", "大纲", 1.5, { role: "reference" }),
      material("lm_1", "第1讲", 1),
    ]);
    expect(titles()).toEqual(["第1讲", "大纲", "第2讲"]);
    expect([...container.querySelectorAll(".materials-order-tag")].map((node) => node.textContent)).toEqual(["第 1 讲", "参考", "第 2 讲"]);
  });

  it("saves a manual reorder and restores the order when saving fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ materials: [material("lm_2", "第2讲", 1, { orderSource: "manual" }), material("lm_1", "第1讲", 2, { orderSource: "manual" })] }))
      .mockResolvedValueOnce(Response.json({ error: "x" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([material("lm_1", "第1讲", 1), material("lm_2", "第2讲", 2)]);

    await click(container.querySelector('button[aria-label="下移「第1讲」"]'));
    expect(fetchMock).toHaveBeenCalledWith("/api/folders/mf_sec/order", expect.objectContaining({ method: "PUT", body: JSON.stringify({ materialIds: ["lm_2", "lm_1"] }) }));
    expect(titles()).toEqual(["第2讲", "第1讲"]);

    await click(container.querySelector('button[aria-label="下移「第2讲」"]'));
    expect(titles()).toEqual(["第2讲", "第1讲"]);
    expect(container.textContent).toContain("顺序保存失败");
  });

  it("uploads into this folder with the chosen role", async () => {
    const fetchMock = vi.fn(async () => Response.json({ material: material("lm_9", "大纲", 3, { role: "reference" }) }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([]);
    await change(container.querySelector(".materials-upload-role select"), "reference");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [new File(["x".repeat(10)], "大纲.pdf", { type: "application/pdf" })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get("folderId")).toBe("mf_sec");
    expect(form.get("role")).toBe("reference");
    expect(titles()).toEqual(["大纲"]);
  });

  it("moves a file to another folder and changes a role", async () => {
    const patches = [
      Response.json({ material: material("lm_1", "第1讲", 1, { role: "reference" }) }),
      Response.json({ material: material("lm_1", "第1讲", 1, { folderId: "mf_web" }) }),
    ];
    const fetchMock = vi.fn(async (url: string) => (url.endsWith("/graph") ? Response.json({ overview: null }) : patches.shift()!));
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([material("lm_1", "第1讲", 1)]);
    const patchCalls = () => fetchMock.mock.calls.filter(([url]) => url === "/api/materials/lm_1");

    await change(container.querySelector('select[aria-label="「第1讲」的类型"]'), "reference");
    expect(patchCalls().at(-1)).toEqual(["/api/materials/lm_1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "reference" }) })]);
    expect(container.querySelector(".materials-order-tag")?.textContent).toBe("参考");
    // The knowledge graph changes with the role, so the overview is re-read.
    expect(fetchMock).toHaveBeenCalledWith("/api/folders/mf_sec/graph", { cache: "no-store" });

    await change(container.querySelector('select[aria-label="把「第1讲」移到其他文件夹"]'), "mf_web");
    expect(patchCalls().at(-1)).toEqual(["/api/materials/lm_1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ folderId: "mf_web" }) })]);
    expect(titles()).toEqual([]);
  });

  it("builds a course from the selection", async () => {
    const fetchMock = vi.fn(async () => Response.json({ courseId: "crs_1" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([material("lm_1", "讲义一", 1), material("lm_2", "讲义二", 2)]);
    const build = buttonByText("用选中的资料生成课程")!;
    expect(build.disabled).toBe(true);
    await click(container.querySelector('input[aria-label="选择「讲义二」"]'));
    await click(build);
    expect(fetchMock).toHaveBeenCalledWith("/api/materials/courses", expect.objectContaining({ body: JSON.stringify({ materialIds: ["lm_2"] }) }));
    expect(push).toHaveBeenCalledWith("/course/crs_1");
  });

  it("caps the selection at five materials", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await mountDetail(Array.from({ length: 6 }, (_, i) => material(`lm_${i}`, `资料${i}`, i + 1)));
    for (const checkbox of container.querySelectorAll('input[type="checkbox"]')) await click(checkbox);
    expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(5);
    expect(container.textContent).toContain("一门课最多选择 5 份资料。");
  });

  it("asks for confirmation and explains when a course still uses the material", async () => {
    const fetchMock = vi.fn(async () => Response.json({ code: "material_in_use", courses: [{ id: "crs_1", title: "向量入门" }] }, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([material("lm_1", "讲义一", 1)]);
    await click(buttonByText("删除"));
    expect(fetchMock).not.toHaveBeenCalled();
    await click(buttonByText("确认删除"));
    expect(fetchMock).toHaveBeenCalledWith("/api/materials/lm_1", { method: "DELETE" });
    expect(container.textContent).toContain("「讲义一」正被这些课程使用：《向量入门》");
  });

  it("rejects unsupported files before uploading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([]);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [new File(["x"], "archive.zip", { type: "application/zip" })], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("「archive.zip」不是支持的格式");
  });

  it("shows each lecture's knowledge-graph status and retries a failed one", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/kg") ? Response.json({ material: material("lm_3", "第3讲", 3, { kgStatus: "pending" }) }) : Response.json({ materials: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await mountDetail([
      material("lm_1", "第1讲", 1, { kgStatus: "ready" }),
      material("lm_2", "第2讲", 2, { kgStatus: "processing" }),
      material("lm_3", "第3讲", 3, { kgStatus: "failed" }),
    ]);
    const statuses = () => [...container.querySelectorAll(".materials-kg-status")].map((node) => node.textContent);
    expect(statuses()).toEqual(["已加入知识图谱", "正在分析知识点…", "知识点分析失败"]);

    await click(buttonByText("重试"));
    expect(fetchMock).toHaveBeenCalledWith("/api/materials/lm_3/kg", { method: "POST" });
    expect(statuses()).toEqual(["已加入知识图谱", "正在分析知识点…", "正在分析知识点…"]);
    expect(buttonByText("重试")).toBeUndefined();
  });

  it("polls while lectures are analyzed and refreshes the graph when they finish", async () => {
    vi.useFakeTimers();
    try {
      const overview: FolderGraphOverview = {
        graphId: "mat_0123456789abcdef",
        conceptCount: 2,
        lectures: [
          {
            materialId: "lm_1",
            title: "第1讲",
            concepts: [
              { conceptId: "fc_a", name: "对称加密", status: "mastered", revisitedIn: 1 },
              { conceptId: "fc_b", name: "分组模式", status: "untested", revisitedIn: 0 },
            ],
          },
        ],
      };
      const fetchMock = vi.fn(async (url: string) =>
        url.endsWith("/graph")
          ? Response.json({ overview })
          : Response.json({ materials: [material("lm_1", "第1讲", 1, { kgStatus: "ready" })] }),
      );
      vi.stubGlobal("fetch", fetchMock);
      await mountDetail([material("lm_1", "第1讲", 1, { kgStatus: "pending" })]);
      expect(container.querySelector(".folder-graph")?.textContent).toContain("把讲义放进这个文件夹后");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(fetchMock).toHaveBeenCalledWith("/api/folders/mf_sec", { cache: "no-store" });
      expect(fetchMock).toHaveBeenCalledWith("/api/folders/mf_sec/graph", { cache: "no-store" });
      expect(container.querySelector(".materials-kg-status")?.textContent).toBe("已加入知识图谱");
      const chips = [...container.querySelectorAll(".folder-graph-concept")];
      expect(chips.map((chip) => chip.className)).toEqual(["folder-graph-concept concept-mastered", "folder-graph-concept concept-untested"]);
      expect(chips[0].textContent).toContain("另有 1 讲复习");
      expect(container.querySelector(".folder-graph")?.textContent).toContain("2 个知识点");

      // Nothing is analyzing any more: polling stops.
      const calls = fetchMock.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(fetchMock.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });

  it("explains that the unsorted inbox has no knowledge graph", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await mountDetail([material("lm_1", "随手笔记", 1, { folderId: "mf_inbox" })], folders[2]);
    expect(container.querySelector(".folder-graph")?.textContent).toContain("「未分类」不是科目");
  });

  it("locks rename and delete on the unsorted inbox", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await mountDetail([], folders[2]);
    expect(container.querySelector("h2")?.textContent).toBe("未分类");
    expect(buttonByText("重命名")).toBeUndefined();
    expect(buttonByText("删除文件夹")).toBeUndefined();
  });
});

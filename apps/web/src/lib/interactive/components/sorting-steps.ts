import { z } from "zod";
import type { ImplementedComponent } from "./types";

const algorithmSchema = z.enum(["bubble", "selection", "insertion"]);
export const SortingStepsConfigSchema = z.object({
  algorithm: algorithmSchema.default("bubble"),
  values: z.array(z.number().int().min(1).max(99)).min(4).max(10).default([5, 2, 4, 1, 8, 3]),
});
export type SortingStepsConfig = z.infer<typeof SortingStepsConfigSchema>;
export const SortingStepsPatchSchema = z.object({ algorithm: algorithmSchema, values: z.array(z.number().int().min(1).max(99)).min(4).max(10) }).partial();
export const DEFAULT_SORTING_STEPS_CONFIG = SortingStepsConfigSchema.parse({});

export type SortTraceStep = { values: number[]; compared: number[]; swapped: number[]; note: string };
export function traceSort(config: SortingStepsConfig) {
  const values = [...config.values];
  const steps: SortTraceStep[] = [{ values: [...values], compared: [], swapped: [], note: "初始序列" }];
  let comparisons = 0;
  let swaps = 0;
  const record = (compared: number[], swapped: number[], note: string) => steps.push({ values: [...values], compared, swapped, note });
  if (config.algorithm === "bubble") {
    for (let end = values.length - 1; end > 0; end -= 1) for (let index = 0; index < end; index += 1) {
      comparisons += 1;
      if (values[index] > values[index + 1]) {
        [values[index], values[index + 1]] = [values[index + 1], values[index]];
        swaps += 1;
        record([index, index + 1], [index, index + 1], "比较后交换相邻元素");
      } else record([index, index + 1], [], "顺序正确,不交换");
    }
  } else if (config.algorithm === "selection") {
    for (let start = 0; start < values.length - 1; start += 1) {
      let minimum = start;
      for (let index = start + 1; index < values.length; index += 1) {
        comparisons += 1;
        if (values[index] < values[minimum]) minimum = index;
        record([minimum, index], [], "扫描未排序区间的最小值");
      }
      if (minimum !== start) {
        [values[start], values[minimum]] = [values[minimum], values[start]];
        swaps += 1;
        record([start, minimum], [start, minimum], "把最小值放到区间起点");
      }
    }
  } else {
    for (let index = 1; index < values.length; index += 1) {
      const key = values[index];
      let cursor = index - 1;
      while (cursor >= 0) {
        comparisons += 1;
        if (values[cursor] <= key) break;
        values[cursor + 1] = values[cursor];
        swaps += 1;
        record([cursor, cursor + 1], [cursor, cursor + 1], "右移较大元素");
        cursor -= 1;
      }
      values[cursor + 1] = key;
      record([cursor + 1], [], "插入当前元素");
    }
  }
  return { steps, comparisons, swaps, sorted: values };
}

export const sortingStepsComponent: ImplementedComponent = {
  implemented: true, componentId: "cs.sorting-steps", name: "排序分步",
  catalogDescription: "逐步执行冒泡、选择或插入排序并显示比较与交换",
  configSchema: SortingStepsConfigSchema, patchSchema: SortingStepsPatchSchema,
  schemaDoc: `cs.sorting-steps 的 config 字段(全部字段都有默认值,只写有把握的字段):
- algorithm: 排序算法,"bubble"(冒泡)|"selection"(选择)|"insertion"(插入),默认 "bubble"
- values: 待排序的 4~10 个整数,每个在 [1,99],数组字段整体替换,默认 [5,2,4,1,8,3]`,
  patchHints: `「换一组数据/再乱一点」整体替换 values(长度保持 4~10);「换成选择排序」只改 algorithm;「数据多一点」替换为更长的数组。`,
};

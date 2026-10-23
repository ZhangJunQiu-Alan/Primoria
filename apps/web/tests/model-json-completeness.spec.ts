import { describe, expect, it } from "vitest";
import { parseJsonValue } from "../src/lib/ai/course-generation/model-json";

describe("complete model JSON boundaries", () => {
  it.each([
    '[{"order":1,"markdown":"complete first block"},{"order":2,"html":"truncated',
    '{"config":{"focalLength":30}',
    'Result: [{"order":1,"markdown":"complete"}',
    '{"config":{"focalLength":30]}',
  ])("rejects a truncated or mismatched outer value instead of accepting a nested fragment: %s", (text) => {
    expect(() => parseJsonValue(text)).toThrow(/valid JSON/);
  });
  it.each([
    ['[{"order":1,"markdown":"braces } inside text"}]', [{ order: 1, markdown: "braces } inside text" }]],
    ['Here is [not JSON]. Result: {"x":[1,2]}', { x: [1, 2] }],
    ['```json\n{"x":1}\n```', { x: 1 }],
  ])("preserves complete raw, prose-prefixed, and fenced values", (text, expected) => {
    expect(parseJsonValue(text as string)).toEqual(expected);
  });
});

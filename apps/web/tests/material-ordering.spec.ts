import { describe, expect, it } from "vitest";

import { chineseNumeral, insertionPosition, parseLectureNumber } from "../src/lib/materials/ordering";

describe("parseLectureNumber", () => {
  it.each([
    ["第3讲 对称加密.pdf", 3],
    ["第十二讲-网络安全.pdf", 12],
    ["第二十一章.pdf", 21],
    ["信息安全 第 4 章 访问控制.pdf", 4],
    ["Lecture 03 - Cryptography.pdf", 3],
    ["lecture_10_firewalls.pdf", 10],
    ["Week2 Intro.pdf", 2],
    ["IS-W5-auth.pdf", 5],
    ["L7.pdf", 7],
    ["Ch3.2 Hashing.pdf", 3.2],
    ["Chapter 11 Malware.md", 11],
    ["03-css-layout.pdf", 3],
    ["12 Flexbox.pdf", 12],
    ["Part 2 Selectors.pdf", 2],
  ])("reads %s as %d", (name, expected) => {
    expect(parseLectureNumber(name)).toBe(expected);
  });

  it.each(["syllabus.pdf", "Final Exam 2023.pdf", "2024-review.pdf", "slides_2023_fall.pdf", "Network_Layer.pdf", "notes.md"])(
    "finds no lecture number in %s",
    (name) => {
      expect(parseLectureNumber(name)).toBeNull();
    },
  );

  it("prefers an explicit unit over a leading number", () => {
    expect(parseLectureNumber("2 Lecture 5 recap.pdf")).toBe(5);
    expect(parseLectureNumber("01 第3讲.pdf")).toBe(3);
  });
});

describe("chineseNumeral", () => {
  it("handles 1–99", () => {
    expect(chineseNumeral("九")).toBe(9);
    expect(chineseNumeral("十")).toBe(10);
    expect(chineseNumeral("十五")).toBe(15);
    expect(chineseNumeral("三十")).toBe(30);
    expect(chineseNumeral("两")).toBe(2);
    expect(chineseNumeral("十十")).toBeNull();
    expect(chineseNumeral("百")).toBeNull();
  });
});

describe("insertionPosition", () => {
  const folder = [
    { position: 1, lectureNumber: 1 },
    { position: 2, lectureNumber: null },
    { position: 3, lectureNumber: 3 },
  ];

  it("inserts a numbered lecture before the first larger number", () => {
    expect(insertionPosition(folder, 2)).toBe(2.5);
    expect(insertionPosition(folder, 0)).toBe(0.5);
  });

  it("appends unnumbered files, the largest number, and ties", () => {
    expect(insertionPosition(folder, null)).toBe(4);
    expect(insertionPosition(folder, 9)).toBe(4);
    expect(insertionPosition(folder, 3)).toBe(4);
    expect(insertionPosition([], 2)).toBe(1);
  });

  it("does not depend on input order", () => {
    expect(insertionPosition([...folder].reverse(), 2)).toBe(2.5);
  });
});

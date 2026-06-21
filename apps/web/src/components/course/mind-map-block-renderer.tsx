"use client";

import { useEffect, useRef, useCallback } from "react";
import type { MindMapBlock, MindMapNode } from "@/lib/courses/types";

type MindElixirInstance = {
  init: () => void;
  getData: () => { nodeData: MindMapNode };
  bus: { addListener: (event: string, cb: (op: unknown) => void) => void };
  destroy?: () => void;
};

type MindElixirConstructor = {
  new (opts: {
    el: HTMLElement;
    direction: number;
    data: { nodeData: MindMapNode };
    draggable: boolean;
    editable: boolean;
    contextMenu: boolean;
    toolBar: boolean;
    keypress: boolean;
  }): MindElixirInstance;
  LEFT: number;
  RIGHT: number;
  SIDE: number;
};

export function MindMapBlockRenderer({
  block,
  courseId,
}: {
  block: MindMapBlock;
  courseId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<MindElixirInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockIdRef = useRef(block.id);
  const courseIdRef = useRef(courseId);

  useEffect(() => {
    blockIdRef.current = block.id;
    courseIdRef.current = courseId;
  }, [block.id, courseId]);

  const save = useCallback((root: MindMapNode) => {
    const cId = courseIdRef.current;
    const bId = blockIdRef.current;
    if (!cId) return;
    fetch(`/api/courses/${cId}/blocks/${bId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mind_map", root }),
    }).catch(() => {});
  }, []);

  const scheduleSave = useCallback(() => {
    if (!meRef.current) return;
    const root = meRef.current.getData().nodeData;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(root), 300);
  }, [save]);

  useEffect(() => {
    if (!containerRef.current) return;
    let me: MindElixirInstance | null = null;

    import("mind-elixir").then((mod) => {
      if (!containerRef.current) return;
      const MindElixir = (mod.default ?? mod) as unknown as MindElixirConstructor;
      me = new MindElixir({
        el: containerRef.current,
        direction: MindElixir.SIDE,
        data: { nodeData: block.root },
        draggable: true,
        editable: true,
        contextMenu: false,
        toolBar: false,
        keypress: true,
      });
      me.init();
      meRef.current = me;
      me.bus.addListener("operation", scheduleSave);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      me?.destroy?.();
      meRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="course-mind-map-container"
      style={{ width: "100%", height: 420 }}
    />
  );
}

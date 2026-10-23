"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { WIDGET_COLORS as C } from "../palette";
import { useSceneLocale } from "./scene-frame";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia?.(motionQuery);
  query?.addEventListener("change", callback);
  return () => query?.removeEventListener("change", callback);
}
function readMotion() { return window.matchMedia?.(motionQuery).matches ?? false; }

export function useScenePlayback(ref: RefObject<HTMLElement | null>, durationSeconds: number) {
  const [playing, setPlaying] = useState(false);
  const [fraction, setFraction] = useState<number | null>(null);
  const phase = useRef(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  useEffect(() => {
    if (!playing || reducedMotion || durationSeconds <= 0) return;
    let frame: number | null = null, previous: number | null = null, lastPublished = -Infinity, inView = true;
    const active = () => inView && !document.hidden;
    const tick = (timestamp: number) => {
      frame = null;
      if (!active()) { previous = null; return; }
      const dt = previous === null ? 0 : Math.min(0.05, Math.max(0, (timestamp - previous) / 1000));
      previous = timestamp;
      phase.current = (phase.current + dt / durationSeconds) % 1;
      if (timestamp - lastPublished >= 1000 / 30) { setFraction(phase.current); lastPublished = timestamp; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (active() && frame === null) { previous = null; frame = requestAnimationFrame(tick); }
      else if (!active() && frame !== null) { cancelAnimationFrame(frame); frame = null; previous = null; }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => { inView = entries[0]?.isIntersecting ?? false; sync(); });
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { if (frame !== null) cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [playing, reducedMotion, durationSeconds, ref]);
  return { playing: playing && !reducedMotion, fraction, reducedMotion,
    start: (initialFraction = 0) => { if (reducedMotion || durationSeconds <= 0) return; phase.current = Math.max(0, Math.min(1, initialFraction)); setFraction(phase.current); setPlaying(true); },
    stop: () => setPlaying(false), reset: () => { setPlaying(false); setFraction(null); phase.current = 0; } };
}

export function ScenePlaybackControls({ playback, initialFraction = 0, disabled = false }: {
  playback: ReturnType<typeof useScenePlayback>; initialFraction?: number; disabled?: boolean;
}) {
  const t = useSceneLocale();
  const style = { border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 13px", font: "inherit", fontSize: 12, color: C.ink, background: C.surface, cursor: "pointer" };
  return <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
    <button type="button" disabled={disabled || playback.reducedMotion} aria-pressed={playback.playing} onClick={() => playback.playing ? playback.stop() : playback.start(playback.fraction ?? initialFraction)} style={style}>{playback.playing ? t("暂停", "Pause") : t("播放", "Play")}</button>
    <button type="button" onClick={playback.reset} style={style}>{t("重置播放", "Reset playback")}</button>
    {playback.reducedMotion ? <small style={{ color: C.muted }}>{t("已尊重减少动态效果设置，可拖动时间观察。", "Reduced motion is enabled; scrub time to explore.")}</small> : null}
  </div>;
}

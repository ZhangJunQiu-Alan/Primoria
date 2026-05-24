"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { triggerDownload, slugify } from "./export-utils";

interface ExportOverlayProps {
  title: string;
  exportHtml?: string;
  ready?: boolean;
  children: ReactNode;
}

export function ExportOverlay({ title, exportHtml, ready = true, children }: ExportOverlayProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "saved" | "failed">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canExport = ready && Boolean(exportHtml);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleDownload = useCallback(() => {
    if (!exportHtml) return;
    try {
      const filename = `${slugify(title) || "visualization"}.html`;
      triggerDownload(exportHtml, filename);
      setDownloadState("saved");
      setMenuOpen(false);
      window.setTimeout(() => setDownloadState("idle"), 1800);
    } catch {
      setDownloadState("failed");
    }
  }, [exportHtml, title]);

  const handleCopy = useCallback(() => {
    if (!exportHtml) return;
    navigator.clipboard.writeText(exportHtml).then(
      () => {
        setCopyState("copied");
        setMenuOpen(false);
        window.setTimeout(() => setCopyState("idle"), 1800);
      },
      () => {
        setCopyState("failed");
      }
    );
  }, [exportHtml]);

  const active = hovered || focused || menuOpen;
  const statusText =
    !ready ? "Export available after rendering completes"
    : copyState === "copied" ? "Copied standalone HTML"
    : copyState === "failed" ? "Copy failed"
    : downloadState === "saved" ? "Downloaded HTML"
    : downloadState === "failed" ? "Download failed"
    : "Export widget";

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
          setMenuOpen(false);
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          opacity: active || !ready ? 1 : 0.72,
          transition: "opacity 160ms ease",
        }}
      >
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              if (!canExport) return;
              setMenuOpen((value) => !value);
            }}
            disabled={!canExport}
            aria-label={statusText}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            data-testid={`export-menu-${slugify(title) || "visualization"}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 10,
              boxShadow: "0 8px 18px rgba(23,19,15,0.12)",
              background: "var(--color-background-primary, #fffdf8)",
              border: "1px solid var(--color-border-tertiary, rgba(23,19,15,0.12))",
              color: "var(--color-text-secondary, #6f675f)",
              cursor: canExport ? "pointer" : "not-allowed",
              opacity: canExport ? 1 : 0.52,
            }}
            title={statusText}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                minWidth: 190,
                padding: "5px 0",
                borderRadius: 10,
                boxShadow: "0 14px 34px rgba(23,19,15,0.18)",
                background: "var(--color-background-primary, #fffdf8)",
                border: "1px solid var(--color-border-tertiary, rgba(23,19,15,0.12))",
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleCopy}
                data-testid={`copy-standalone-${slugify(title) || "visualization"}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 12px",
                  border: 0,
                  borderRadius: 0,
                  background: "transparent",
                  color: copyState === "copied" ? "var(--color-text-success, #2f6b43)" : "var(--color-text-primary, #17130f)",
                  fontSize: 12,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary, #f7f3ea)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {copyState === "copied" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                {copyState === "copied" ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleDownload}
                data-testid={`download-standalone-${slugify(title) || "visualization"}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 12px",
                  border: 0,
                  borderRadius: 0,
                  background: "transparent",
                  color: "var(--color-text-primary, #17130f)",
                  fontSize: 12,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary, #f7f3ea)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloadState === "saved" ? "Downloaded" : "Download file"}
              </button>
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

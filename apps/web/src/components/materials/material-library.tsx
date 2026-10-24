"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { msg, useI18n } from "@/lib/i18n/client";
import {
  ACCEPTED_MATERIAL_INPUT,
  MAX_MATERIAL_FILE_BYTES,
  MAX_MATERIALS_PER_COURSE,
  materialFormatFor,
} from "@/lib/materials/limits";
import type { MaterialSummary } from "@/lib/materials/types";

type Notice = { tone: "info" | "error"; text: string };

type UploadResponse = { material?: MaterialSummary; duplicate?: boolean; error?: string };
type DeleteResponse = { ok?: boolean; error?: string; code?: string; courses?: { id: string; title: string }[] };
type BuildResponse = { courseId?: string; error?: string };

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  if (mimeType === "text/markdown") return "MD";
  return "TXT";
}

export function MaterialLibrary({ initialMaterials }: { initialMaterials: MaterialSummary[] }) {
  const { dictionary, language } = useI18n();
  const t = dictionary.materials;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [materials, setMaterials] = useState(initialMaterials);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const busy = uploadingName !== null || building;

  async function uploadOne(file: File): Promise<Notice | null> {
    if (!materialFormatFor(file.name, file.type)) return { tone: "error", text: msg(t.unsupported, { name: file.name }) };
    if (file.size > MAX_MATERIAL_FILE_BYTES) return { tone: "error", text: msg(t.tooLarge, { name: file.name }) };
    setUploadingName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/materials", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as UploadResponse;
      if (!res.ok || !body.material) {
        return { tone: "error", text: msg(t.uploadFailed, { name: file.name, reason: body.error ?? res.statusText }) };
      }
      const material = body.material;
      setMaterials((current) => [material, ...current.filter((entry) => entry.id !== material.id)]);
      return body.duplicate ? { tone: "info", text: msg(t.duplicate, { name: file.name }) } : null;
    } catch {
      return { tone: "error", text: msg(t.uploadFailed, { name: file.name, reason: "network" }) };
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || busy) return;
    setNotices([]);
    const next: Notice[] = [];
    // Sequential: each upload is parsed synchronously server-side.
    for (const file of files) {
      const notice = await uploadOne(file);
      if (notice) next.push(notice);
    }
    setUploadingName(null);
    setNotices(next);
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((entry) => entry !== id));
    } else if (selected.length >= MAX_MATERIALS_PER_COURSE) {
      setNotices([{ tone: "error", text: msg(t.tooManySelected, { max: MAX_MATERIALS_PER_COURSE }) }]);
    } else {
      setSelected([...selected, id]);
    }
  }

  async function removeMaterial(material: MaterialSummary) {
    setDeletingId(material.id);
    setNotices([]);
    try {
      const res = await fetch(`/api/materials/${encodeURIComponent(material.id)}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as DeleteResponse;
      if (res.ok) {
        setMaterials((current) => current.filter((entry) => entry.id !== material.id));
        setSelected((current) => current.filter((entry) => entry !== material.id));
      } else if (body.code === "material_in_use") {
        const courses = (body.courses ?? [])
          .map((course) => (language === "zh" ? `《${course.title}》` : `“${course.title}”`))
          .join(language === "zh" ? "、" : ", ");
        setNotices([{ tone: "error", text: msg(t.inUse, { title: material.title, courses }) }]);
      } else {
        setNotices([{ tone: "error", text: t.deleteFailed }]);
      }
    } catch {
      setNotices([{ tone: "error", text: t.deleteFailed }]);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  async function buildCourse() {
    if (selected.length === 0 || busy) return;
    setBuilding(true);
    setNotices([]);
    try {
      const res = await fetch("/api/materials/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ materialIds: selected }),
      });
      const body = (await res.json().catch(() => ({}))) as BuildResponse;
      if (!res.ok || !body.courseId) {
        setNotices([{ tone: "error", text: body.error ?? t.buildFailed }]);
        setBuilding(false);
        return;
      }
      router.push(`/course/${body.courseId}`);
    } catch {
      setNotices([{ tone: "error", text: t.buildFailed }]);
      setBuilding(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  }

  const dateFormat = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium" });

  return (
    <div className="materials-library">
      <div
        className={`materials-dropzone${dragging ? " dragging" : ""}${busy ? " busy" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MATERIAL_INPUT}
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void uploadFiles(files);
          }}
        />
        <button type="button" className="library-create-course" disabled={busy} onClick={() => inputRef.current?.click()}>
          {t.upload}
        </button>
        <p>{uploadingName ? msg(t.uploading, { name: uploadingName }) : t.dropHint}</p>
      </div>

      {notices.length > 0 ? (
        <ul className="materials-notices" role="status">
          {notices.map((notice, index) => (
            <li key={index} className={`materials-notice ${notice.tone}`}>{notice.text}</li>
          ))}
        </ul>
      ) : null}

      {materials.length === 0 ? (
        <div className="library-empty">
          <p>{t.empty}</p>
        </div>
      ) : (
        <section className="materials-list-card" aria-label={t.pageTitle}>
          <header className="materials-list-header">
            <span>{msg(t.countLabel, { count: materials.length })}</span>
            <span>{msg(t.selectHint, { max: MAX_MATERIALS_PER_COURSE })}</span>
          </header>
          <ul className="materials-list">
            {materials.map((material) => {
              const checked = selected.includes(material.id);
              const confirming = confirmingDeleteId === material.id;
              return (
                <li key={material.id} className={checked ? "selected" : undefined}>
                  <label className="materials-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={building}
                      onChange={() => toggle(material.id)}
                      aria-label={msg(t.select, { title: material.title })}
                    />
                    <span className="materials-item-format">{formatLabel(material.mimeType)}</span>
                    <span className="materials-item-copy">
                      <strong>{material.title}</strong>
                      <small>
                        {[
                          material.pageCount ? msg(t.pages, { count: material.pageCount }) : null,
                          msg(t.chars, { count: material.charCount.toLocaleString() }),
                          formatSize(material.byteLength),
                          msg(t.uploadedAt, { date: dateFormat.format(material.createdAt) }),
                        ].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className={`materials-delete${confirming ? " confirming" : ""}`}
                    disabled={deletingId === material.id || building}
                    aria-label={msg(t.deleteLabel, { title: material.title })}
                    onClick={() => (confirming ? void removeMaterial(material) : setConfirmingDeleteId(material.id))}
                    onBlur={() => setConfirmingDeleteId((current) => (current === material.id ? null : current))}
                  >
                    {deletingId === material.id ? t.deleting : confirming ? t.confirmDelete : t.delete}
                  </button>
                </li>
              );
            })}
          </ul>
          <footer className="materials-actions">
            <span>{msg(t.selectedCount, { count: selected.length, max: MAX_MATERIALS_PER_COURSE })}</span>
            <button
              type="button"
              className="library-create-course"
              disabled={selected.length === 0 || busy}
              onClick={() => void buildCourse()}
            >
              {t.buildCourse}
            </button>
          </footer>
          {building ? <p className="materials-building" role="status">{t.building}</p> : null}
        </section>
      )}

      <p className="materials-privacy-note">
        {t.privacyNote} <Link href="/library">{t.viewLibrary}</Link>
      </p>
    </div>
  );
}

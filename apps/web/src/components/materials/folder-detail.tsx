"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { msg, useI18n } from "@/lib/i18n/client";
import {
  ACCEPTED_MATERIAL_INPUT,
  MAX_MATERIAL_FILE_BYTES,
  MAX_MATERIALS_PER_COURSE,
  materialFormatFor,
} from "@/lib/materials/limits";
import type { FolderGraphOverview } from "@/lib/materials/folder-overview";
import type { FolderKind, MaterialRole, MaterialSummary } from "@/lib/materials/types";

type Notice = { tone: "info" | "error"; text: string };
type FolderRef = { id: string; name: string; kind: FolderKind };

type UploadResponse = { material?: MaterialSummary; duplicate?: boolean; error?: string };
type DeleteResponse = { ok?: boolean; error?: string; code?: string; courses?: { id: string; title: string }[] };
type BuildResponse = { courseId?: string; error?: string };
type MaterialResponse = { material?: MaterialSummary; error?: string };
type FolderResponse = { folder?: FolderRef; error?: string; code?: string };

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

const byPosition = (a: MaterialSummary, b: MaterialSummary) => a.position - b.position || a.createdAt - b.createdAt;
const KG_POLL_MS = 5_000;
const isAnalyzing = (material: MaterialSummary) => material.kgStatus === "pending" || material.kgStatus === "processing";

export function FolderDetail({
  folder: initialFolder,
  folders,
  initialMaterials,
  initialOverview = null,
}: {
  folder: FolderRef;
  folders: FolderRef[];
  initialMaterials: MaterialSummary[];
  initialOverview?: FolderGraphOverview | null;
}) {
  const { dictionary, language } = useI18n();
  const t = dictionary.materials;
  const tf = dictionary.folders;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [folder, setFolder] = useState(initialFolder);
  const [materials, setMaterials] = useState(() => [...initialMaterials].sort(byPosition));
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadRole, setUploadRole] = useState<MaterialRole>("lecture");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialFolder.name);
  const [confirmingFolderDelete, setConfirmingFolderDelete] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [overview, setOverview] = useState(initialOverview);
  const busy = uploadingName !== null || building;
  const analyzing = materials.some(isAnalyzing);
  const readyCount = useRef(initialMaterials.filter((material) => material.kgStatus === "ready").length);

  // While a lecture is being analyzed, poll the folder; whenever another
  // lecture finishes, refresh the knowledge-graph overview.
  useEffect(() => {
    if (!analyzing) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { materials?: MaterialSummary[] };
        if (cancelled || !res.ok || !body.materials) return;
        const next = [...body.materials].sort(byPosition);
        setMaterials(next);
        const ready = next.filter((material) => material.kgStatus === "ready").length;
        if (ready !== readyCount.current) {
          readyCount.current = ready;
          void refreshOverview();
        }
      } catch {
        // keep polling
      }
    }, KG_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // refreshOverview only reads folder.id, which the effect already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing, folder.id]);

  async function refreshOverview() {
    if (folder.kind !== "subject") return;
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}/graph`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { overview?: FolderGraphOverview };
      if (res.ok && body.overview) setOverview(body.overview);
    } catch {
      // the overview is informational
    }
  }

  async function retryKg(material: MaterialSummary) {
    try {
      const res = await fetch(`/api/materials/${encodeURIComponent(material.id)}/kg`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as MaterialResponse;
      if (!res.ok || !body.material) throw new Error("retry rejected");
      const updated = body.material;
      setMaterials((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch {
      setNotices([{ tone: "error", text: t.kgRetryFailed }]);
    }
  }
  const isSubject = folder.kind === "subject";
  const folderName = isSubject ? folder.name : tf.unsorted;
  const otherFolders = folders.filter((entry) => entry.id !== folder.id);

  async function uploadOne(file: File): Promise<Notice | null> {
    if (!materialFormatFor(file.name, file.type)) return { tone: "error", text: msg(t.unsupported, { name: file.name }) };
    if (file.size > MAX_MATERIAL_FILE_BYTES) return { tone: "error", text: msg(t.tooLarge, { name: file.name }) };
    setUploadingName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folderId", folder.id);
      form.append("role", uploadRole);
      const res = await fetch("/api/materials", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as UploadResponse;
      if (!res.ok || !body.material) {
        return { tone: "error", text: msg(t.uploadFailed, { name: file.name, reason: body.error ?? res.statusText }) };
      }
      const material = body.material;
      if (material.folderId === folder.id) {
        setMaterials((current) => [...current.filter((entry) => entry.id !== material.id), material].sort(byPosition));
      }
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

  async function saveOrder(next: MaterialSummary[]) {
    const previous = materials;
    setMaterials(next);
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}/order`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ materialIds: next.map((material) => material.id) }),
      });
      const body = (await res.json().catch(() => ({}))) as { materials?: MaterialSummary[] };
      if (!res.ok || !body.materials) throw new Error("order rejected");
      setMaterials([...body.materials].sort(byPosition));
      void refreshOverview();
    } catch {
      setMaterials(previous);
      setNotices([{ tone: "error", text: t.orderFailed }]);
    }
  }

  function moveTo(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= materials.length || fromIndex === toIndex) return;
    const next = [...materials];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void saveOrder(next);
  }

  async function patchMaterial(material: MaterialSummary, patch: { role?: MaterialRole; folderId?: string }) {
    setNotices([]);
    try {
      const res = await fetch(`/api/materials/${encodeURIComponent(material.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json().catch(() => ({}))) as MaterialResponse;
      if (!res.ok || !body.material) throw new Error("update rejected");
      const updated = body.material;
      if (updated.folderId !== folder.id) {
        setMaterials((current) => current.filter((entry) => entry.id !== updated.id));
        setSelected((current) => current.filter((entry) => entry !== updated.id));
      } else {
        setMaterials((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)).sort(byPosition));
      }
      void refreshOverview();
    } catch {
      setNotices([{ tone: "error", text: t.updateFailed }]);
    }
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
        void refreshOverview();
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

  async function saveName() {
    if (!nameDraft.trim() || nameDraft.trim() === folder.name) {
      setRenaming(false);
      return;
    }
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
      const body = (await res.json().catch(() => ({}))) as FolderResponse;
      if (!res.ok || !body.folder) {
        setNotices([{ tone: "error", text: body.code === "duplicate_name" ? tf.duplicateName : tf.renameFailed }]);
        return;
      }
      setFolder(body.folder);
      setRenaming(false);
    } catch {
      setNotices([{ tone: "error", text: tf.renameFailed }]);
    }
  }

  async function deleteFolder() {
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete rejected");
      router.push("/materials");
    } catch {
      setConfirmingFolderDelete(false);
      setNotices([{ tone: "error", text: tf.deleteFolderFailed }]);
    }
  }

  function onFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setFileDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function onItemDrop(event: DragEvent<HTMLLIElement>, targetIndex: number) {
    event.preventDefault();
    if (!draggedId) return;
    const fromIndex = materials.findIndex((material) => material.id === draggedId);
    setDraggedId(null);
    if (fromIndex >= 0) moveTo(fromIndex, targetIndex);
  }

  const dateFormat = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium" });
  // Lectures are numbered in folder order; references take no number.
  const lectureIndexById = new Map(
    materials.filter((material) => material.role === "lecture").map((material, index) => [material.id, index + 1]),
  );

  return (
    <div className="materials-library">
      <div className="folder-detail-header">
        <Link href="/materials" className="folder-detail-back">← {tf.back}</Link>
        {renaming ? (
          <form
            className="folders-create"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <input type="text" value={nameDraft} aria-label={tf.rename} onChange={(event) => setNameDraft(event.target.value)} autoFocus />
            <button type="submit" className="library-create-course">{tf.renameSave}</button>
          </form>
        ) : (
          <h2>{folderName}</h2>
        )}
        {isSubject && !renaming ? (
          <div className="folder-detail-actions">
            <button type="button" className="materials-delete" onClick={() => setRenaming(true)}>{tf.rename}</button>
            <button
              type="button"
              className={`materials-delete${confirmingFolderDelete ? " confirming" : ""}`}
              title={tf.deleteFolderHint}
              onClick={() => (confirmingFolderDelete ? void deleteFolder() : setConfirmingFolderDelete(true))}
              onBlur={() => setConfirmingFolderDelete(false)}
            >
              {confirmingFolderDelete ? tf.confirmDeleteFolder : tf.deleteFolder}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={`materials-dropzone${fileDragging ? " dragging" : ""}${busy ? " busy" : ""}`}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          if (!busy) setFileDragging(true);
        }}
        onDragLeave={() => setFileDragging(false)}
        onDrop={onFileDrop}
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
        <label className="materials-upload-role">
          {t.uploadAs}
          <select value={uploadRole} disabled={busy} onChange={(event) => setUploadRole(event.target.value as MaterialRole)}>
            <option value="lecture">{t.roleLecture}</option>
            <option value="reference">{t.roleReference}</option>
          </select>
        </label>
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
        <section className="materials-list-card" aria-label={folderName}>
          <header className="materials-list-header">
            <span>{msg(t.countLabel, { count: materials.length })}</span>
            <span>{t.dragHint}</span>
          </header>
          <ul className="materials-list">
            {materials.map((material, index) => {
              const checked = selected.includes(material.id);
              const confirming = confirmingDeleteId === material.id;
              const lectureIndex = lectureIndexById.get(material.id);
              return (
                <li
                  key={material.id}
                  className={[checked ? "selected" : "", draggedId === material.id ? "dragging" : ""].filter(Boolean).join(" ") || undefined}
                  draggable={!busy}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedId(material.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => {
                    if (draggedId) event.preventDefault();
                  }}
                  onDrop={(event) => onItemDrop(event, index)}
                >
                  <span className="materials-order-tag">{lectureIndex ? msg(t.lectureIndex, { index: lectureIndex }) : t.referenceTag}</span>
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
                          material.orderSource === "filename" ? t.orderFromFilename : material.orderSource === "manual" ? t.orderManual : null,
                        ].filter(Boolean).join(" · ")}
                      </small>
                      {isAnalyzing(material) ? <small className="materials-kg-status pending">{t.kgPending}</small> : null}
                      {material.kgStatus === "ready" ? <small className="materials-kg-status ready">{t.kgReady}</small> : null}
                    </span>
                  </label>
                  {material.kgStatus === "failed" ? (
                    <span className="materials-kg-failed">
                      <small className="materials-kg-status failed">{t.kgFailed}</small>
                      <button type="button" className="materials-delete" onClick={() => void retryKg(material)}>{t.kgRetry}</button>
                    </span>
                  ) : null}
                  <div className="materials-item-controls">
                    <button type="button" className="materials-icon-button" aria-label={msg(t.moveUp, { title: material.title })} disabled={index === 0 || busy} onClick={() => moveTo(index, index - 1)}>↑</button>
                    <button type="button" className="materials-icon-button" aria-label={msg(t.moveDown, { title: material.title })} disabled={index === materials.length - 1 || busy} onClick={() => moveTo(index, index + 1)}>↓</button>
                    <select
                      value={material.role}
                      aria-label={msg(t.roleLabel, { title: material.title })}
                      disabled={busy}
                      onChange={(event) => void patchMaterial(material, { role: event.target.value as MaterialRole })}
                    >
                      <option value="lecture">{t.roleLecture}</option>
                      <option value="reference">{t.roleReference}</option>
                    </select>
                    {otherFolders.length > 0 ? (
                      <select
                        value=""
                        aria-label={msg(t.moveLabel, { title: material.title })}
                        disabled={busy}
                        onChange={(event) => {
                          if (event.target.value) void patchMaterial(material, { folderId: event.target.value });
                        }}
                      >
                        <option value="">{t.moveTo}</option>
                        {otherFolders.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.kind === "unsorted" ? tf.unsorted : entry.name}</option>
                        ))}
                      </select>
                    ) : null}
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
                  </div>
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

      <section className="materials-list-card folder-graph" aria-label={t.graphTitle}>
        <header className="materials-list-header">
          <span>{t.graphTitle}</span>
          {overview?.conceptCount ? <span>{msg(t.graphCount, { count: overview.conceptCount })}</span> : null}
        </header>
        {!isSubject ? (
          <p className="folder-graph-empty">{t.graphUnsorted}</p>
        ) : !overview || overview.lectures.length === 0 ? (
          <p className="folder-graph-empty">{t.graphEmpty}</p>
        ) : (
          <ol className="folder-graph-lectures">
            {overview.lectures.map((lecture, index) => (
              <li key={lecture.materialId}>
                <strong>{msg(t.lectureIndex, { index: index + 1 })} · {lecture.title}</strong>
                <ul>
                  {lecture.concepts.map((concept) => (
                    <li key={concept.conceptId} className={`folder-graph-concept concept-${concept.status}`} title={dictionary.course.conceptStatus[concept.status]}>
                      <span className="course-lesson-concept-dot" aria-hidden="true" />
                      {concept.name}
                      <span className="sr-only"> · {dictionary.course.conceptStatus[concept.status]}</span>
                      {concept.revisitedIn > 0 ? <small>{msg(t.revisited, { count: concept.revisitedIn })}</small> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="materials-privacy-note">
        {t.privacyNote} <Link href="/library">{t.viewLibrary}</Link>
      </p>
    </div>
  );
}

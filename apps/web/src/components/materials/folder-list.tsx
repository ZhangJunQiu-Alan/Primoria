"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { msg, useT } from "@/lib/i18n/client";
import { MAX_FOLDER_NAME_CHARS, type FolderSummary } from "@/lib/materials/types";

type CreateResponse = { folder?: { id: string }; error?: string; code?: string };

export function FolderList({ initialFolders }: { initialFolders: FolderSummary[] }) {
  const t = useT().folders;
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjects = initialFolders.filter((folder) => folder.kind === "subject");
  const unsorted = initialFolders.find((folder) => folder.kind === "unsorted");

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => ({}))) as CreateResponse;
      if (!res.ok || !body.folder) {
        setError(body.code === "duplicate_name" ? t.duplicateName : t.createFailed);
        setCreating(false);
        return;
      }
      router.push(`/materials/${body.folder.id}`);
    } catch {
      setError(t.createFailed);
      setCreating(false);
    }
  }

  return (
    <div className="materials-library">
      <form className="folders-create" onSubmit={create}>
        <input
          type="text"
          value={name}
          maxLength={MAX_FOLDER_NAME_CHARS}
          placeholder={t.createPlaceholder}
          aria-label={t.create}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="library-create-course" disabled={!name.trim() || creating}>
          {creating ? t.creating : t.create}
        </button>
      </form>
      {error ? <p className="materials-notice error" role="status">{error}</p> : null}

      {subjects.length === 0 ? (
        <div className="library-empty">
          <p>{t.empty}</p>
        </div>
      ) : (
        <ul className="folders-grid">
          {subjects.map((folder) => (
            <li key={folder.id}>
              <Link href={`/materials/${folder.id}`} className="folders-card">
                <strong>{folder.name}</strong>
                <span>
                  {msg(t.lectureCount, { count: folder.lectureCount })} · {msg(t.fileCount, { count: folder.materialCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {unsorted ? (
        <Link href={`/materials/${unsorted.id}`} className="folders-card folders-unsorted">
          <strong>{t.unsorted}</strong>
          <span>{msg(t.fileCount, { count: unsorted.materialCount })} · {t.unsortedHint}</span>
        </Link>
      ) : null}
    </div>
  );
}

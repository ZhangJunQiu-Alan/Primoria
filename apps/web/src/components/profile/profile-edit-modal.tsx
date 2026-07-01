"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

type ProfileEditModalProps = {
  initialDisplayName: string;
};

export function ProfileEditModal({ initialDisplayName }: ProfileEditModalProps) {
  const dict = useT();
  const t = dict.profile;
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || t.unableSave);
      setOpen(false);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.unableSave);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="profile-edit-button" onClick={() => setOpen(true)}>
        {t.editProfile}
      </button>
      {open ? (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <form className="profile-modal" onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <button type="button" className="profile-modal-close" aria-label={t.closeEdit} onClick={() => setOpen(false)}>
              ×
            </button>
            <div>
              <h2 id="profile-edit-title">{t.editTitle}</h2>
              <p>{t.editCopy}</p>
            </div>
            <label className="profile-form-field">
              <span>{t.displayName}</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </label>
            {message ? <p className="profile-modal-error">{message}</p> : null}
            <div className="profile-modal-actions">
              <button type="button" onClick={() => setOpen(false)} disabled={pending}>{dict.common.cancel}</button>
              <button type="submit" disabled={pending}>{pending ? dict.common.saving : dict.common.save}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

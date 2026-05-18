"use client";

import { useState } from "react";

type TutorComposerProps = {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
};

export function TutorComposer({ onSend, disabled = false }: TutorComposerProps) {
  const [value, setValue] = useState("");

  return (
    <div className="composer-wrap">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const message = value;
          setValue("");
          void onSend(message);
        }}
      >
        <input
          aria-label="Tutor prompt"
          placeholder="Ask anything, or ask for an interactive visualization..."
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
        <button className="send" aria-label="Send" disabled={disabled}>
          ›
        </button>
      </form>
    </div>
  );
}

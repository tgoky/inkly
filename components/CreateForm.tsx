"use client";

import { useState } from "react";

export default function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, slug: slug || undefined }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage({ ok: false, text: json.error ?? "Something went wrong" });
      return;
    }

    setMessage({ ok: true, text: `Created /${json.link.slug}` });
    setUrl("");
    setSlug("");
    onCreated();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New short link</h2>
      <div className="row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Destination URL (https://...)"
          aria-label="Destination URL"
          required
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Custom slug (optional)"
          aria-label="Custom slug"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create"}
        </button>
      </div>
      {message && (
        <p className={message.ok ? "ok" : "error"}>{message.text}</p>
      )}
    </form>
  );
}

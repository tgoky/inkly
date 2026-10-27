"use client";

import { useState } from "react";
import type { LinkRecord } from "@/lib/store";

export default function LinkTable({
  links,
  onChanged,
}: {
  links: LinkRecord[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(slug: string) {
    setError(null);
    const res = await fetch(`/api/links/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: draft }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Could not update the link");
      return;
    }
    setEditing(null);
    onChanged();
  }

  async function remove(slug: string) {
    await fetch(`/api/links/${slug}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <section className="card">
      <h2>Your links</h2>
      {error && <p className="error">{error}</p>}
      {links.length === 0 ? (
        <p className="muted">No links yet. Create one above.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Short link</th>
              <th>Destination</th>
              <th className="num">Clicks</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.slug}>
                <td>
                  <a href={`/${link.slug}`} target="_blank" rel="noreferrer">
                    /{link.slug}
                  </a>
                </td>
                <td className="dest">
                  {editing === link.slug ? (
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      aria-label={`New destination for ${link.slug}`}
                    />
                  ) : (
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.url}
                    </a>
                  )}
                </td>
                <td className="num">{link.clicks}</td>
                <td className="actions">
                  {editing === link.slug ? (
                    <>
                      <button onClick={() => save(link.slug)}>Save</button>
                      <button className="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="ghost"
                        onClick={() => {
                          setEditing(link.slug);
                          setDraft(link.url);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="ghost danger"
                        onClick={() => remove(link.slug)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

"use client";

import type { Stats } from "./Dashboard";

export default function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <section className="card">
        <h2>Analytics</h2>
        <p className="muted">Loading...</p>
      </section>
    );
  }

  const max = Math.max(1, ...stats.perDay.map((d) => d.clicks));

  return (
    <section className="card">
      <h2>Analytics</h2>

      <div className="tiles">
        <div className="tile">
          <span className="tile-value">{stats.totalLinks}</span>
          <span className="muted">links</span>
        </div>
        <div className="tile">
          <span className="tile-value">{stats.totalClicks}</span>
          <span className="muted">total clicks</span>
        </div>
        <div className="tile">
          <span className="tile-value small">{stats.serverTimezone}</span>
          <span className="muted">server timezone</span>
        </div>
      </div>

      <h3>Clicks per day</h3>
      {stats.perDay.length === 0 ? (
        <p className="muted">No clicks recorded yet.</p>
      ) : (
        <div className="bars">
          {stats.perDay.map((d) => (
            <div className="bar-col" key={d.day} title={`${d.day}: ${d.clicks}`}>
              <span className="bar-count">{d.clicks}</span>
              <div
                className="bar"
                style={{ height: `${Math.round((d.clicks / max) * 100)}%` }}
              />
              <span className="bar-label">{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      )}

      <h3>Top referrers</h3>
      {stats.topReferrers.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <ul className="referrers">
          {stats.topReferrers.map((r) => (
            <li key={r.referrer}>
              <span>{r.referrer}</span>
              <span className="muted">{r.clicks}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

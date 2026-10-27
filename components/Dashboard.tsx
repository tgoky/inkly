"use client";

import { useCallback, useEffect, useState } from "react";
import CreateForm from "./CreateForm";
import LinkTable from "./LinkTable";
import StatsPanel from "./StatsPanel";
import type { LinkRecord } from "@/lib/store";
import type { DayBucket, ReferrerBucket } from "@/lib/stats";

export interface Stats {
  totalLinks: number;
  totalClicks: number;
  perDay: DayBucket[];
  topReferrers: ReferrerBucket[];
  serverTimezone: string;
}

export default function Dashboard() {
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pull the latest links and stats from the API.
  const refresh = useCallback(async () => {
    try {
      const [linksRes, statsRes] = await Promise.all([
        fetch("/api/links", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
      ]);
      const linksJson = await linksRes.json();
      const statsJson = await statsRes.json();
      setLinks(linksJson.links);
      setStats(statsJson);
      setError(null);
    } catch {
      setError("Could not load data from the API.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="wrap">
      <header className="top">
        <h1>Linkly</h1>
        <p className="muted">Short links with click analytics</p>
      </header>

      {error && <p className="error">{error}</p>}

      <CreateForm onCreated={refresh} />
      <StatsPanel stats={stats} />
      <LinkTable links={links} onChanged={refresh} />
    </main>
  );
}

import type { ClickEvent } from "./store";

export interface DayBucket {
  day: string; // YYYY-MM-DD
  clicks: number;
}

export interface ReferrerBucket {
  referrer: string;
  clicks: number;
}

// Group click events into one bucket per calendar day.
export function clicksPerDay(events: ClickEvent[]): DayBucket[] {
  const buckets = new Map<string, number>();

  for (const event of events) {
    const d = new Date(event.ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, clicks]) => ({ day, clicks }));
}

// Count clicks per referring hostname. No referrer header means "direct".
export function topReferrers(events: ClickEvent[], limit = 5): ReferrerBucket[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    let referrer = "direct";
    if (event.referrer) {
      try {
        referrer = new URL(event.referrer).hostname;
      } catch {
        referrer = "unknown";
      }
    }
    counts.set(referrer, (counts.get(referrer) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([referrer, clicks]) => ({ referrer, clicks }));
}

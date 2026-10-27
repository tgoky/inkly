import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";
import { clicksPerDay, topReferrers } from "@/lib/stats";

export const dynamic = "force-dynamic";

// GET /api/stats -> totals, clicks per day and top referrers.
export async function GET() {
  const db = await readDb();

  return NextResponse.json({
    totalLinks: Object.keys(db.links).length,
    totalClicks: Object.values(db.links).reduce((sum, l) => sum + l.clicks, 0),
    perDay: clicksPerDay(db.events),
    topReferrers: topReferrers(db.events),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

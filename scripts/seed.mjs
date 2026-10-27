// Resets data/db.json to a known demo state.
// Usage: npm run seed
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const links = {
  docs: {
    slug: "docs",
    url: "https://nextjs.org/docs",
    createdAt: "2026-10-18T09:00:00.000Z",
    clicks: 0,
  },
  promo: {
    slug: "promo",
    url: "https://example.com/spring-sale",
    createdAt: "2026-10-19T12:30:00.000Z",
    clicks: 0,
  },
  gh: {
    slug: "gh",
    url: "https://github.com",
    createdAt: "2026-10-20T15:45:00.000Z",
    clicks: 0,
  },
};

// [ISO timestamp, slug, referrer]
const rows = [
  ["2026-10-21T10:15:00Z", "docs", "https://news.ycombinator.com/"],
  ["2026-10-21T14:02:00Z", "docs", "https://twitter.com/"],
  ["2026-10-21T18:40:00Z", "promo", null],
  ["2026-10-22T08:10:00Z", "docs", "https://news.ycombinator.com/"],
  ["2026-10-22T09:20:00Z", "gh", null],
  ["2026-10-22T11:55:00Z", "promo", "https://mail.google.com/"],
  ["2026-10-22T16:30:00Z", "docs", "https://twitter.com/"],
  ["2026-10-23T07:45:00Z", "gh", "https://www.linkedin.com/"],
  ["2026-10-23T13:05:00Z", "docs", null],
  ["2026-10-23T19:25:00Z", "promo", "https://mail.google.com/"],
  // These five clicks sit right around midnight UTC. Which calendar day
  // they belong to depends on the timezone you ask the question in.
  ["2026-10-24T23:10:00Z", "docs", "https://news.ycombinator.com/"],
  ["2026-10-24T23:30:00Z", "promo", "https://twitter.com/"],
  ["2026-10-24T23:50:00Z", "docs", null],
  ["2026-10-25T00:20:00Z", "gh", "https://www.linkedin.com/"],
  ["2026-10-25T00:40:00Z", "docs", "https://news.ycombinator.com/"],
  ["2026-10-25T09:00:00Z", "promo", "https://mail.google.com/"],
  ["2026-10-25T15:15:00Z", "docs", null],
];

const events = rows.map(([ts, slug, referrer]) => {
  links[slug].clicks += 1;
  return { slug, ts, referrer };
});

await mkdir(path.dirname(DB_PATH), { recursive: true });
await writeFile(DB_PATH, JSON.stringify({ links, events }, null, 2));

console.log(
  `Seeded ${Object.keys(links).length} links and ${events.length} click events -> ${DB_PATH}`
);

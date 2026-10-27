# Linkly

A tiny link shortener with click analytics, built with Next.js (App Router) and TypeScript.
Data lives in a single JSON file (`data/db.json`), so there is nothing to set up besides Node.

## Run it

```bash
npm install
npm run seed     # creates data/db.json with demo links and click history
npm run dev      # http://localhost:3000
```

## API

| Method | Path | Body | Result |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/links` | | `{ links: LinkRecord[] }`, newest first |
| `POST` | `/api/links` | `{ url, slug? }` | `201 { link }` |
| `PATCH` | `/api/links/:slug` | `{ url }` | `200 { link }` |
| `DELETE` | `/api/links/:slug` | | `204` |
| `GET` | `/api/stats` | | totals, clicks per day, top referrers |
| `GET` | `/:slug` | | records a click and redirects to the destination |

## Layout

```
app/[slug]/route.ts          redirect + click logging
app/api/links/route.ts       list + create
app/api/links/[slug]/route.ts  edit + delete
app/api/stats/route.ts       analytics
components/                  dashboard UI
lib/store.ts                 JSON file storage
lib/slug.ts                  random slug generator
lib/stats.ts                 per-day and referrer aggregation
scripts/                     seed, hammer, collide, stats helpers
```

## Helper scripts

| Command | What it does |
| :--- | :--- |
| `npm run seed` | Reset `data/db.json` to the demo data |
| `npm run hammer` | Send 50 simultaneous visits to `/docs` and check the click counter |
| `npm run collide` | Check that creating links never overwrites an existing link |
| `npm run stats` | Print `/api/stats` in the terminal |
| `npm run dev:la` | Start the dev server with the timezone set to `America/Los_Angeles` |

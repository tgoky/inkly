# Linkly — Codebase Tour: Point-and-Say Deep Dive
### A companion script to `LINKLY_MVP_TO_PRODUCTION_SCRIPT.md` (replaces Part 2, the tour)

---

## How to use this file

The tour in the main script tells you *what* to cover. This file tells you *how to cover it with your mouse*: for every file you open, there is a one-breath summary, then numbered **point cards**. Each point card tells you **exactly what to select with the mouse** (your selection stays highlighted on screen while you talk) and **exactly what to say**. The reviewer's eyes follow your highlight — so the highlight *is* the presentation.

**Rules that make this work on camera:**

1. **Select, don't hover.** Double-click selects a word; click-and-drag selects a chunk of lines. The blue selection box stays visible for as long as you talk about it. That's your pointer.
2. **For compound tokens** like `max-age=31536000` or `Record<string, LinkRecord>`, drag across the whole thing — a double-click may only grab part of it.
3. **Move slowly.** Drift the cursor toward the next thing you'll select *while* you finish the current sentence. Never wave the mouse; never jump across the file.
4. **Say the file name when the tab changes.** "Now, lib slash store dot ts." The viewer hears the filename and sees it in the tab at the same time — that pairing is what makes the tour feel structured.
5. **Zoom to ~125% before recording** (Cmd/Ctrl and +) so the code is legible on the recording.
6. **Escape or click once** to deselect before moving to the next card, so the old highlight doesn't linger.

**Each file section has three layers — use them like this:**

- **One-breath summary** — say this as the file opens, so the viewer always knows where they are.
- **Point cards** — the main narration. Select → say → next.
- **Jargon decoder** — short, plain-language explanations you deploy *only if* you stumble or the reviewer would obviously need them. Don't read these out loud unless needed; they're your safety net.
- **⚑ FLAG** — the one sentence that plants a hardening gap. Every server-side file ends with one (the UI ends with "the risk isn't here"). These flags are the setup for everything you do in Parts 3–7 of the main script.

**Time budget:** the deep version below runs about 7½ minutes instead of the main script's 6. If you use it, reclaim the minute by keeping the folder-walk to ~20 seconds and the UI section to ~45 seconds. The rest of the timeline still lands at 30 minutes.

| File | Deep-dive time |
| :--- | :--- |
| `lib/store.ts` | ~2:00 |
| `lib/slug.ts` | ~0:45 |
| `lib/stats.ts` | ~1:15 |
| `app/[slug]/route.ts` | ~1:30 |
| `app/api/links/route.ts` | ~1:00 |
| `app/api/links/[slug]/route.ts` | ~0:45 |
| `app/api/stats/route.ts` | ~0:30 |
| `components/` (overview only) | ~0:45 |

---

## Before you open any file: the 20-second map (say this over the explorer)

**[DO]** Hover the explorer. Point the cursor at each folder as you name it — don't open anything yet.

> "Before I open anything, here's the mental map. `app` is Next.js — every file in here is either a page or an API endpoint. `components` is the dashboard UI, plain React. `lib` is where the real logic lives — storage, slug generation, analytics. `scripts` holds the audit utilities I'll run later. And `data` is the database itself — literally one JSON file. So the whole app is: **browser talks to routes, routes talk to lib, lib talks to one file.** Now let's follow that chain, starting at the bottom, with the storage layer."

---

## FILE 1 — `lib/store.ts` (~2:00)

**One-breath summary (say as it opens):**

> "lib slash store dot ts — the foundation. This single file *is* the database: the shapes of the data, one function to read it, one function to write it. Everything else in the app goes through here."

**Point 1 — the imports** · *select `import { promises as fs } from "fs";` down to `import path from "path";`*

> "Two imports from Node itself. `fs` is the file-system module — and notice the word `promises`: it's the version of Node's file tools where every operation returns a promise, so I can `await` a file read like any other asynchronous call. `path` just builds file locations that work on any operating system — Windows, Mac, Linux, same code."

**Point 2 — the first type: one short link** · *select the whole `LinkRecord` interface*

> "First data shape: `LinkRecord` — one short link. Four fields, and I'll read them as what they *mean*. `slug` is the short code itself — the 'docs' in slash-docs. `url` is the destination it points at. `createdAt` is a timestamp stored as text — and look at the comment: ISO 8601, always UTC. Hold onto that; time is going to matter today. And `clicks` is the counter the whole analytics story hangs on."

**Point 3 — the second type: one visit** · *select the whole `ClickEvent` interface*

> "Second shape: `ClickEvent` — one row per visit. Which slug was hit, the exact moment it happened — again UTC — and the `referrer`: where the visitor came from. Notice the type: `string | null`. If someone types the URL directly into the address bar there is no referrer header, so it's null — and later the analytics will label that 'direct' traffic. So this one little interface answers two questions for every click: *when*, and *from where*."

**Point 4 — the whole database** · *select the whole `Db` interface, then re-select just `Record<string, LinkRecord>`*

> "And `Db` is the entire database in two fields. The interesting one is this: `Record<string, LinkRecord>`. That's TypeScript for 'an object used as a dictionary' — the key is a slug, the value is the link. Which makes looking up a link instant and free: `db.links` square-bracket 'docs'. Done. No loop, no search. The second field, `events`, is a plain array — an append-only logbook of visits."

> "If you've seen a real database: this is my links table and my visits log, in miniature, in one file."

**Point 5 — where the file lives** · *select `const DB_PATH = path.join(process.cwd(), "data", "db.json");`*

> "One constant: the path. `process.cwd` is wherever the server was started, so this resolves to the project's `data` folder, file `db.json`. That's it — the entire database is one JSON file. Zero setup is the feature. It also means *I* own every guarantee a real database would normally give me — and that's the theme of the day."

**Point 6 — reading the file** · *select `const raw = await fs.readFile(DB_PATH, "utf8");` then `const db = JSON.parse(raw) as Db;`*

> "Reading is two steps. `readFile` grabs the file's raw text — with an `await`, because the disk is slow relative to the CPU. Then `JSON.parse` turns that text into live objects. Text in, objects out."

> "And here's the detail I want everyone to catch: that `await` is a *real* pause. While Node is off reading this file, it is free to serve other requests. So the shape of every operation in this app is: read starts... other work can slip in... read finishes... change something... write starts... more work slips in... write finishes. Keep that shape in your head — it's the exact seam where concurrency bugs live. I'll prove it with a load test in a few minutes."

**Point 7 — the null-prototype line** · *select `db.links = Object.assign(Object.create(null), db.links);` plus its comment*

> "This line looks weird, so let me earn it. In JavaScript, every object inherits from a prototype — which means certain key names are *special*. If a slug were literally the word 'constructor', or `__proto__`, a normal object starts doing strange things, because those names collide with the language's built-ins. That failure mode has a name: prototype pollution."

> "So here I rebuild the links object with `Object.create(null)` — an object with *no* prototype at all, no inherited magic. Now a slug called 'constructor' is just a boring key like any other. One line of paranoia that makes user-chosen strings safe to use as dictionary keys. Small thing — but it's exactly the kind of thing production code does that prototype code skips."

**Point 8 — the graceful first run** · *select `if ((err as NodeJS.ErrnoException).code === "ENOENT") {`*

> "The catch block. If the read fails with `ENOENT` — that's 'no such file' — it means this is the very first run and the database doesn't exist yet. So instead of crashing, return an empty database: no links, no events. Graceful cold start. Anything *else* — corrupted file, permission problem — gets re-thrown, because I don't want to hide a real error behind a polite empty answer."

**Point 9 — writing the file, safely** · *select the whole `writeDb` body, then re-select just `await fs.rename(tmp, DB_PATH);`*

> "Writing has three moves. First, make sure the data folder exists. Second — the `tmp` line — I write to a *temporary* file whose name includes the process ID, a timestamp, and a random string, so two simultaneous writes can never land on the same temp name. Third, the trick: **rename** the temp file over the real one."

> "Rename sounds boring, but it's the whole safety story: on the same disk, a rename is **atomic** — the file goes from old version to new version in one indivisible instant. A reader sees the complete old file or the complete new file, never a half-written one. So storage is crash-safe... for *one* writer."

**⚑ FLAG (the last thing you say in this file):**

> "Which brings me to the pattern this file hands the rest of the app: **read the entire file, change it in memory, write the entire file back.** Read... modify... write. And there is *no locking anywhere in this file*. Nothing stops two of those cycles from overlapping. The file writes are safe — the *sequence* isn't. Flagging it; I'll come back with fifty concurrent visitors and a stopwatch."

**Jargon decoder (only if needed):**

| Term | Plain-language version |
| :--- | :--- |
| `await` | "Pause this function until the disk answers — meanwhile Node can serve other requests." |
| Promise | "An IOU for a value that isn't ready yet." |
| `Record<string, LinkRecord>` | "An object used as a dictionary: slug in, link out." |
| Prototype pollution | "Some key names ('constructor', `__proto__`) are magic on normal JS objects; a null-prototype object has no magic." |
| `ENOENT` | "Error NO ENTry — the file simply doesn't exist." |
| Atomic rename | "The file switches old→new in one instant; nobody can catch it half-written." |

---

## FILE 2 — `lib/slug.ts` (~0:45)

**One-breath summary:**

> "lib slash slug dot ts — the smallest file in the project, and the one with the biggest hidden cost. This generates the random part of every short link."

**Point 1 — read the line from the inside out** · *select `return Math.random().toString(36).slice(2, 5);`*

> "One line, and it reads best from the inside out. `Math.random` gives me a decimal between zero and one, like zero-point-seven-two-eight. `.toString(36)` converts it to base 36 — decoding that in a second. And `.slice(2, 5)` keeps three characters. Result: 'k3f'. Three characters is my entire random component."

**Point 2 — the base-36 math, out loud** · *drag-select the comment line `// Short random slug, e.g. "k3f"...`*

> "Base 36 means each character is one of thirty-six symbols: the digits zero to nine — that's ten — plus the letters a to z — twenty-six. Ten plus twenty-six is thirty-six. Now the math that matters later, and I'll do it slowly: **three characters, thirty-six options each — thirty-six times thirty-six times thirty-six.** That's **46,656 possible slugs. Total. Forever.** Everything this function will ever produce lives inside that bucket."

**⚑ FLAG:**

> "Forty-six thousand sounds like a lot — until the app gets popular. I'm flagging it, and later I'll show you how few links it actually takes before two random slugs crash into each other. It's way fewer than you'd guess."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| base 36 | "Count in 36 symbols instead of 10: 0–9 then a–z — like hexadecimal but with the whole alphabet." |
| `.slice(2, 5)` | "Skip the first two characters ('0.') and keep the next three." |
| `Math.random` | "Fine for dice games — not cryptographic, not unpredictable to a determined attacker." |
---

## FILE 3 — `lib/stats.ts` (~1:15)

**One-breath summary:**

> "lib slash stats dot ts — this file turns the raw click log into the numbers on the dashboard. Two functions: clicks per day, and top referrers."

**Point 1 — the two output shapes** · *select both small interfaces at the top (`DayBucket`, `ReferrerBucket`)*

> "Two tiny shapes the dashboard consumes. A `DayBucket` is one bar on the chart: a day string in year-month-day format, and a click count. A `ReferrerBucket` is one row of the referrers list: a hostname and a count. That's the contract — everything below exists to fill these."

**Point 2 — the tally sheet** · *select `const buckets = new Map<string, number>();`*

> "`clicksPerDay` starts with a `Map` — think of it as a tally sheet. Key: a day, like '2026-10-24'. Value: a running count. The whole function is just: walk every click event, work out which day it belongs to, and add one to that day's tally."

**Point 3 — THE line: whose calendar day?** · *select `const d = new Date(event.ts);`, then drag-select the whole multi-line `const day = ...` template string*

> "Now the line this whole file exists to talk about. First, `new Date(event.ts)` — the stored UTC timestamp becomes a Date object. Fine. Then this template string builds the day key from three getter calls: `getFullYear`, `getMonth`, `getDate`."

> "Here's the thing almost nobody notices the first time they read it: **these are the local-time getters.** JavaScript gives every Date two families of getters — and these three answer the question: *what year, month, and day is this moment, according to the clock of the machine running this code?*"

> "Two smaller things while we're here, because reviewers love these: `getMonth` returns zero-indexed months — January is zero — which is why there's a `+ 1`. And `padStart(2, '0')` turns '3' into '03' so the day string is always exactly year-month-date. Cosmetic, but it keeps the sort working."

**⚑ FLAG:**

> "So the data is stored in UTC — we saw the comment in store dot ts — but the *bucketing* silently converts to the server's local day. The question this function answers isn't 'which UTC day', it's 'which day *here*', where 'here' changes with every datacenter. Same data, different machine, different chart. Flagging it — and later I'll actually move the server to Los Angeles without touching the data, and watch the chart move."

**Point 4 — finishing the function** · *select `buckets.set(day, (buckets.get(day) ?? 0) + 1);` then the `return` block*

> "The tally update reads: get that day's current count — or zero, if the day isn't on the sheet yet, that's the double-question-mark 'nullish' operator — add one, write it back. Then the return: spread the map into an array, sort the days oldest-first, and reshape each entry into the `DayBucket` the chart expects."

**Point 5 — top referrers, quickly** · *select `let referrer = "direct";` then `referrer = new URL(event.referrer).hostname;` then `.slice(0, limit)`*

> "The second function is the same tally-sheet pattern, three small touches worth saying. No referrer header? The label is 'direct' — someone typed the URL or came from an app that strips it. If there *is* a referrer, I parse it with `new URL` and keep only the `.hostname` — so 'news.ycombinator.com/item?id=whatever' collapses to just 'news.ycombinator.com'. The try/catch around it means a malformed referrer string can't crash the stats endpoint — it just gets labeled 'unknown'. And the tail: sort biggest-first, `.slice(0, limit)` — top five, that's the default you see in the signature."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| `Map` | "A tally sheet: key → running count." |
| Local vs UTC getters | "`getDate` reads the machine's clock; `getUTCDate` reads UTC. This file uses the local one." |
| `?? 0` (nullish) | "Use the existing count, or zero if there isn't one yet." |
| `padStart(2, "0")` | "Make it two digits wide: '3' → '03'." |
| `.hostname` | "Just the domain part of a URL — no path, no query string." |

---

## FILE 4 — `app/[slug]/route.ts` (~1:30)

**One-breath summary:**

> "app slash, square-bracket slug, slash route dot ts — the most important route in the product. This is what runs every single time someone clicks a short link."

**Point 1 — what the brackets mean** · *select the file tab `app/[slug]/route.ts` in the tab bar, then select `{ params }: { params: Promise<{ slug: string }> }`*

> "First, the folder name. The square brackets in `[slug]` are Next.js's dynamic-route syntax — they mean 'match anything'. So slash-docs, slash-promo, slash-anything lands in *this* file, and the framework hands me whatever it matched. That's the `params` argument: in current Next.js it arrives as a promise, so I await it and pull out the slug. Someone visits slash-docs — this function gets the string 'docs'."

**Point 2 — the lookup and the 404** · *select `const link = db.links[slug];` and the `if (!link)` block under it*

> "Standard dictionary lookup from store dot ts — slug in, link out. And if the key isn't there: a plain 404, 'Link not found'. Honest failure, nothing clever."

**Point 3 — counting the click** · *select from `link.clicks += 1;` down to `await writeDb(db);`*

> "This is the analytics moment, three moves. `link.clicks += 1` — bump the counter in memory. Then push a row into the events logbook: which slug, `new Date().toISOString()` — the current moment as a UTC string — and the referrer header off the request. And notice `req.headers.get('referer')` — spelled R-E-F-E-R-E-R, missing an R. That's not a typo in my code; the HTTP spec itself has misspelled 'referrer' since 1996 and the header name stuck. Trivia, but it tells the viewer you know this layer."

> "Then `writeDb` — the full read-modify-write cycle we flagged in store dot ts. This code runs on *every visit*. Remember the fifty-concurrent-visitors test? This is the code it will aim at."

**Point 4 — the response, and the promise in it** · *drag-select the entire `return new Response(null, { ... })` block*

> "And here's the redirect itself. Response body is null — a redirect has no page. Two headers do all the work. `Location`: where the browser should go next — that one's obvious. The one I want to sit on is the other pair. Status **301** — 'Moved Permanently' — plus `Cache-Control: public, max-age=31536000`."

> "Do the math on the max-age out loud — it lands better that way: sixty seconds, times sixty minutes, times twenty-four hours, times three hundred sixty-five days. **Thirty-one million, five hundred thirty-six thousand seconds. One year.** This response is telling every browser and every CDN that passes by: 'docs points at nextjs.org, and you may remember that for a year. Don't ask me again.'"

**⚑ FLAG:**

> "Now... my dashboard has an **Edit** button. The entire premise of this product is that a short link's destination can change *tomorrow*. And this response says 'remember where it points for a year.' Those two things contradict each other — and the failure won't show up on my machine today; it'll show up for *other people's browsers*, weeks later, in a way I can't debug or undo. Flagging it. This is the last gap we'll close, and it's the sneakiest."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| Dynamic route `[slug]` | "One file handles every top-level path; the matched text arrives in `params`." |
| `301 Moved Permanently` | "'This address has moved for good' — clients are *allowed* to cache it forever." |
| `Location` header | "The address the client should go to instead." |
| `max-age=31536000` | "Cache this for 31,536,000 seconds — exactly one year." |
| `referer` | "The page the visitor came from. The header name has been misspelled since the original HTTP spec." |
---

## FILE 5 — `app/api/links/route.ts` (~1:00)

**One-breath summary:**

> "app slash api slash links — the create-and-list API. GET returns every link for the dashboard table; POST creates a new one. POST is where two of my flags come from."

**Point 1 — force-dynamic** · *select `export const dynamic = "force-dynamic";`*

> "One line of Next.js housekeeping before the handlers: `force-dynamic` tells the framework 'never cache or pre-render this route — run it fresh on every request.' I want live data on every call; without this, Next is allowed to be clever with caching, and clever caching is *not* what I want on an endpoint that writes."

**Point 2 — GET, newest first** · *select the `GET` body*

> "GET is the simple one. Read the database, `Object.values` turns my slug-dictionary into a plain array, sort by `createdAt` — and the comparator is `b.localeCompare(a)`, b before a, so the *newest* link is first. Wrap it in JSON. That's the data the table on the dashboard renders."

**Point 3 — the body gate** · *select the `if (!body || typeof body.url !== "string" || body.url.trim() === "")` block*

> "POST starts sensibly. Parse the JSON body — with a `.catch` that swallows garbage bodies into `null` instead of crashing. Then the gate: is there a body, is `url` a string, and is it non-empty after trimming spaces?"

> "Now watch what this gate does *not* ask. It never asks: **what is inside the string?** *(double-click the word `string` in `typeof body.url !== "string"`)* 'javascript colon alert-one' — passes. 'hello world' — passes. As long as it's a non-empty string, the MVP stores it. The destination is never *inspected*, only *measured for length*."

**Point 4 — the slug decision** · *select the `const slug = typeof body.slug === "string" ... ? body.slug.trim() : generateSlug();` block*

> "Then the slug: if the client sent a custom one, use it as-is — trimmed; otherwise call the generator we just looked at. Two paths in, and note where both paths *converge*..."

**Point 5 — the converging line** · *select `db.links[slug] = link;`*

> "...right here. `db.links[slug] = link` — an unconditional assignment into the dictionary. In JavaScript, assigning to a key that already exists **silently replaces** whatever was there. No error, no warning, no event in the log — the old link and its click history just evaporate. And *both* paths feed this line: a custom slug the user picked, and a random one from the generator. Either one can hit an existing key."

**⚑ FLAG (this file gets two):**

> "So, two flags from one handler. **Flag one:** the destination is never validated — anything non-empty gets stored, which is a stored-XSS invitation and a broken-link factory. **Flag two:** creation can silently overwrite an existing link. I'll close the first with an explicit validator at the API boundary, and the second with a proper 409 Conflict inside the write lock. Both in that order, after the tour."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| `force-dynamic` | "Opt this route out of Next's caching/pre-rendering; always execute fresh." |
| `req.json().catch(() => null)` | "Parse the body; if it's not valid JSON, get `null` instead of an exception." |
| `typeof x !== "string"` | "Type check only — says nothing about what the string *contains*." |
| `.trim()` | "Strip whitespace from both ends — ' ' still counts as empty after this." |
| `NextResponse.json({...}, { status: 201 })` | "JSON reply with an explicit status code — 201 means 'created'." |

---

## FILE 6 — `app/api/links/[slug]/route.ts` (~0:45)

**One-breath summary:**

> "Same folder pattern as the redirect — square brackets, dynamic slug — but this file is the **edit and delete** API. Two handlers, PATCH and DELETE."

**Point 1 — PATCH: the same hole, one level deeper** · *select `link.url = body.url.trim();`*

> "PATCH changes where a link points. Parse the body, find the link, then this line — `link.url = body.url.trim()`. And there it is again: the destination is *assigned*, never *inspected*. Same gap as POST, but sneakier: **even if creating were strict, I could create a perfectly good link today and edit it into a `javascript:` link tomorrow.** A gate on one door means nothing if the other door is open. Flag."

**Point 2 — DELETE and the nice detail in the comment** · *select `delete db.links[slug];` and the comment line above the handler (`// DELETE /api/links/:slug -> remove a link (its click history stays).`)*

> "DELETE removes the key — `delete` is a real JavaScript operator that removes a key from an object — and writes the file back, returning 204, which means 'success, and deliberately no body'. But look at the comment I wrote when I built this: *its click history stays*. The link is gone from the dictionary, but its rows in the events logbook survive. That's deliberate — analytics shouldn't lose history because someone deleted a link. Small design decision, but it's the kind of thing worth saying out loud on a tour."

**⚑ FLAG:**

> "One flag from this file: PATCH shares POST's missing URL inspection. Same fix will cover both — one validator, two call sites."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| PATCH vs PUT | "PATCH changes part of a resource; here, just the destination." |
| `delete obj[key]` | "Removes the key from the object entirely." |
| `204 No Content` | "Success with no body — 'done, nothing to say back'." |

---

## FILE 7 — `app/api/stats/route.ts` (~0:30)

**One-breath summary:**

> "app slash api slash stats — the analytics endpoint. One GET handler, five numbers, assembled from lib."

**Point 1 — the five fields** · *select the whole `return NextResponse.json({...})` object*

> "Everything here is delegation. `totalLinks` — count the keys. `totalClicks` — a `reduce` over the links: walk the list, keep a running sum of each link's clicks. `perDay` and `topReferrers` come straight from lib slash stats — the functions we just read. And then there's this last one:"

**Point 2 — the timezone tile, on purpose** · *select `serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,`*

> "`serverTimezone` — I ask the machine what timezone it's running in and ship it in the response, so the dashboard shows it as a tile. I added this **on purpose** when I built the MVP, because the timezone gap is invisible in the numbers alone — you need to see *which machine* produced the chart. It's going to earn its keep in about fifteen minutes."

**⚑ FLAG:**

> "Nothing new to flag here — this file just surfaces the aggregation we already flagged in lib slash stats."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| `reduce((sum, l) => sum + l.clicks, 0)` | "Walk the list keeping a running total, starting at zero." |
| `Intl.DateTimeFormat().resolvedOptions().timeZone` | "The standard way to ask a Node process 'what timezone am I in?'" |

---

## FILE 8 — the UI, `components/` (~0:45)

**One-breath summary (open the folder, then Dashboard.tsx only):**

> "The UI is four components, and I'll keep this quick — because I don't expect the production risks to live here. Let me show you why."

**Point 1 — Dashboard is the data owner** · *select the `refresh` callback inside Dashboard.tsx (`const refresh = useCallback(async () => { ... }, []);`)*

> "Dashboard dot tsx is the parent and the only one that talks to the API. This `refresh` function fetches both endpoints — links and stats — in parallel with `Promise.all`, and hands the results down as props. `useEffect` calls it once on mount. So the data flow is one-directional: fetch from API → props down. Clean and boring, which is what UI data flow should be."

**Point 2 — the form will inherit our fixes for free** · *open CreateForm.tsx, select the `if (!res.ok)` block*

> "CreateForm does the POST, and this is the part worth pointing at: when the API says no, the form just prints `json.error` in red. Which means when I add proper validation errors in a few minutes — 'url must start with http...' — **the UI picks them up automatically.** I don't need to touch this file today. That's what putting validation at the API boundary buys you: every client gets the protection, not just this form."

**Point 3 — one-liners for the other two** · *click LinkTable.tsx, then StatsPanel.tsx tabs (don't dwell)*

> "LinkTable renders the rows and does edit-in-place — local state, PATCH on save, DELETE on delete. StatsPanel takes the stats payload and draws it: three tiles, the bar chart with a max for scaling, the referrers list. Plain React, no state library, no router tricks."

**The bridge (last lines of the tour — say it looking at the dashboard in Chrome if you like):**

> "So that's the whole system: **browser → routes → lib → one JSON file.** The UI is clean, the storage is careful — and the risks are exactly where I planted flags: **no input validation, no concurrency control, collidable slugs, local-time analytics, and a redirect that browsers are invited to cache for a year.** Five flags, five fixes, in that order. Let's harden it."

**Jargon decoder:**

| Term | Plain-language version |
| :--- | :--- |
| `"use client"` | "This component runs in the browser, not on the server." |
| `useCallback` / `useEffect` | "Remember this function between renders / run this once when the component appears." |
| `Promise.all` | "Fire both fetches at once and wait for both." |
| Props down | "Parents fetch and pass data in; children just render it." |

---

## Quick-reference: the five flags and where you plant them

| You are in... | You select... | You say (compressed) |
| :--- | :--- | :--- |
| `lib/store.ts` | the read-modify-write pattern | "Read, modify, write — no locking anywhere. Two cycles can overlap. Load test incoming." |
| `lib/slug.ts` | the comment + the math | "36 × 36 × 36 — 46,656 slugs, total. Forever." |
| `lib/stats.ts` | `getFullYear / getMonth / getDate` | "Local-time getters — 'which day *here*'. Same data, different machine, different chart." |
| `app/[slug]/route.ts` | `301` + `max-age=31536000` | "Cache it for a year — but the product ships an Edit button. Contradiction." |
| `app/api/links/route.ts` | `db.links[slug] = link;` and the url gate | "Never inspected, only measured for length — and assignment silently replaces." |

If you remember nothing else while recording: **select first, then speak.** The highlight does half the explaining for you.

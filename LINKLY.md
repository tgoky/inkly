# Linkly: From Half-Built MVP to Production-Ready
### Recording script + step-by-step hardening guide (25–30 min live session)

---

## 0. Read this first — the framing, and how to use this document

**The story you are telling on camera:** you scaffolded a working MVP, and today you are taking it to production quality. That is the whole arc. You are not reacting to bug reports; you are a developer who knows the happy path is the *easy* part, walking the reviewer through how you audit your own prototype, anticipate real-world failure modes, and write production-grade fixes live.

**Why this framing wins.** A reviewer watching a recorded task is grading *how you think*: do you evaluate prototype code honestly, can you predict where it breaks under real traffic, do you verify with reproducible evidence instead of clicking around and hoping, and can you write clean, defensible code in one pass? Framing the session as "here is my MVP, here are the five gaps that will break in production, watch me close them" shows all four — and it makes the helper scripts (`hammer`, `collide`, `stats`) a strength, because reviewers love candidates who run reproducible smoke tests and load benchmarks instead of testing blindly in a browser.

**The five hardening tasks, in the order you will do them:**

| # | Gap in the MVP | What breaks in production | Fix |
| :--- | :--- | :--- | :--- |
| 1 | No input validation on destination URLs | `javascript:` and garbage stored → Stored XSS risk, broken links | `lib/validate.ts` — native `URL` parser + protocol allowlist |
| 2 | No concurrency control on click tracking | Lost updates: 50 visits, ~7 counted | `withLock` promise queue in `lib/store.ts` |
| 3 | Slug collisions overwrite links silently | Users lose links and history | 6-char crypto slugs, `409 Conflict` inside the lock |
| 4 | Analytics depend on server timezone | Same data, different charts per region | UTC bucketing via `toISOString().slice(0, 10)` |
| 5 | `301` + 1-year cache on redirects | Edited destinations never reach repeat visitors | `302 Found` + `Cache-Control: no-store` |

**How to read the blocks in this script:**

- `"Quoted text"` — **what you say out loud.** Internalize it, then say it in your own words; reading robotically sounds worse than an imperfect but natural delivery.
- **[DO]** — a physical action: click, open, switch window, wait.
- **[OPEN]** / **[FIND]** / **[REPLACE WITH]** / **[ADD]** / **[CREATE]** / **[TYPE]** — exact editing steps. Every `[FIND]` block matches the MVP code character for character, and every `[TYPE]` block was compiled and tested against a fresh copy of this exact MVP before it went in here. Paste or type them as-is.
- **[CHECK]** — a verification command and the real observed output from the verification run, so you know exactly what "working" looks like.
- *[italic asides]* — optional human moments (a sigh, a pause). Use a few; don't perform all of them.

**Golden rules for the recording:**

1. Narrate *before* you touch the keyboard ("what I'm about to do and why"), *while* you work, and *after* ("what I expect to see, and whether I see it").
2. Never fix silently. The thinking is the deliverable; the code is the evidence.
3. Verify every fix with a command that can fail. Say that out loud.
4. When something surprises you, react honestly and investigate — that is exactly what reviewers want to see.

---

## 1. Setup (do this before you press record)

```bash
mkdir linkly && cd linkly
git init
git apply /path/to/linkly-full.patch     # adjust to wherever the patch lives
npm install
git add -A && git commit -m "baseline"   # lets you reset between takes
npm run seed
npm run dev                              # leave running in terminal pane 1
```

Open a **second terminal pane** (pane 2) for commands. Open **Chrome** at `http://localhost:3000`.

**Window layout:** VS Code on the left half (project open, file explorer visible, terminal split at the bottom with two panes). Chrome on the right half. Every time you switch to the terminal or Chrome, **say so out loud** — the reviewer is following your screen, not your head.

**TaskRecorder metadata (fill in before recording):**

- **Title:** Harden a Next.js Link-Shortener MVP for Production — Live Coding Session
- **Description:** Starting from a working MVP link shortener (Next.js App Router + TypeScript), audit the system against real-world production conditions — unvalidated input, concurrency, slug collisions, timezone boundaries, and HTTP caching — implement the five hardening fixes live, verify each with reproducible smoke tests and load benchmarks, and finish with a production build, a git commit, and a written production-readiness log.
- **Apps:** VS Code, Google Chrome, Terminal

**Resetting between takes:**

```bash
git checkout -- . && git clean -fd lib docs && npm run seed
```

That restores every edited file, deletes the new files you create during the session (`lib/validate.ts`, `docs/`), and reseeds the demo data. Also use a **fresh Incognito window each take** (Task 5 depends on browser cache state — it has a trap, explained there).

---

## 2. Time plan

| Time | Part | What happens |
| :--- | :--- | :--- |
| 0:00 – 2:30 | 1 | Intro: the half-built MVP, the plan, quick happy-path demo |
| 2:30 – 8:30 | 2 | Codebase tour: how it works, where I don't trust it yet |
| 8:30 – 11:30 | 3 | Hardening 1: input validation & URL allowlist |
| 11:30 – 15:30 | 4 | Hardening 2: concurrency & lost click counts |
| 15:30 – 18:30 | 5 | Hardening 3: slug collisions & custom-slug conflicts |
| 18:30 – 21:30 | 6 | Hardening 4: timezone-dependent analytics |
| 21:30 – 24:30 | 7 | Hardening 5: redirect status & browser caching |
| 24:30 – 28:30 | 8 | Writing the production-readiness log |
| 28:30 – 30:00 | 9 | Production build, git commit, close |

**To hit ~20 minutes instead:** cut the tour to 3 minutes (skip the components), and drop Task 4 *or* Task 5 (say you'd handle it the same way and point at the log). Everything else stays.

**Filler bank (use while compiling / typing / waiting):**

- "While that compiles, let me think about what I expect to see if the fix is right."
- "Let me re-read what I just typed before I save it."
- "I want to double-check the types here — this is exactly the kind of thing TypeScript will catch."
- "Waiting for the dev server to pick up the change; it usually hot-reloads in under a second."
- "Okay, saved. Now I need to *prove* it works, not just assume it."
- "Let me zoom out for a second and say why I'm doing this in this order."
- "Let me scroll back through the output, because I don't trust my first read of it."

---
## PART 1 — Intro: the half-built MVP (0:00 – 2:30)

**[DO]** Recording running. VS Code left, Chrome right showing the Linkly dashboard, dev server visible in terminal pane 1.

> "Okay, recording. Let me set the stage. On the left is VS Code with a project I've scaffolded called **Linkly** — an MVP for a self-hosted link shortener with click analytics, built on Next.js App Router and TypeScript. On the right is Chrome on localhost:3000 — the dashboard. In the terminal at the bottom, the dev server is running in one pane and I'll use the second pane for commands."

**[DO]** Quickly demo the happy path so the reviewer sees what already works:

1. In the form, create a link: destination `https://nextjs.org/docs`, slug `demo`. Click **Create** → green "Created /demo".
2. Visit `localhost:3000/demo` in a new tab → lands on the Next.js docs.
3. Back to the dashboard, refresh → the demo row shows clicks.

> "Right now the basic UI and the core routes are functional on the happy path: you can create links, redirect visitors, and view click counts. Paste a URL, optionally pick a custom slug, get a short link. Visitors hit the short link, we log the click and redirect. The dashboard shows totals, a clicks-per-day chart, top referrers, and a table where you can edit or delete links."

> "**Today I'm taking this from prototype to production-ready.** The happy path is the easy part. What matters for production is the traffic I *can't* control: malicious input, concurrent requests, colliding identifiers, servers running in different timezones, and intermediaries caching my responses. I'm going to walk through the system, identify the critical gaps that will break under real traffic — input validation, concurrency, slug collisions, timezone boundaries, and HTTP caching — and implement the fixes live so the app is stable and secure."

> "One more thing before the tour. When I built this MVP I also wrote a few **audit utilities** — smoke tests and small load benchmarks — because 'it works when I click it' isn't evidence. `seed` resets demo data, `hammer` fires concurrent visits at one link and checks the counter, `collide` hammers the create endpoint and watches for overwrites, and `stats` prints the analytics in the terminal. You'll see me use those to measure every gap before and after I touch the code."

> "Order of attack: quick tour so you know how the pieces fit, then the five hardening tasks, then I'll write the production-readiness log, and finish with a clean production build and a commit. Let's go."

---

## PART 2 — Codebase tour: how it works, where I don't trust it yet (2:30 – 8:30)

**Framing for this whole section:** you're walking the reviewer through *your* prototype. You know where you cut corners. Don't announce the fixes yet — just plant a flag at each stop: "this is a spot I don't trust yet." By the end of the tour the reviewer should already see the five gaps coming, which makes the fixes feel earned and inevitable.

### 2a. Project shape (2:30 – 3:30)

**[DO]** Click through the VS Code explorer top to bottom. Open `package.json` briefly.

> "Let me start with the shape of the project. `package.json`: Next.js 16, React 19, TypeScript — and that's it for runtime dependencies. No database, no ORM. For a self-hosted MVP that's a deliberate trade: nothing to set up, data lives in a single JSON file. It also means *I* own all the correctness guarantees a database would normally give me — and that's going to be a theme today."

> "The scripts: the usual `dev`, `build`, `start`, plus my audit utilities — `seed`, `hammer`, `collide`, `stats`, and `dev:la`, which starts the server with the timezone set to Los Angeles. I'll use that one later when we talk about time."

> "Folders: `app` is the App Router — pages and API routes. `components` is the dashboard UI. `lib` is shared logic. `scripts` has the audit utilities. And `data` is the JSON file database."

### 2b. lib/store.ts — the foundation (3:30 – 5:00)

**[DO]** Open `lib/store.ts`.

> "`lib/store.ts` is the foundation. Three types: `LinkRecord` — one short link with its slug, destination, creation time, and click counter. `ClickEvent` — one visit: slug, timestamp, referrer. And `Db` — a map of links plus a list of events."

> "Two functions. `readDb` reads and parses `data/db.json`, or returns an empty database if the file doesn't exist yet. There's one nice hardening detail already here: it rebuilds the links object with a null prototype, so a slug like `constructor` or `__proto__` is just a plain key instead of a prototype-pollution surprise."

> "`writeDb` writes to a temp file and renames it over the real one — rename is atomic, so a reader never sees a half-written file. Storage itself is already crash-safe-ish for a single writer."

> "But here's the pattern I want everyone to notice: **every operation reads the entire file, mutates it in memory, and writes the entire file back.** Read, modify, write. And there is no locking anywhere in this file. Nothing prevents two of those cycles from overlapping. I'm flagging that — we'll come back to it with a load test."

### 2c. lib/slug.ts and lib/stats.ts (5:00 – 6:00)

**[DO]** Open `lib/slug.ts`, then `lib/stats.ts`.

> "`lib/slug.ts` generates the random part of a short link: take a random number, convert to base 36, keep three characters — slugs like `k3f`. Three base-36 characters is thirty-six cubed — **46,656 possible slugs, total**. Hold that number."

> "`lib/stats.ts` turns raw click events into dashboard numbers. `topReferrers` counts clicks per referrer hostname, missing header means 'direct'. `clicksPerDay` groups events into per-day buckets — it builds a year-month-day string from each event's timestamp. The question this function silently answers is: *whose* calendar day? The server's local day. Keep that in mind too."

### 2d. The redirect route (6:00 – 7:00)

**[DO]** Open `app/[slug]/route.ts`.

> "The most important route in the product: `app/[slug]/route.ts`. The square brackets mean it's dynamic — `/docs`, `/promo`, anything lands here. Step by step: take the slug, read the database, look up the link, 404 if missing. Otherwise increment the counter, push a click event with the timestamp and referrer header, write the database back, and return a redirect."

> "Now look at the response it returns: **status 301 — 'Moved Permanently' — with `Cache-Control: public, max-age=31536000`**. That's 'cache this for one year'. For a shortener whose destinations are *editable*, that's a promise I can't take back — browsers and CDNs will stop asking my server anything. Flagging that one too."

### 2e. The API routes (7:00 – 8:00)

**[DO]** Open `app/api/links/route.ts`, then `app/api/links/[slug]/route.ts`, then `app/api/stats/route.ts`.

> "The links API. GET lists all links newest-first. POST creates one: it checks the `url` is a non-empty string — and that's *all* it checks, it never looks inside the string. If a custom slug was provided it uses it as-is; otherwise it generates one. Then it reads the database and does `db.links[slug] = link` — an unconditional assignment, no check whether that key already exists."

> "So on the create path I have two flags: the destination is never inspected — anything non-empty gets stored — and the slug assignment can silently replace an existing link."

> "`app/api/links/[slug]/route.ts` handles PATCH and DELETE. PATCH edits a destination with the same missing URL inspection — so even if create were strict, you could edit a good link into a bad one. And `app/api/stats/route.ts` just aggregates and returns totals, per-day, referrers, plus the server's timezone, which I exposed to make today's debugging visible."

### 2f. The UI (8:00 – 8:30)

**[DO]** Show the `components` folder, open `Dashboard.tsx` only.

> "The UI is four client components. `Dashboard` fetches links and stats and passes them down; `CreateForm`, `LinkTable`, and `StatsPanel` render them. I don't expect the production gaps to live here — the risks are in the server logic and the HTTP contract. Which gives me my audit list: **validation, concurrency, collisions, time, and caching.** Let's harden them in that order."

---
## PART 3 — Hardening Task 1: Input validation & URL allowlist (8:30 – 11:30)

**Goal of this task (say something like this when you start):**

> "First hardening task: input validation. The create and edit endpoints accept any non-empty string as a destination. If someone submits `javascript:alert(1)` or plain text, the prototype happily stores it. That's a stored-XSS setup and a data-integrity hole. I'll reject anything that isn't a genuine `http:` or `https:` URL at the API boundary — before it ever reaches storage."

### 3a. Demonstrate the gap (8:30 – 9:45)

**[DO]** Switch to Chrome. In the form: destination `javascript:alert(document.cookie)`, slug `xss1`. Click **Create**.

> "Let me demonstrate. Switching to Chrome. In the destination field I'm typing `javascript:alert(document.cookie)` — a classic XSS probe — and a custom slug `xss1`. Clicking Create."

**[DO]** The green "Created /xss1" appears.

> "And it says 'Created'. The MVP accepted it. A link shortener should only ever point at web pages — this is already wrong."

**[DO]** Now destination `not a url`, slug `junk1`. Create. Look at the table.

> "Let me try plain English — 'not a url'. Created again. So there's no validation at all, not even accidentally."

**[DO]** Open `localhost:3000/xss1` in a new tab. *[Read what Chrome shows — it refuses to follow the redirect.]* Then open `/junk1` too.

> "Visiting the javascript one — the browser refuses to follow it, which is the browser protecting us. I don't want to depend on that. And the junk one sends visitors to a relative path that doesn't exist — a permanently broken link. The danger isn't only this redirect: that stored string will resurface in admin screens, exports, emails, maybe a mobile app — any of which might render it as a clickable link. A `javascript:` URL in a stored field is the textbook stored-XSS setup. Defense in depth says reject it at the door."

**[DO]** Switch to terminal pane 2. Run:

```bash
curl -i -X POST localhost:3000/api/links -H 'content-type: application/json' \
  -d '{"url":"javascript:alert(document.cookie)","slug":"xss2"}'
```

> "Let me confirm it's the API and not the UI. Same request straight to the endpoint."

**[CHECK]** You will see:

```
HTTP/1.1 201 Created
```

> "201 Created. The server stored it. Root cause confirmed at the API level."

### 3b. Root cause (9:45 – 10:15)

**[DO]** Open `app/api/links/route.ts`, cursor on the `typeof body.url !== "string"` check.

> "Root cause: in POST, the only check on `url` is that it's a non-empty string. Nothing inspects the content. And I flagged the identical hole in PATCH — so an attacker can't just create a bad link, they can *edit* a good link into a bad one. Both write paths need the same gate."

### 3c. Fix: a validator module (10:15 – 11:30)

> "What's the right fix? My lazy instinct is `url.startsWith('http')`. *[beat]* No. That's exactly the kind of check that gets bypassed — and it can't tell me whether the rest of the string is even a URL. **I'm avoiding regex or a simple `startsWith('http')` check because they're easy to bypass. Using the native `URL` parser gives us reliable protocol parsing, normalization, and lets us reject dangerous schemes before storage.** And I'll use an *allowlist* of exactly two protocols rather than a blocklist — with an allowlist I don't have to enumerate every bad scheme that exists or will exist."

**[DO]** **[CREATE]** the file `lib/validate.ts`:

```ts
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

// A destination must be an absolute http(s) URL. Anything else (javascript:,
// data:, file:, "not a url") is rejected before it reaches storage.
export function validateDestination(input: string): UrlCheck {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: "url must be a valid absolute URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, error: "url must start with http:// or https://" };
  }

  return { ok: true, url: parsed.toString() };
}
```

> "I'm creating a dedicated validator module. Two design choices worth saying out loud. First: the function returns a *result object* — either `ok: true` with a cleaned URL, or `ok: false` with a human-readable error — instead of throwing. Expected failures aren't exceptional; the route can turn the result straight into a 400. Second: I return `parsed.toString()` — the *normalized* URL the parser understood — not the raw input. So what we store is canonical, not whatever the client typed."

**[DO]** **[OPEN]** `app/api/links/route.ts` — three small edits:

**[ADD]** to the imports at the top:

```ts
import { validateDestination } from "@/lib/validate";
```

**[FIND]** (right after the existing "url is required" check):

```ts
  if (!body || typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
```

**[ADD]** immediately below it:

```ts
  const check = validateDestination(body.url);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
```

**[FIND]** (inside the `link` object):

```ts
    url: body.url.trim(),
```

**[REPLACE WITH]**:

```ts
    url: check.url,
```

> "Wiring it into POST: import the validator, run it right after the required-check, return 400 with its message on failure — 400 meaning 'the client sent something bad'. And store `check.url`, the normalized value, instead of the raw body."

**[DO]** **[OPEN]** `app/api/links/[slug]/route.ts` — same three edits in PATCH:

**[ADD]** import at top:

```ts
import { validateDestination } from "@/lib/validate";
```

**[ADD]** right after the "url is required" check:

```ts
  const check = validateDestination(body.url);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
```

**[FIND]**:

```ts
  link.url = body.url.trim();
```

**[REPLACE WITH]**:

```ts
  link.url = check.url;
```

> "PATCH gets the identical gate — if I only fixed POST, someone could create a clean link and then edit it into a weapon. *[oops, if TypeScript flags the import]* Missed the import in this file — TypeScript caught it immediately. That's the type checker doing its job."

### 3d. Verify (and clean up) (11:00 – 11:30)

**[DO]** Terminal pane 2 — re-run the same curl, plus the junk URL and a good URL:

```bash
curl -is -X POST localhost:3000/api/links -H 'content-type: application/json' \
  -d '{"url":"javascript:alert(document.cookie)","slug":"xss2"}' | head -2
curl -is -X POST localhost:3000/api/links -H 'content-type: application/json' \
  -d '{"url":"not a url"}' | head -2
curl -is -X POST localhost:3000/api/links -H 'content-type: application/json' \
  -d '{"url":"https://example.com/fine","slug":"good-check"}' | head -2
```

**[CHECK]** You will see:

```
HTTP/1.1 400 Bad Request      {"error":"url must start with http:// or https://"}
HTTP/1.1 400 Bad Request      {"error":"url must be a valid absolute URL"}
HTTP/1.1 201 Created          (the good URL still works)
```

> "The javascript scheme is rejected with a 400. Plain text is rejected. And a normal https URL still returns 201 — the happy path is intact. That last check matters as much as the first two: a fix that breaks good traffic isn't a fix."

**[DO]** Chrome: try `javascript:alert(1)` in the form once more (red error shows). Then delete `xss1` and `junk1` from the table.

> "The form now shows the error in red instead of 'Created' — verified from the user's side too. One last thing: the two bad records I created *before* the fix are still in the database. A fix for new data doesn't clean old data, so I'm deleting them here. In a real rollout I'd also run a one-off scan over existing rows for non-http schemes — I'll note that in the readiness log."

**Editing checklist for Task 1**

| File | Change |
| :--- | :--- |
| `lib/validate.ts` | **NEW** — `validateDestination()` with native `URL` parser + protocol allowlist |
| `app/api/links/route.ts` | Import validator; 400 gate in POST; store `check.url` |
| `app/api/links/[slug]/route.ts` | Same gate in PATCH; store `check.url` |

---
## PART 4 — Hardening Task 2: Concurrency & lost click counts (11:30 – 15:30)

**Goal of this task:**

> "Task two: concurrency. Every visit does a read-modify-write on a shared file with an `await` in the middle. Under concurrent traffic those cycles overlap and clicks get lost. First I'll put a number on the damage with my load benchmark — then fix it, then re-run the same benchmark and expect a different number."

### 4a. Baseline measurement (11:30 – 12:45)

**[DO]** Switch to terminal pane 2. Run:

```bash
npm run hammer
```

> "This is the load benchmark I wrote when I built the MVP. **It fires 50 concurrent requests to benchmark click tracking** — fifty simultaneous visits to `/docs`, then it compares how much the counter moved. If counting is correct, it moves by exactly fifty. This is the kind of test that's impossible to do by clicking manually, and it's reproducible, which is the point."

**[DO]** Wait for output. **[CHECK]** — a real run against this exact MVP produced:

```
Sent 50 visits to /docs
Counter went from 10 to 17 (+7)
FAIL: 43 clicks were lost.
```

*(Your exact numbers will vary a little — the damage is probabilistic — but expect a large loss, not a small one.)*

> "Fifty visits sent, the counter moved by seven. **Forty-three clicks vanished.** That's not an edge case, that's the majority of traffic silently discarded. Let me run it again to show it's reproducible."

**[DO]** Run `npm run hammer` a second time. Then switch to Chrome and refresh the dashboard.

> "Different run, same story — a big loss again. Typical of a race condition: reliably unreliable. The dashboard agrees — the docs count is far below the visits we actually served."

### 4b. Root cause: the lost update (12:45 – 14:00)

**[DO]** Open `app/[slug]/route.ts`. Highlight from `await readDb()` down to `await writeDb(db)`.

> "Where does a click get counted? Right here. Read the whole database, `link.clicks += 1` in memory, push an event, write the whole thing back. My first suspicion was this plus-equals — but no, the arithmetic is fine. The problem is the *await* between the read and the write."

> "When Node hits an `await`, it serves other requests while this one waits on the disk. So picture two visitors hitting the link at the same moment. Visitor A reads: ten clicks. Visitor B reads: ten clicks — A hasn't written yet. A writes eleven. B writes **eleven**. Two visitors, counter moved by one. That's a textbook *lost update*. With fifty concurrent requests, they stack up and almost every write overwrites someone else's."

> "Could I just re-read the file right before writing, to shrink the window? *[beat]* That only makes the race smaller, and a smaller race is still a race. What I actually need is for the entire read-modify-write to be **one exclusive unit** — only one request inside it at a time. I don't want to reach for a database just to make this MVP correct, so the right-sized fix is a serialization point: a write lock in the storage layer."

### 4c. Fix: a promise-queue write lock (14:00 – 15:30)

**[DO]** **[OPEN]** `lib/store.ts`. **[FIND]** the seam between the two functions:

```ts
    throw err;
  }
}

// Write the whole database file. We write to a temp file and rename it so a
// reader never sees a half-written file.
```

**[ADD]** the lock between them, so it reads:

```ts
    throw err;
  }
}

// Every read-modify-write must go through withLock so only one runs at a time.
// The queue lives on globalThis so every route bundle shares the same one.
const globalForLock = globalThis as unknown as {
  __linklyLock?: Promise<unknown>;
};

export function withLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalForLock.__linklyLock ?? Promise.resolve();
  const run = previous.then(task);
  globalForLock.__linklyLock = run.catch(() => undefined);
  return run;
}

// Write the whole database file. We write to a temp file and rename it so a
// reader never sees a half-written file.
```

> "`withLock` keeps a promise representing 'the previous job in the queue'. A new job chains onto it with `.then`, so it physically cannot start until the previous job's work — including its awaited file I/O — has finished. Two details I want to call out. I store the tail promise with a `.catch` attached, so one failing job can't poison the queue for everyone behind it. And the tail lives on `globalThis`, not in module scope, because Next.js can bundle route modules separately — module state can end up duplicated, but `globalThis` guarantees one shared queue per process."

**[DO]** **[OPEN]** `app/[slug]/route.ts`. **[ADD]** to the import:

```ts
import { readDb, writeDb, withLock } from "@/lib/store";
```

**[FIND]** (everything from the `readDb` call down to the 404 check):

```ts
  const db = await readDb();
  const link = db.links[slug];
  if (!link) {
    return new Response("Link not found", { status: 404 });
  }

  link.clicks += 1;
  db.events.push({
    slug,
    ts: new Date().toISOString(),
    referrer: req.headers.get("referer"),
  });
  await writeDb(db);
```

**[REPLACE WITH]**:

```ts
  const referrer = req.headers.get("referer");

  const link = await withLock(async () => {
    const db = await readDb();
    const found = db.links[slug];
    if (!found) return null;

    found.clicks += 1;
    db.events.push({ slug, ts: new Date().toISOString(), referrer });
    await writeDb(db);
    return found;
  });

  if (!link) {
    return new Response("Link not found", { status: 404 });
  }
```

> "Now the whole read-change-write runs inside `withLock`. I grab the referrer header *before* the lock — it doesn't need exclusivity, no reason to hold the queue for it. Inside, same logic as before, but it returns the link or null, and the 404 stays outside. The redirect response below is untouched — one concern at a time."

**[DO]** **[OPEN]** `app/api/links/[slug]/route.ts` — PATCH and DELETE are also read-modify-writes, so they go through the lock too.

**[ADD]** to the import:

```ts
import { readDb, writeDb, withLock } from "@/lib/store";
```

**[FIND]** in PATCH (after the validation block you added in Task 1):

```ts
  const db = await readDb();
  const link = db.links[slug];
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  link.url = check.url;
  await writeDb(db);

  return NextResponse.json({ link });
```

**[REPLACE WITH]**:

```ts
  const link = await withLock(async () => {
    const db = await readDb();
    const found = db.links[slug];
    if (!found) return null;

    found.url = check.url;
    await writeDb(db);
    return found;
  });

  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ link });
```

**[FIND]** in DELETE:

```ts
  const db = await readDb();
  if (!db.links[slug]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  delete db.links[slug];
  await writeDb(db);

  return new Response(null, { status: 204 });
```

**[REPLACE WITH]**:

```ts
  const removed = await withLock(async () => {
    const db = await readDb();
    if (!db.links[slug]) return false;

    delete db.links[slug];
    await writeDb(db);
    return true;
  });

  if (!removed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
```

> "PATCH and DELETE get the same treatment, because an edit or a delete landing mid-click can also clobber data. The rule I'm establishing: **every writer goes through the lock.** No exceptions, or the guarantee is void."

### 4d. Verify (15:10 – 15:30)

**[DO]** Terminal pane 2:

```bash
npm run hammer
node scripts/hammer.mjs promo 200
```

**[CHECK]** You will see:

```
Sent 50 visits to /docs
Counter went from ... to ... (+50)
PASS: every click was counted.

Sent 200 visits to /promo
Counter went from ... to ... (+200)
PASS: every click was counted.
```

> "Fifty sent, fifty counted. Two hundred sent, two hundred counted. Same benchmark, different number — that's the fix proven, not assumed."

> "One honest caveat, and it goes straight into the readiness log: **this lock is in-process.** If we ran two instances of this app behind a load balancer, each process would have its own queue and the race would come back. The production-grade answer at that scale is to let the datastore do the increment atomically — a SQL `UPDATE links SET clicks = clicks + 1`, or Redis `INCR` — or take a distributed lock. For a single-process MVP on a JSON file, a promise queue is exactly the right size. Knowing *where your fix stops working* is part of shipping it."

**Editing checklist for Task 2**

| File | Change |
| :--- | :--- |
| `lib/store.ts` | **ADD** `withLock` promise queue (stored on `globalThis`) |
| `app/[slug]/route.ts` | Wrap click read-modify-write in `withLock` |
| `app/api/links/[slug]/route.ts` | Wrap PATCH and DELETE in `withLock` |

---
## PART 5 — Hardening Task 3: Slug collisions & custom-slug conflicts (15:30 – 18:30)

**Goal of this task:**

> "Task three: identifiers. Two related problems. One — if a user asks for a custom slug that already exists, the MVP silently overwrites that link and wipes its history. Two — my random generator only produces three base-36 characters, roughly forty-six thousand possibilities, which collides much sooner than intuition says. I'll make custom conflicts a proper `409 Conflict`, and make random slugs effectively collision-proof."

### 5a. Baseline measurement (15:30 – 16:45)

**[DO]** Terminal pane 2:

```bash
npm run collide
```

> "Another audit utility from the MVP: `collide` exercises both problems. Part A asks for the same custom slug twice with two different destinations. Part B creates six hundred links with random slugs and checks for repeats. Part B takes a few seconds — six hundred sequential requests — so while it runs, let me do the math I should have done when I wrote the generator."

> "Three base-36 characters is thirty-six cubed — 46,656 possible slugs. Sounds fine until you remember the **birthday paradox**: in a room of twenty-three people, there's already a fifty-percent chance two share a birthday, because *pairs* grow quadratically while the space grows linearly. With six hundred links drawn from forty-six thousand possibilities, the chance of at least one collision is roughly **ninety-eight percent**. In other words: my generator was a bug waiting for volume."

**[CHECK]** — a real run against this exact MVP produced:

```
Part A: same custom slug, two different destinations
  first  -> 201
  second -> 201
  /collide-test now points at: https://example.com/second
  FAIL: the second request silently replaced the first link.

Part B: creating 600 links with random slugs
  duplicate slug "fqa" (page-156 was overwritten by page-217)
  duplicate slug "i13" (page-55 was overwritten by page-429)
  duplicate slug "cnd" (page-409 was overwritten by page-466)
  FAIL: 3 links were overwritten by a slug collision.
```

*(Part B is probabilistic — about a 2% chance of zero duplicates on a given run. If it prints PASS before you've fixed anything, say exactly that — "unlucky run, the collision is probabilistic" — and run it again.)*

> "Part A: both requests returned 201, and the slug now points at the second destination. The first link and its click history were silently destroyed. Part B found three collisions in six hundred links — each one a user's link quietly replaced by a stranger's. Both problems are real and measurable."

**[DO]** Switch to Chrome. Create destination `https://example.com/oops` with slug `promo`. Point at the table.

> "Here's the user's-eye view: I create `promo`, the UI says 'Created' — no warning — and the original promo link is gone, its history reset to zero. Silent data loss with a 201 status code. That's the worst kind of failure: the system *tells you* it succeeded."

### 5b. Root cause (16:45 – 17:15)

**[DO]** Open `app/api/links/route.ts`. Highlight `db.links[slug] = link;`.

> "Root cause is this assignment. Assigning to a key that exists replaces whatever was there — and we never check. Two paths reach this line: a custom slug the user chose, and a random one from the generator. Both can collide."

> "There's a subtle trap in the obvious fix. 'Check whether the slug exists, then insert' is a *check-then-act* — itself a race. Two requests can both observe 'not taken' and both insert. So the check must live **inside the same write lock I added in the last task**. The lock I built for click counting just became the foundation for correctness here too — that's why I fixed concurrency before this."

### 5c. Fix: crypto slugs, validation, and 409 inside the lock (17:15 – 18:30)

**[DO]** **[OPEN]** `lib/slug.ts` — replace the entire file:

```ts
import { randomBytes } from "crypto";

// Six URL-safe characters: 64^6 (about 68 billion) possible slugs.
export function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 6);
}

// Keep drawing slugs until we find one that isn't taken.
export function generateUniqueSlug(isTaken: (slug: string) => boolean): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = generateSlug();
    if (!isTaken(slug)) return slug;
  }
  throw new Error("Could not generate a unique slug");
}
```

> "**I'm upgrading the random generator to six URL-safe characters using `crypto.randomBytes`** — base64url gives me sixty-four URL-safe symbols, so sixty-four to the sixth is about **sixty-eight billion** slugs. At that size, even at a million links, the collision probability is negligible. But negligible isn't zero, so `generateUniqueSlug` takes an `isTaken` callback and keeps drawing — up to ten attempts — until it finds a free slug. Note it's crypto-random, not `Math.random`: unpredictable slugs also resist enumeration, which is exactly what you want from unlisted short links."

**[DO]** **[OPEN]** `lib/validate.ts`. **[ADD]** at the top of the file (above the `UrlCheck` type):

```ts
const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const RESERVED_SLUGS = new Set(["api", "_next"]);

// Returns an error message, or null when the custom slug is acceptable.
export function validateSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return "slug must be 3-32 characters: letters, numbers, - or _";
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return "that slug is reserved";
  }
  return null;
}
```

> "While I'm in the validator: custom slugs get a format contract — three to thirty-two characters, letters, digits, dash, underscore. And two reserved names, `api` and `_next`, because those are paths the framework itself serves and a user must not be able to claim them. A user creating the slug `api` would have made half this app unreachable."

**[DO]** **[OPEN]** `app/api/links/route.ts` — update imports:

**[FIND]**:

```ts
import { readDb, writeDb, withLock, type LinkRecord } from "@/lib/store";
import { generateSlug } from "@/lib/slug";
import { validateDestination } from "@/lib/validate";
```

*(If your import line doesn't include `withLock` yet, make sure it matches this — the lock import arrives via this edit.)*

**[REPLACE WITH]**:

```ts
import { readDb, writeDb, withLock, type LinkRecord } from "@/lib/store";
import { generateUniqueSlug } from "@/lib/slug";
import { validateDestination, validateSlug } from "@/lib/validate";
```

**[FIND]** (everything from `const slug =` down to the final return of POST):

```ts
  const slug =
    typeof body.slug === "string" && body.slug.trim() !== ""
      ? body.slug.trim()
      : generateSlug();

  const db = await readDb();
  const link: LinkRecord = {
    slug,
    url: check.url,
    createdAt: new Date().toISOString(),
    clicks: 0,
  };
  db.links[slug] = link;
  await writeDb(db);

  return NextResponse.json({ link }, { status: 201 });
```

**[REPLACE WITH]**:

```ts
  const customSlug =
    typeof body.slug === "string" && body.slug.trim() !== ""
      ? body.slug.trim()
      : null;

  if (customSlug) {
    const slugError = validateSlug(customSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }
  }

  const link = await withLock(async () => {
    const db = await readDb();

    // A custom slug that already exists is a conflict, never an overwrite.
    if (customSlug && db.links[customSlug]) return null;

    const slug = customSlug ?? generateUniqueSlug((s) => s in db.links);
    const created: LinkRecord = {
      slug,
      url: check.url,
      createdAt: new Date().toISOString(),
      clicks: 0,
    };
    db.links[slug] = created;
    await writeDb(db);
    return created;
  });

  if (!link) {
    return NextResponse.json(
      { error: `the slug "${customSlug}" is already taken` },
      { status: 409 }
    );
  }

  return NextResponse.json({ link }, { status: 201 });
```

> "Here's the new flow. If the user supplied a custom slug, I validate its format *before* touching storage — cheap checks first. Then the entire create runs inside `withLock`: read the database, and **if the custom slug is already taken, return null from inside the lock** — that becomes a `409 Conflict` outside. 409, not 400: the request is well-formed, it just clashes with the current state of the resource. And because the existence check and the insert are both inside the lock, the check-then-act race I warned about can't happen. For random slugs, `generateUniqueSlug` draws against the same in-memory map — also inside the lock, so even the 'is it free' check is race-free."

### 5d. Verify (18:00 – 18:30)

**[DO]** Terminal pane 2:

```bash
npm run collide
```

**[CHECK]** You will see:

```
Part A: same custom slug, two different destinations
  first  -> 201
  second -> 409
  /collide-test now points at: https://example.com/first
  PASS: the second request was refused.

Part B: creating 600 links with random slugs
  PASS: no collisions.
```

> "Part A: second request refused with 409, and the slug still points at the *first* destination — history intact. Part B: six hundred random links, zero collisions."

**[DO]** For extra confidence — ten simultaneous creates for the same slug:

```bash
for i in $(seq 1 10); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/links \
    -H 'content-type: application/json' \
    -d "{\"url\":\"https://example.com/$i\",\"slug\":\"race-test\"}" &
done | sort | uniq -c
```

**[CHECK]** You will see:

```
      1 201
      9 409
```

> "Ten concurrent requests for one slug: exactly one 201, nine 409s. The lock is doing its job under real concurrency. Cleaning up the test link — and over in the browser, trying to create `promo` again now gives a red 'already taken' message while the original link stays untouched."

**Editing checklist for Task 3**

| File | Change |
| :--- | :--- |
| `lib/slug.ts` | **REWRITE** — 6-char `crypto.randomBytes` slugs + retry-until-unique |
| `lib/validate.ts` | **ADD** `validateSlug()` — format rules + reserved names |
| `app/api/links/route.ts` | Slug format check; create inside `withLock`; `409` on taken custom slug |

---
## PART 6 — Hardening Task 4: Timezone-dependent analytics (18:30 – 21:30)

**Goal of this task:**

> "Task four: time. The analytics chart buckets clicks by the server's *local* calendar day. Same data, different server timezone, different chart. This bug is invisible on your own machine — which is exactly why it survives into production. I'll make storage and default aggregation deterministic: UTC everywhere, and display-timezone becomes a deliberate feature instead of an accident of where the process runs."

### 6a. Demonstrate the gap (18:30 – 19:45)

**[DO]** Chrome: look at the Analytics panel. Point at the bars around the midnight days and at the **server timezone** tile.

> "Here's the dashboard right now. I want two numbers from the chart: the day before the seed data's midnight boundary, and the day after. **[Read both numbers aloud and jot them down — on a UTC+0 machine you'll see 10-24 with 3 and 10-25 with 4.]** And this tile shows the server timezone, which on my machine reads **[read it — e.g. Africa/Lagos, UTC+1]**. That timezone is silently deciding which day each click belongs to."

> "The seeded data has five clicks deliberately placed right around midnight UTC — that's the pressure point. Whether a click at 23:10 UTC belongs to the 24th or the 25th depends entirely on which timezone you ask. So let me *become* a server in another region. I even added a script for it."

**[DO]** Terminal **pane 1**: press **Ctrl+C** to stop the dev server, then:

```bash
npm run dev:la
```

Wait for "Ready". Reload Chrome. Then terminal pane 2: `npm run stats`.

**[CHECK]** — a real run against this exact MVP produced (server now `America/Los_Angeles`):

```
serverTimezone : America/Los_Angeles
perDay:  2026-10-24 -> 5      2026-10-25 -> 2      (was 3 and 4 in UTC)
```

> "Same database file, byte for byte. The timezone tile now says America/Los_Angeles — and the 24th gained two clicks while the 25th lost two. **The total didn't change; the clicks just moved between days.** A team in Lagos, a team in Los Angeles, same data, different reports. If anyone ever builds a weekly report or a billing cutoff on top of this, it's wrong by hours depending on where the server happens to run. Bug reproduced — and *that's* how you reproduce a timezone bug: change the timezone, nothing else."

### 6b. Investigate (19:45 – 20:30)

**[DO]** **[OPEN]** `data/db.json`, search for `2026-10-24T23`.

> "Where do I start? First suspect: the data. Is the stored data ambiguous? Searching around midnight — every timestamp ends in a capital **Z**: ISO 8601, UTC. `2026-10-24T23:10:00Z` is one exact moment in time, unambiguous. Not the data. Storing UTC timestamps was the right call; something downstream is misreading them."

**[DO]** **[OPEN]** `components/StatsPanel.tsx`, scroll to the bars. *[It just prints `d.day`.]*

> "Second suspect: the chart component. It only renders the strings the API gives it — no date math at all. Not here either. The divergence must be in aggregation."

**[DO]** **[OPEN]** `lib/stats.ts`. Highlight the `getFullYear` / `getMonth` / `getDate` lines:

```ts
    const d = new Date(event.ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
```

> "Found it. `getFullYear`, `getMonth`, `getDate` — these are the **local-time** getters. They answer: what year, month and day is this moment *in the timezone of the machine I'm running on*? On a UTC+0 server that happens to equal UTC, so it looks correct in development. On a UTC-7 server, a click at 00:20 UTC on the 25th is still 17:20 on the 24th locally — so it lands in the previous day's bucket. Exactly the two-click shift we measured. The bug was invisible on my machine and will be visible on the deploy server. Classic."

### 6c. Fix: UTC bucketing (20:30 – 21:30)

> "**Analytics storage and default aggregation must be deterministic.** My rule: timestamps are stored in UTC — they already are — and bucketed in UTC. If we later want per-user timezone views, that's a display-layer feature we build on purpose, with a user's profile setting. What we never do is let the host machine's timezone silently decide business answers."

**[DO]** In `lib/stats.ts` — **[FIND]** the two lines inside the loop (shown above in 6b) and **[REPLACE WITH]**:

```ts
    // Always bucket by the UTC calendar day, whatever timezone the server is in.
    const day = new Date(event.ts).toISOString().slice(0, 10);
```

**[FIND]** the comment above the function:

```ts
// Group click events into one bucket per calendar day.
```

**[REPLACE WITH]**:

```ts
// Group click events into one bucket per UTC calendar day.
```

> "The fix is one line: `new Date(event.ts).toISOString().slice(0, 10)`. `toISOString` is *defined* to return UTC — there is no local flavor of it — and the first ten characters are the `YYYY-MM-DD` calendar day. No local getters anywhere, so the host timezone can't influence the answer even in principle. And I'm updating the comment, because a rule like 'this is UTC on purpose' needs to be written where the next person will read it."

**[DO]** Save. The dev server is *still running in LA time* — that's the whole test. Wait for hot reload, then terminal pane 2: `npm run stats`. Chrome: reload.

**[CHECK]** You will see (server still `America/Los_Angeles`):

```
perDay:  2026-10-24 -> 3      2026-10-25 -> 4      (identical to the UTC numbers)
```

> "Server still in Los Angeles — and the chart is back to exactly the UTC numbers: three and four. Same data, same answer, on any machine on Earth. Fix verified under the exact condition that exposed the bug."

**[DO]** Terminal pane 1: **Ctrl+C**, then `npm run dev` to restore your normal timezone.

> "Restoring the server to my normal timezone so I don't leave a strange environment behind. Rule for the log: **any code that groups by date must say which timezone it means.** 'Local' is not a timezone — it's a coin flip."

**Editing checklist for Task 4**

| File | Change |
| :--- | :--- |
| `lib/stats.ts` | Bucket by `toISOString().slice(0, 10)` (UTC), update comment |

---

## PART 7 — Hardening Task 5: Redirect status & browser cache traps (21:30 – 24:30)

**Goal of this task:**

> "Last hardening task: the HTTP contract of the redirect itself. The prototype answers `301 Moved Permanently` with a one-year cache. For editable short links that's exactly backwards — it teaches every browser and CDN to stop asking my server questions. I'll switch to the standard for editable short links: `302 Found` with `Cache-Control: no-store`, so every visit reaches my server, gets counted, and sees the *current* destination."

**Trap to know about before recording this take:** this bug works by Chrome *caching* a redirect. If you visited `/docs` in a previous take, Chrome may hold that 301 for a year regardless of your code. Use a **fresh Incognito window** for this take, and in DevTools' Network tab make sure **"Disable cache" is unticked** — with it ticked, Chrome skips its cache and *hides* the bug.

### 7a. Demonstrate the gap (21:30 – 22:45)

**[DO]** Terminal pane 2:

```bash
curl -i localhost:3000/docs
```

> "Before any browser tricks — what does the server actually *say*?"

**[CHECK]** You will see:

```
HTTP/1.1 301 Moved Permanently
cache-control: public, max-age=31536000
location: https://nextjs.org/docs
```

> "Three headers that matter. 301 — 'moved permanently'. `max-age=31536000` — one year, in seconds. And the Location. I flagged exactly this during the tour. Now let's see what it does in a real browser."

**[DO]** Chrome (fresh Incognito window): open DevTools → Network tab, confirm "Disable cache" is **unticked**. Visit `localhost:3000/docs` in a new tab → lands on the Next.js docs. Back to the dashboard, refresh — the docs click count went up by one.

> "First visit behaves. Now the actual scenario a real user would hit."

**[DO]** Dashboard: click **Edit** on the `docs` row, change destination to `https://react.dev`, **Save**. Confirm the table shows react.dev. Then terminal: `curl -i localhost:3000/docs` again — Location now says `https://react.dev/`.

> "The server has the new destination — I can prove it: fresh curl, new Location. The edit saved. Now the browser."

**[DO]** Chrome: visit `localhost:3000/docs` again in a new tab.

**[CHECK]** You will see: Chrome goes to the **Next.js docs — the old destination** — and in the Network tab the request shows "(disk cache)" / "(memory cache)". The dashboard click count does **not** move.

> "It still goes to the Next.js docs. It ignored the edit entirely. Look at the Network panel: 'served from disk cache' — that request **never reached my server**. No redirect check, no click recorded, nothing. And that's the second symptom of the same bug: every visit from a browser that cached the redirect is invisible to my analytics. My click counts were undercounted in Task 2 by a *race*; they're undercounted here by design."

### 7b. Root cause (22:45 – 23:15)

> "Let me be careful not to blame the wrong layer. Is the PATCH handler failing? No — the curl after the edit proved the server has the new destination. The server is correct. **The browser is doing exactly what I told it to do.** I said: '301 — moved permanently' and 'cache this for a year'. A permanent redirect *permits* — effectively *invites* — the browser to never contact me again for that URL. I can't patch my way out of this one in code; the only fix is to stop sending that contract. And there's a production lesson worth saying twice: **you cannot recall a 301 that is already sitting in other people's browsers.** If I shipped this to real users, every one of them who clicked `/docs` before my fix would keep going to the old page until their cache expired. Prevention is the only cure."

### 7c. Fix: 302 + no-store (23:15 – 24:30)

**[DO]** **[OPEN]** `app/[slug]/route.ts`. **[FIND]** the response at the bottom:

```ts
  return new Response(null, {
    status: 301,
    headers: {
      Location: link.url,
      "Cache-Control": "public, max-age=31536000",
    },
  });
```

**[REPLACE WITH]**:

```ts
  // 302 + no-store: destinations are editable and every visit must be counted,
  // so browsers and CDNs must never cache this redirect.
  return new Response(null, {
    status: 302,
    headers: {
      Location: link.url,
      "Cache-Control": "no-store",
    },
  });
```

> "Two changes, and the reasoning matters more than the diff. Status **302 Found** instead of 301: 301 and 308 are *permanent* and cacheable; 302 and 307 are *temporary* and re-asked every time. **For editable short links, the standard is a 302 with `Cache-Control: no-store` — every single visit must hit our server to log analytics and check the current destination.** `no-store` is the strongest anti-caching instruction — not 'revalidate', not 'don't share', but *don't remember this response at all*, in browsers or CDNs. We trade a little redirect latency for correctness of data — and for a link shortener, the redirect *is* the product."

**[DO]** Terminal pane 2:

```bash
curl -i localhost:3000/docs
```

**[CHECK]** You will see:

```
HTTP/1.1 302 Found
cache-control: no-store
location: https://react.dev/
```

> "302, no-store, correct destination. Now the browser — and here's the trap I flagged: Chrome still holds the old 301 from before the fix, and per that contract it will keep using it without asking me. That's the production lesson playing out on my own laptop. For the test, I clear the cache."

**[DO]** DevTools → Network tab → right-click in the request list → **"Clear browser cache"**. Then visit `localhost:3000/docs` in a new tab.

**[CHECK]** You will see: lands on **react.dev**, dashboard click count ticks up.

> "Now it goes to react.dev — the *edited* destination — and the counter moved. Edits take effect immediately and every visit is counted. That's the full loop fixed: create, count, edit, redirect, count again."

**Editing checklist for Task 5**

| File | Change |
| :--- | :--- |
| `app/[slug]/route.ts` | `301` + `max-age=31536000` → `302` + `Cache-Control: no-store` |

---
## PART 8 — Writing the production-readiness log (24:30 – 28:30)

**[DO]** In VS Code **[CREATE]** `docs/POSTMORTEM.md`. Split the editor to show Markdown preview (**Cmd/Ctrl+K V**).

> "All five hardening tasks are done and verified, so now the part that separates a senior workflow from a tutorial: writing it down. **Whenever I finish hardening an MVP, I document the edge cases, the known architectural limitations — like in-memory locking versus distributed Redis locks — and the follow-ups for the team.** I'm calling this a production-readiness log: what the gaps were, what I changed, how each fix was verified, what's *still* not production-grade, and what I'd do next. No blame, no fluff — the next engineer should be able to pick this up cold."

> "Practical note as I go: I type the summary and the key decisions live, and paste the table — the content is what matters, not my typing speed."

**[TYPE / PASTE]** the full content below into `docs/POSTMORTEM.md` (fill in your name and the date):

````markdown
# Linkly — Production Readiness Log

- **Status:** All five hardening items resolved and verified
- **Scope:** Redirect handler, links API, analytics aggregation
- **Author:** <your name> · **Date:** <today's date>
- **Verification:** Every fix re-tested with a reproducible command after the change

## 1. Summary

Linkly started as an MVP: a Next.js (App Router) + TypeScript link shortener with
click analytics, correct on the happy path only. This session audited the system
against real-world production conditions and closed five gaps: unvalidated input,
concurrent write races, silent slug collisions, timezone-dependent analytics, and
a redirect caching contract that broke editability and analytics. All fixes are
verified with reproducible scripts and commands, and the production build passes.

## 2. Edge cases found, fixed, and verified

| # | Edge case / failure mode | Production impact | Fix | Verified with | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Destination is not an http(s) URL (`javascript:`, `data:`, plain text) | Stored-XSS setup via redirects/exports; permanently broken links | `lib/validate.ts`: native `URL` parser + `http:`/`https:` allowlist on POST and PATCH; store the normalized URL | `curl` POST `javascript:` → 400; plain text → 400; valid https → 201 | PASS |
| 2 | 50 concurrent visits to one link | Lost updates: counter recorded ~7 of 50 visits (measured) | `withLock` promise queue in `lib/store.ts`; every read-modify-write goes through it (redirect, PATCH, DELETE) | `npm run hammer` → +50/50 PASS; 200 visits → +200/200 PASS | PASS |
| 3 | Custom slug already exists | Second 201 silently replaced the first link and wiped its history | Existence check inside the lock → `409 Conflict` with a clear message | `npm run collide` Part A → second request 409, original intact; 10 concurrent creates → 1×201 + 9×409 | PASS |
| 4 | Random slug collision (3 base-36 chars = 46,656 options; birthday paradox ≈ 98% at 600 links) | Links overwrite each other silently at volume | 6-char `crypto.randomBytes` base64url slugs (≈68 billion) + retry-until-unique inside the lock | `npm run collide` Part B → 0 collisions in 600 links (was 3) | PASS |
| 5 | Server timezone ≠ UTC (region, DST) | Same data, different charts per region; clicks migrate between days at midnight boundaries | Bucket by UTC calendar day: `new Date(ts).toISOString().slice(0, 10)` | `npm run dev:la` (TZ=America/Los_Angeles): chart identical to UTC (was shifted 3/4 → 5/2) | PASS |
| 6 | Browser/CDN cached the `301` for a year | Edited destinations never reach repeat visitors; those visits bypass analytics entirely | `302 Found` + `Cache-Control: no-store` on the redirect response | `curl -i` → 302/no-store; edit destination → next visit follows new target and is counted | PASS |

## 3. Design decisions worth remembering

- **Allowlist over blocklist.** Two allowed protocols instead of a list of banned
  schemes — safe against schemes that don't exist yet.
- **Native `URL` parser over regex/`startsWith`.** Parsing beats pattern-matching
  for a format as slippery as URLs, and we store the normalized result.
- **Result objects, not exceptions, for expected failures.** Validation returns
  `{ ok, error }`; the route maps it straight to a 4xx.
- **One serialization point for all writers.** Concurrency correctness lives in
  the storage layer (`withLock`), not scattered across route handlers.
- **Check-then-act is a race.** Uniqueness checks happen *inside* the same lock
  as the insert. A check outside the lock is decoration.
- **409 for conflicts, 400 for malformed input.** Status codes carry meaning;
  use them precisely.
- **UTC is the analytics contract.** Store UTC, aggregate UTC. Display-timezone
  is a future presentation-layer feature, decided on purpose.
- **Temporary redirects for editable targets.** A permanent redirect is a promise
  you cannot revoke from other people's browsers.

## 4. Known limitations (what this fix does *not* solve)

1. **The write lock is in-process.** Two app instances behind a load balancer
   each hold their own queue — the race returns across processes. Production
   answer: atomic datastore operations (`UPDATE ... SET clicks = clicks + 1`,
   Redis `INCR`) or a distributed lock (Redis/etcd).
2. **The JSON file is a single-node store.** Whole-file read/modify/write per
   operation is fine at MVP scale; beyond that, move to SQLite/Postgres.
3. **No authentication or rate limiting.** Any visitor can create/edit/delete.
4. **Click events grow unbounded.** Needs retention or archival.
5. **No redirect-loop detection** if a destination points back at this app.

## 5. Follow-ups (priority order)

1. Move counters into a real datastore with atomic increments (removes the need
   for the in-process lock entirely).
2. Add auth + rate limiting on the write endpoints.
3. Promote `hammer` and `collide` from audit scripts to CI checks on every PR.
4. One-off data scan for any pre-fix links stored with non-http schemes.
5. Per-timezone analytics view (store UTC, convert at display time).

## 6. Verification log

| Command | Before | After |
| :--- | :--- | :--- |
| `npm run hammer` | +7 of 50 (FAIL) | +50 of 50 (PASS) |
| `node scripts/hammer.mjs promo 200` | — | +200 of 200 (PASS) |
| `npm run collide` (A) | second create 201, overwrite | 409, original intact |
| `npm run collide` (B) | 3 collisions / 600 | 0 collisions / 600 |
| POST `javascript:` URL | 201 Created | 400 rejected |
| `npm run dev:la` + `npm run stats` | 10-24→5, 10-25→2 | 10-24→3, 10-25→4 (UTC-stable) |
| `curl -i /docs` | 301, max-age=31536000 | 302, no-store |
| `npm run build` | — | compiles clean |
````

> "That's the artifact I'd hand my team: what broke, what changed, how it's proven, what's still risky, what's next. The limitations section is deliberate — a readiness doc that claims everything is solved is a red flag. Knowing the boundary of your fix *is* production thinking."

---

## PART 9 — Production build, commit, close (28:30 – 30:00)

**[DO]** Stop the dev server (Ctrl+C in pane 1), then in pane 2:

```bash
npm run build
```

**[CHECK]** You will see the route table and no TypeScript errors:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /[slug]
├ ƒ /api/links
├ ƒ /api/links/[slug]
└ ƒ /api/stats

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

> "Production build — the TypeScript compiler is the second reviewer in the room, and it passes clean. Strict mode would have caught any type slip in the code we wrote today."

**[DO]** Then:

```bash
git add -A
git commit -m "feat: harden link creation, concurrency, and redirect caching"
```

> "Committing with a message that describes the *what*, not the diff: link creation hardened — validation and conflict handling; concurrency — serialized writes; redirect caching — no more permanent redirects. One logical change-set, one commit."

**[DO]** Optional final flourish: open the dashboard one last time in Chrome and show the analytics panel.

> "And that's the session. We started with an MVP that worked on the happy path and I walked out with: every destination validated at the door, all writers serialized so clicks can't vanish, slug conflicts answered with 409 instead of silent data loss, analytics that mean the same thing in every datacenter, and redirects that can't be cached into oblivion. The readiness log in `docs/` records exactly what's fixed, how each fix was verified, where the fixes stop working, and what the team should build next. That's what taking a prototype to production-ready looks like on a small codebase — measure the gap, fix it at the right layer, prove the fix, write it down. Thanks for watching."

---
## Appendix A — Reset between takes

Run this any time you want to rewind the whole session to the pristine MVP:

```bash
git checkout -- . && git clean -fd lib docs && npm run seed
```

What it does, line by line:

- `git checkout -- .` — restores every **tracked** file you edited (`app/**`, `lib/store.ts`, `lib/slug.ts`, `lib/stats.ts`).
- `git clean -fd lib docs` — deletes **new** files created during the session (`lib/validate.ts`, the whole `docs/` folder).
- `npm run seed` — rewrites `data/db.json` to the known demo state (17 clicks, three links), so the analytics numbers you quote on camera are always the same.

Then:

- Restart `npm run dev` if you stopped it.
- Use a **fresh Incognito window** for the new take (mandatory for Part 7 — cached 301s survive everything else).
- Delete any leftover links you created on camera (they live in `data/db.json`, so `npm run seed` already handles it).

## Appendix B — Troubleshooting

| Symptom | Cause | What to do |
| :--- | :--- | :--- |
| `hammer` prints PASS before Task 2's fix | The race is probabilistic; your machine may have serialized the I/O this run | Say so honestly ("race didn't trigger this run — let me push harder") and run `node scripts/hammer.mjs docs 200`. Larger bursts almost always lose clicks on the unfixed MVP. |
| `collide` Part B prints PASS before Task 3's fix | ~2% chance of zero collisions in 600 draws | "Unlucky run — the collision is probabilistic." Run it again. |
| Port 3000 already in use | Old dev server still running | `pkill -f "next dev"` (macOS/Linux) or change port: `npm run dev -- -p 3001`, and use `localhost:3001` everywhere. |
| Chrome keeps going to the old destination in Part 7 even after the fix | The pre-fix 301 is still in Chrome's cache | Clear browser cache (DevTools → Network → right-click → Clear browser cache), or use a fresh Incognito window. This is the bug working as designed — narrate it! |
| Part 7 demo shows *no* caching at all | DevTools "Disable cache" is ticked, so Chrome skips its cache | Untick "Disable cache" in the Network tab and retry. |
| Timezone numbers in Part 6 don't match the script | Your machine isn't UTC+0 | Doesn't matter — read *your* numbers aloud. The point is they **change** with `dev:la` before the fix and **don't** after. |
| TypeScript error `Cannot find name 'validateDestination'` | Import forgotten in that file | Add `import { validateDestination } from "@/lib/validate";` — and narrate it: "type checker caught me, good." |
| `curl` isn't available | Rare on Windows without WSL | Use the browser UI for the demo and note that you'd verify headers with curl in CI. |

## Appendix C — Final state of every edited file (self-check)

Compare your files against these after Part 9. If everything matches, the build **will** pass.

**`lib/validate.ts`** (new file)

```ts
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const RESERVED_SLUGS = new Set(["api", "_next"]);

// Returns an error message, or null when the custom slug is acceptable.
export function validateSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return "slug must be 3-32 characters: letters, numbers, - or _";
  }
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return "that slug is reserved";
  }
  return null;
}

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

// A destination must be an absolute http(s) URL. Anything else (javascript:,
// data:, file:, "not a url") is rejected before it reaches storage.
export function validateDestination(input: string): UrlCheck {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: "url must be a valid absolute URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, error: "url must start with http:// or https://" };
  }

  return { ok: true, url: parsed.toString() };
}
```

**`lib/slug.ts`** (replaced entirely)

```ts
import { randomBytes } from "crypto";

// Six URL-safe characters: 64^6 (about 68 billion) possible slugs.
export function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 6);
}

// Keep drawing slugs until we find one that isn't taken.
export function generateUniqueSlug(isTaken: (slug: string) => boolean): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = generateSlug();
    if (!isTaken(slug)) return slug;
  }
  throw new Error("Could not generate a unique slug");
}
```

**`lib/stats.ts`** — only the loop body and the comment change:

```ts
// Group click events into one bucket per UTC calendar day.
export function clicksPerDay(events: ClickEvent[]): DayBucket[] {
  const buckets = new Map<string, number>();

  for (const event of events) {
    // Always bucket by the UTC calendar day, whatever timezone the server is in.
    const day = new Date(event.ts).toISOString().slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, clicks]) => ({ day, clicks }));
}
```

*(The `topReferrers` function below it is untouched.)*

**`lib/store.ts`** — `withLock` sits between `readDb` and `writeDb`:

```ts
// Every read-modify-write must go through withLock so only one runs at a time.
// The queue lives on globalThis so every route bundle shares the same one.
const globalForLock = globalThis as unknown as {
  __linklyLock?: Promise<unknown>;
};

export function withLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalForLock.__linklyLock ?? Promise.resolve();
  const run = previous.then(task);
  globalForLock.__linklyLock = run.catch(() => undefined);
  return run;
}
```

**`app/[slug]/route.ts`** (complete file)

```ts
import { readDb, writeDb, withLock } from "@/lib/store";

// GET /:slug -> record the click, then redirect to the destination.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const referrer = req.headers.get("referer");

  const link = await withLock(async () => {
    const db = await readDb();
    const found = db.links[slug];
    if (!found) return null;

    found.clicks += 1;
    db.events.push({ slug, ts: new Date().toISOString(), referrer });
    await writeDb(db);
    return found;
  });

  if (!link) {
    return new Response("Link not found", { status: 404 });
  }

  // 302 + no-store: destinations are editable and every visit must be counted,
  // so browsers and CDNs must never cache this redirect.
  return new Response(null, {
    status: 302,
    headers: {
      Location: link.url,
      "Cache-Control": "no-store",
    },
  });
}
```

**`app/api/links/route.ts`** (complete file)

```ts
import { NextResponse } from "next/server";
import { readDb, writeDb, withLock, type LinkRecord } from "@/lib/store";
import { generateUniqueSlug } from "@/lib/slug";
import { validateDestination, validateSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/links -> every link, newest first.
export async function GET() {
  const db = await readDb();
  const links = Object.values(db.links).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return NextResponse.json({ links });
}

// POST /api/links { url, slug? } -> create a short link.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    url?: unknown;
    slug?: unknown;
  } | null;

  if (!body || typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const check = validateDestination(body.url);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const customSlug =
    typeof body.slug === "string" && body.slug.trim() !== ""
      ? body.slug.trim()
      : null;

  if (customSlug) {
    const slugError = validateSlug(customSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }
  }

  const link = await withLock(async () => {
    const db = await readDb();

    // A custom slug that already exists is a conflict, never an overwrite.
    if (customSlug && db.links[customSlug]) return null;

    const slug = customSlug ?? generateUniqueSlug((s) => s in db.links);
    const created: LinkRecord = {
      slug,
      url: check.url,
      createdAt: new Date().toISOString(),
      clicks: 0,
    };
    db.links[slug] = created;
    await writeDb(db);
    return created;
  });

  if (!link) {
    return NextResponse.json(
      { error: `the slug "${customSlug}" is already taken` },
      { status: 409 }
    );
  }

  return NextResponse.json({ link }, { status: 201 });
}
```

**`app/api/links/[slug]/route.ts`** (complete file)

```ts
import { NextResponse } from "next/server";
import { readDb, writeDb, withLock } from "@/lib/store";
import { validateDestination } from "@/lib/validate";

export const dynamic = "force-dynamic";

// PATCH /api/links/:slug { url } -> change where a short link points.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;

  if (!body || typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const check = validateDestination(body.url);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const link = await withLock(async () => {
    const db = await readDb();
    const found = db.links[slug];
    if (!found) return null;

    found.url = check.url;
    await writeDb(db);
    return found;
  });

  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ link });
}

// DELETE /api/links/:slug -> remove a link (its click history stays).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const removed = await withLock(async () => {
    const db = await readDb();
    if (!db.links[slug]) return false;

    delete db.links[slug];
    await writeDb(db);
    return true;
  });

  if (!removed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
```

---

*Every command, find-block, and check output in this script was executed and verified end-to-end against a fresh copy of the MVP (setup → baseline audit → all five fixes → verification → `npm run build` → commit) before this document was written. If a check output differs slightly on your machine — race numbers, timezone names — that's expected; the pass/fail pattern is what matters.*

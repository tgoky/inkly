### 2a. Project shape (2:30 – 3:30)

**[DO]** Click through the VS Code explorer top to bottom. Open `package.json` briefly.

> "Let me start with the shape of the project. In the editor tab showing `package.json`: Next.js 16, React 19, TypeScript — and that's it for runtime dependencies. No database, no ORM. For a self-hosted MVP that's a deliberate trade: nothing to set up, data lives in a single JSON file. It also means *I* own all the correctness guarantees a database would normally give me — and that's going to be a theme today."

> "Under the `scripts` object in `package.json`, notice the usual `dev`, `build`, and `start`, plus my audit utilities — `seed`, `hammer`, `collide`, `stats`, and `dev:la`, which starts the server with the timezone set to Los Angeles. I'll use that one later when we talk about time."

<!-- 03:17 FIX: Anchor UI location, folder tree, and architectural role -->
**[DO]** At **03:17**, move cursor to the **VS Code File Explorer sidebar on the far left** and collapse/expand the top-level folders one by one.

> "Looking at the **VS Code File Explorer in the left sidebar at 03:17**: 
> - **WHAT:** I'm walking through the top-level directory structure.
> - **WHERE:** In the primary sidebar tree:
>   - The **`app/`** folder contains the Next.js App Router pages and API routes.
>   - The **`components/`** directory holds our React client UI widgets.
>   - The **`lib/`** directory contains our shared core business logic and storage helpers.
>   - The **`scripts/`** folder stores our standalone Node test benchmarks.
>   - The **`data/`** directory houses `db.json`, which acts as our flat-file database.
> - **WHY:** Separating routing, storage, and UI into clean modular boundaries ensures we isolate our server-side fixes without breaking front-end contracts."

---

### 2b. lib/store.ts — the foundation (3:30 – 5:00)

<!-- 03:40 FIX: File opening and exact line anchors for type definitions -->
**[DO]** At **03:40**, expand the **`lib`** folder in the left Explorer sidebar and click **`store.ts`** to open it in the main editor tab.

> "At **03:40**, I expand the **`lib/` directory in the left file tree** and open **`store.ts`** in the main editor pane to inspect our underlying persistence layer."

<!-- 03:48 FIX: Type breakdown with line numbers and structure -->
**[DO]** At **03:48**, highlight lines 1 through 15 in `lib/store.ts`.

> "Looking at **lines 1 through 15 at the top of `lib/store.ts` at 03:48**:
> - **WHAT:** I'm inspecting our three central TypeScript interfaces.
> - **WHERE:** In the active editor tab at the top of `store.ts`:
>   - **Lines 1–6** define `LinkRecord` with `slug`, `url`, `createdAt`, and `clicks`.
>   - **Lines 8–12** define `ClickEvent` with `slug`, `ts`, and `referrer`.
>   - **Lines 14–17** define `Db`, holding our links record dictionary and events array.
> - **WHY:** Explicit type definitions ensure our storage schema is enforced across all route handlers and background jobs."

<!-- 03:57 FIX: readDb function inspection and security details -->
**[DO]** At **03:57**, scroll down and highlight the `readDb` function definition spanning lines 19 to 33.

> "Moving down to **line 19 in `lib/store.ts` at 03:57**:
> - **WHAT:** I am reviewing the `readDb` helper function.
> - **WHERE:** Inside `readDb`, specifically **lines 25–28** inside the `try` block.
> - **WHY:** It reads and parses `data/db.json`. Notice on **line 27** it rebuilds the links dictionary using `Object.create(null)`. This prevents prototype-pollution vulnerabilities if a user supplies a custom slug named `__proto__` or `constructor`."

<!-- 04:17 FIX: writeDb function and atomic rename logic -->
**[DO]** At **04:17**, scroll down to the `writeDb` function on line 35.

> "Scrolling down to **line 35 of `lib/store.ts` at 04:17**:
> - **WHAT:** I am inspecting the `writeDb` implementation.
> - **WHERE:** On **lines 38–41** inside `writeDb`.
> - **WHY:** To ensure crash-safety, it writes payload data to a temporary file (`db.json.tmp`) before calling `fs.promises.rename` over `data/db.json`. Operating system renames are atomic, preventing partial file corruption if the process crashes mid-write."

<!-- 04:43 FIX: Highlighting the concurrency flaw across the entire file -->
**[DO]** At **04:43**, select both functions simultaneously or use the minimap to indicate the whole file.

> "Looking across **the entire file of `lib/store.ts` at 04:43**:
> - **WHAT:** I am diagnosing our core concurrency vulnerability.
> - **WHERE:** In the space between `readDb` and `writeDb` across the file module scope.
> - **WHY:** Every handler executes an asynchronous read-modify-write cycle with no serialization or locking mechanism. Under concurrent traffic, overlapping reads and writes will cause lost updates. We will benchmark and resolve this in Task 2."
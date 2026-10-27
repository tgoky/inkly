import { promises as fs } from "fs";
import path from "path";

export interface LinkRecord {
  slug: string;
  url: string;
  createdAt: string; // ISO 8601, always UTC
  clicks: number;
}

export interface ClickEvent {
  slug: string;
  ts: string; // ISO 8601, always UTC
  referrer: string | null;
}

export interface Db {
  links: Record<string, LinkRecord>;
  events: ClickEvent[];
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Read the whole database file. If it doesn't exist yet we start empty.
export async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as Db;
    // A null-prototype map, so a slug like "constructor" is just a normal key.
    db.links = Object.assign(Object.create(null), db.links);
    return db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { links: Object.create(null), events: [] };
    }
    throw err;
  }
}

// Write the whole database file. We write to a temp file and rename it so a
// reader never sees a half-written file.
export async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

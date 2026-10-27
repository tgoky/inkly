import { NextResponse } from "next/server";
import { readDb, writeDb, type LinkRecord } from "@/lib/store";
import { generateSlug } from "@/lib/slug";

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

  const slug =
    typeof body.slug === "string" && body.slug.trim() !== ""
      ? body.slug.trim()
      : generateSlug();

  const db = await readDb();
  const link: LinkRecord = {
    slug,
    url: body.url.trim(),
    createdAt: new Date().toISOString(),
    clicks: 0,
  };
  db.links[slug] = link;
  await writeDb(db);

  return NextResponse.json({ link }, { status: 201 });
}

import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/store";

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

  const db = await readDb();
  const link = db.links[slug];
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  link.url = body.url.trim();
  await writeDb(db);

  return NextResponse.json({ link });
}

// DELETE /api/links/:slug -> remove a link (its click history stays).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const db = await readDb();
  if (!db.links[slug]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  delete db.links[slug];
  await writeDb(db);

  return new Response(null, { status: 204 });
}

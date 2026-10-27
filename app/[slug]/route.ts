import { readDb, writeDb } from "@/lib/store";

// GET /:slug -> record the click, then redirect to the destination.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  return new Response(null, {
    status: 301,
    headers: {
      Location: link.url,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}

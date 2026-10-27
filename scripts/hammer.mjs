// Fires N simultaneous visits at one short link and checks that the click
// counter went up by exactly N.
// Usage: npm run hammer            (50 hits on /docs)
//        node scripts/hammer.mjs gh 100
const BASE = process.env.BASE ?? "http://localhost:3000";
const slug = process.argv[2] ?? "docs";
const hits = Number(process.argv[3] ?? 50);

async function getClicks() {
  const res = await fetch(`${BASE}/api/links`, { cache: "no-store" });
  const { links } = await res.json();
  const link = links.find((l) => l.slug === slug);
  if (!link) throw new Error(`No link with slug "${slug}". Run: npm run seed`);
  return link.clicks;
}

// Warm-up request so the dev server finishes compiling the route first.
await fetch(`${BASE}/${slug}`, { redirect: "manual" });

const before = await getClicks();

await Promise.all(
  Array.from({ length: hits }, () =>
    fetch(`${BASE}/${slug}`, { redirect: "manual" })
  )
);

const after = await getClicks();
const recorded = after - before;
const lost = hits - recorded;

console.log(`Sent ${hits} visits to /${slug}`);
console.log(`Counter went from ${before} to ${after} (+${recorded})`);

if (lost === 0) {
  console.log("PASS: every click was counted.");
} else {
  console.log(`FAIL: ${lost} clicks were lost.`);
  process.exit(1);
}

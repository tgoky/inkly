// Checks that creating links never silently replaces an existing link.
// Usage: npm run collide
const BASE = process.env.BASE ?? "http://localhost:3000";

async function post(body) {
  const res = await fetch(`${BASE}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function destination(slug) {
  const res = await fetch(`${BASE}/api/links`, { cache: "no-store" });
  const { links } = await res.json();
  return links.find((l) => l.slug === slug)?.url ?? null;
}

let failed = false;

// Part A: ask for the same custom slug twice.
console.log("Part A: same custom slug, two different destinations");
const first = await post({ url: "https://example.com/first", slug: "collide-test" });
const second = await post({ url: "https://example.com/second", slug: "collide-test" });
console.log(`  first  -> ${first.status}`);
console.log(`  second -> ${second.status}`);
console.log(`  /collide-test now points at: ${await destination("collide-test")}`);

if (second.status === 201) {
  console.log("  FAIL: the second request silently replaced the first link.");
  failed = true;
} else {
  console.log("  PASS: the second request was refused.");
}

// Part B: create lots of random-slug links and look for repeated slugs.
const COUNT = 600;
console.log(`\nPart B: creating ${COUNT} links with random slugs`);
const seen = new Map();
const created = [];
let duplicates = 0;

for (let i = 0; i < COUNT; i++) {
  const { status, json } = await post({ url: `https://example.com/page-${i}` });
  if (status !== 201) {
    console.log(`  unexpected status ${status}: ${JSON.stringify(json)}`);
    failed = true;
    break;
  }
  const slug = json.link.slug;
  if (seen.has(slug)) {
    duplicates += 1;
    console.log(`  duplicate slug "${slug}" (page-${seen.get(slug)} was overwritten by page-${i})`);
  } else {
    created.push(slug);
  }
  seen.set(slug, i);
}

if (duplicates > 0) {
  console.log(`  FAIL: ${duplicates} links were overwritten by a slug collision.`);
  failed = true;
} else {
  console.log("  PASS: no collisions.");
}

// Clean up everything this script created.
for (const slug of [...created, "collide-test"]) {
  await fetch(`${BASE}/api/links/${slug}`, { method: "DELETE" });
}
console.log("\nCleaned up test links.");

process.exit(failed ? 1 : 0);

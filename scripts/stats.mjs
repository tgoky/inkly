// Prints /api/stats in a readable way.
// Usage: npm run stats
const BASE = process.env.BASE ?? "http://localhost:3000";

const res = await fetch(`${BASE}/api/stats`, { cache: "no-store" });
const stats = await res.json();

console.log(`Server timezone : ${stats.serverTimezone}`);
console.log(`Total links     : ${stats.totalLinks}`);
console.log(`Total clicks    : ${stats.totalClicks}`);
console.log("\nClicks per day:");
for (const { day, clicks } of stats.perDay) {
  console.log(`  ${day}  ${"#".repeat(clicks)} ${clicks}`);
}
console.log("\nTop referrers:");
for (const { referrer, clicks } of stats.topReferrers) {
  console.log(`  ${referrer.padEnd(24)} ${clicks}`);
}

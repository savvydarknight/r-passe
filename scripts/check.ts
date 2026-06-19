import fs from "fs";

const matrix = JSON.parse(
  fs.readFileSync("./data/passport_matrix.json", "utf8")
);
const countries: Record<string, string> = JSON.parse(
  fs.readFileSync("./data/countries.json", "utf8")
);
const scores: Record<string, number> = JSON.parse(
  fs.readFileSync("./generated/scores.json", "utf8")
);
const rankings = JSON.parse(
  fs.readFileSync("./generated/rankings.json", "utf8")
);
const { codes: territoryCodes } = JSON.parse(
  fs.readFileSync("./data/territories.json", "utf8")
);
const territories = new Set<string>(territoryCodes);
// Territories are valid destinations but are intentionally excluded from
// rankings (see stats.ts), so compare against ranked passports only.
const rankedPassports = Object.keys(matrix).filter(p => !territories.has(p));

// Major hubs every passport should have a route for
const MAJOR_HUBS = ["US", "GB", "CN", "AE", "FR", "DE", "SG"];

let errors = 0;
const warn = (msg: string) => { console.warn(`  ⚠ ${msg}`); };
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); errors++; };

console.log("\n── Checking generated files ──\n");

// 1. All passport codes are in countries.json
for (const passport of Object.keys(matrix)) {
  if (!countries[passport]) fail(`Unknown passport code: ${passport}`);
}

// 2. All destination codes are in countries.json
for (const [passport, destinations] of Object.entries(matrix)) {
  for (const dest of Object.keys(destinations as object)) {
    if (!countries[dest]) fail(`Unknown destination code: ${dest} (passport: ${passport})`);
  }
}

// 3. No zero scores
for (const [passport, score] of Object.entries(scores)) {
  if ((score as number) === 0) fail(`Zero mobility score: ${passport}`);
}

// 4. Rankings count matches passport count
if (rankings.length !== rankedPassports.length) {
  fail(`Rankings count (${rankings.length}) != passport count (${rankedPassports.length})`);
}

// 5. Rankings are actually sorted descending
for (let i = 1; i < rankings.length; i++) {
  if (rankings[i].score > rankings[i - 1].score) {
    fail(`Rankings not sorted at position ${i + 1}`);
    break;
  }
}

// 6. Each passport has routes to all major hubs (warn only)
for (const [passport, destinations] of Object.entries(matrix)) {
  for (const hub of MAJOR_HUBS) {
    if (passport === hub) continue;
    if (!(destinations as object).hasOwnProperty(hub)) {
      warn(`${passport} has no route to major hub: ${hub}`);
    }
  }
}

// 7. Each passport has at least 1 destination
for (const [passport, destinations] of Object.entries(matrix)) {
  if (Object.keys(destinations as object).length === 0)
    fail(`Passport with no destinations: ${passport}`);
}

// Summary
const totalRoutes = Object.values(matrix).reduce(
  (a, b) => a + Object.keys(b as object).length, 0
);

console.log(`\n── Summary ──`);
console.log(`  Passports : ${Object.keys(matrix).length}`);
console.log(`  Routes    : ${totalRoutes}`);
console.log(`  Top rank  : ${rankings[0]?.passport} (${rankings[0]?.score})`);
console.log(`  Last rank : ${rankings.at(-1)?.passport} (${rankings.at(-1)?.score})`);
console.log();

if (errors === 0) {
  console.log("✓ Check passed\n");
} else {
  console.error(`✗ Check failed with ${errors} error(s)\n`);
  process.exit(1);
}

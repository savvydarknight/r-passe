import fs from "fs";
import { log, group } from "./log.ts";

log("reading ./data/master.csv, ./data/countries.json, ./data/territories.json");
const csv = fs.readFileSync("./data/master.csv", "utf8");
const countries: Record<string, string> = JSON.parse(
  fs.readFileSync("./data/countries.json", "utf8")
);
const { codes: territoryCodes } = JSON.parse(
  fs.readFileSync("./data/territories.json", "utf8")
);
const territories = new Set<string>(territoryCodes);

log("reading ./generated/unscored-destinations.json");
const { codes: unscoredCodes } = JSON.parse(
  fs.readFileSync("./generated/unscored-destinations.json", "utf8")
);
const unscoredDestinations = new Set<string>(unscoredCodes);

const universe = Object.keys(countries)
  .filter((code) => !territories.has(code))
  .sort();
log(`universe: ${universe.length} non-territory codes`);

// A passport can still have gaps of its own (e.g. Palestinian passport coverage), but
// a display-only destination (Palestine, Western Sahara) is never itself a missing-coverage
// target: it isn't scored, so it shouldn't show up as something a passport is "missing".
const destinationUniverse = universe.filter((code) => !unscoredDestinations.has(code));
log(`destination universe: ${destinationUniverse.length} codes (excludes ${unscoredDestinations.size} unscored destination(s))`);

const lines = csv.trim().split("\n").slice(1);
const have = new Set<string>();
for (const line of lines) {
  const [passport, destination] = line.split(",");
  have.add(`${passport}:${destination}`);
}
log(`master.csv: ${have.size} existing passport:destination pairs`);

interface Gaps {
  code: string;
  name: string;
  missing: string[];
}

const passportGaps: Gaps[] = [];
const destinationGaps: Gaps[] = [];

group("gaps: compute missing pairs", () => {
  for (const code of universe) {
    const missing = destinationUniverse.filter(
      (d) => d !== code && !have.has(`${code}:${d}`)
    );
    const expected = destinationUniverse.filter((d) => d !== code).length;
    passportGaps.push({ code, name: countries[code], missing });
    log(`passport ${code} (${countries[code]}): ${missing.length} missing of ${expected} expected`);
  }

  for (const code of destinationUniverse) {
    const missing = universe.filter(
      (p) => p !== code && !have.has(`${p}:${code}`)
    );
    destinationGaps.push({ code, name: countries[code], missing });
    log(`destination ${code} (${countries[code]}): ${missing.length} missing of ${universe.length - 1} expected`);
  }
});

passportGaps.sort((a, b) => b.missing.length - a.missing.length);
destinationGaps.sort((a, b) => b.missing.length - a.missing.length);

const totalExpected = universe.reduce(
  (sum, code) => sum + destinationUniverse.filter((d) => d !== code).length,
  0
);
const totalMissing = passportGaps.reduce((a, g) => a + g.missing.length, 0);

group("gaps: write report", () => {
  fs.writeFileSync(
    "./generated/gaps.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        universe_size: universe.length,
        total_expected_pairs: totalExpected,
        total_missing_pairs: totalMissing,
        by_passport: passportGaps,
        by_destination: destinationGaps,
      },
      null,
      2
    )
  );
  log("wrote ./generated/gaps.json");
});

console.log(`✓ Gap analysis: ${totalMissing}/${totalExpected} pairs missing (${((totalMissing / totalExpected) * 100).toFixed(1)}%)`);
console.log();
console.log("Worst 15 passports (most missing destinations):");
for (const g of passportGaps.slice(0, 15)) {
  console.log(`  ${g.code} (${g.name}): ${g.missing.length} missing`);
}
console.log();
console.log("Worst 15 destinations (most missing passports):");
for (const g of destinationGaps.slice(0, 15)) {
  console.log(`  ${g.code} (${g.name}): ${g.missing.length} missing`);
}

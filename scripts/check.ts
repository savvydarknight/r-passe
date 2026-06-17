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

let errors = 0;

// 1. All passports are known ISO codes
for (const passport of Object.keys(matrix)) {
  if (!countries[passport]) {
    console.error(`✗ Unknown passport code: ${passport}`);
    errors++;
  }
}

// 2. All destinations are known ISO codes
for (const [passport, destinations] of Object.entries(matrix)) {
  for (const dest of Object.keys(destinations as object)) {
    if (!countries[dest]) {
      console.error(`✗ Unknown destination code: ${dest} (from ${passport})`);
      errors++;
    }
  }
}

// 3. No passport has a score of 0 (would indicate bad data)
for (const [passport, score] of Object.entries(scores)) {
  if ((score as number) === 0) {
    console.error(`✗ Zero score for passport: ${passport}`);
    errors++;
  }
}

// 4. Rankings count matches matrix count
if (rankings.length !== Object.keys(matrix).length) {
  console.error(
    `✗ Rankings count (${rankings.length}) != passport count (${Object.keys(matrix).length})`
  );
  errors++;
}

// 5. Each passport has at least 1 destination
for (const [passport, destinations] of Object.entries(matrix)) {
  if (Object.keys(destinations as object).length === 0) {
    console.error(`✗ Passport with no destinations: ${passport}`);
    errors++;
  }
}

if (errors === 0) {
  console.log(`✓ Check passed (${Object.keys(matrix).length} passports, ${Object.values(matrix).reduce((a, b) => a + Object.keys(b as object).length, 0)} routes)`);
} else {
  console.error(`✗ Check failed with ${errors} error(s)`);
  process.exit(1);
}

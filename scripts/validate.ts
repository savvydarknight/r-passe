import fs from "fs";

const csv = fs.readFileSync("./data/master.csv", "utf8");
const countries: Record<string, string> = JSON.parse(
  fs.readFileSync("./data/countries.json", "utf8")
);
const { codes: territoryCodes } = JSON.parse(
  fs.readFileSync("./data/territories.json", "utf8")
);
const territories = new Set<string>(territoryCodes);

const lines = csv.trim().split("\n");
const header = lines[0];

if (header !== "passport,destination,status,days,source_url,last_verified,confidence") {
  throw new Error("Invalid CSV header");
}

const rows = lines.slice(1);
const validStatuses = new Set(["vf", "vo", "ev", "et", "vr"]);
const validConfidence = new Set(["unverified", "verified", "disputed"]);
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const seen = new Set<string>();

for (const [index, row] of rows.entries()) {
  const rowNumber = index + 2;
  const [passport, destination, status, days, sourceUrl, lastVerified, confidence] =
    row.split(",");

  if (!passport || passport.length !== 2)
    throw new Error(`Invalid passport code at row ${rowNumber}`);

  if (!destination || destination.length !== 2)
    throw new Error(`Invalid destination code at row ${rowNumber}`);

  if (passport === destination)
    throw new Error(`Self-reference at row ${rowNumber}`);

  if (!validStatuses.has(status))
    throw new Error(`Invalid status at row ${rowNumber}`);

  if (days && Number.isNaN(Number(days)))
    throw new Error(`Invalid days value at row ${rowNumber}`);

  if (sourceUrl && !/^https?:\/\//.test(sourceUrl))
    throw new Error(`Invalid source_url at row ${rowNumber}`);

  if (lastVerified && !dateRe.test(lastVerified))
    throw new Error(`Invalid last_verified date at row ${rowNumber} (expected YYYY-MM-DD)`);

  if (!validConfidence.has(confidence))
    throw new Error(`Invalid confidence at row ${rowNumber}`);

  if (!countries[passport])
    throw new Error(`Unknown passport code '${passport}' at row ${rowNumber} — add it to countries.json first`);

  if (!countries[destination])
    throw new Error(`Unknown destination code '${destination}' at row ${rowNumber} — add it to countries.json first`);

  if (territories.has(passport))
    throw new Error(`Territory code '${passport}' at row ${rowNumber} cannot be a passport`);

  if (territories.has(destination))
    throw new Error(`Territory code '${destination}' at row ${rowNumber} cannot be a destination`);

  const key = `${passport}:${destination}`;
  if (seen.has(key))
    throw new Error(`Duplicate route ${key} at row ${rowNumber}`);

  seen.add(key);
}

console.log(`✓ Validation passed (${rows.length} rows)`);

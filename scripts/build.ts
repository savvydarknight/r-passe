import fs from "fs";
import { parseCSV } from "./csv.ts";

const csv = fs.readFileSync("./data/master.csv", "utf8");
const rows = parseCSV(csv);
const header = rows[0];
const dataRows = rows.slice(1);

const idx = (name: string) => header.indexOf(name);
const iPassport = idx("passport");
const iDest = idx("destination");
const iStatus = idx("status");
const iDays = idx("days");
const iNotes = idx("notes");
const iUrl = idx("source_url");
const iVerified = idx("last_verified");
const iConfidence = idx("confidence");

const matrix: Record<string, Record<string, any>> = {};
const metadata: Record<string, { notes: string; source_url: string; last_verified: string; confidence: string }> = {};

for (const row of dataRows) {
  const passport = row[iPassport];
  const destination = row[iDest];
  const status = row[iStatus];
  const days = row[iDays];

  matrix[passport] ??= {};
  matrix[passport][destination] = days && days.length > 0 ? [status, Number(days)] : [status];

  metadata[`${passport}:${destination}`] = {
    notes: row[iNotes] || "",
    source_url: row[iUrl] || "",
    last_verified: row[iVerified] || "",
    confidence: row[iConfidence] || "unverified",
  };
}

fs.writeFileSync("./data/passport_matrix.json", JSON.stringify(matrix, null, 2));
fs.writeFileSync("./generated/route-metadata.json", JSON.stringify(metadata, null, 2));

console.log("✓ passport_matrix.json generated");
console.log("✓ route-metadata.json generated");

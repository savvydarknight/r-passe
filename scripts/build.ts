import fs from "fs";

const csv = fs.readFileSync("./data/master.csv", "utf8");

const rows = csv.trim().split("\n").slice(1);

const matrix: Record<string, Record<string, any>> = {};
const metadata: Record<string, { source_url: string; last_verified: string; confidence: string }> = {};

for (const row of rows) {
const [passport, destination, status, days, sourceUrl, lastVerified, confidence] = row.split(",");

matrix[passport] ??= {};

matrix[passport][destination] =
days && days.length > 0
? [status, Number(days)]
: [status];

metadata[`${passport}:${destination}`] = {
  source_url: sourceUrl || "",
  last_verified: lastVerified || "",
  confidence: confidence || "unverified",
};
}

fs.writeFileSync(
"./data/passport_matrix.json",
JSON.stringify(matrix, null, 2)
);

fs.writeFileSync(
"./generated/route-metadata.json",
JSON.stringify(metadata, null, 2)
);

console.log("✓ passport_matrix.json generated");
console.log("✓ route-metadata.json generated");

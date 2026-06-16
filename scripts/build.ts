import fs from "fs";

const csv = fs.readFileSync("./data/master.csv", "utf8");

const rows = csv.trim().split("\n").slice(1);

const matrix: Record<string, Record<string, any>> = {};

for (const row of rows) {
const [passport, destination, status, days] = row.split(",");

matrix[passport] ??= {};

matrix[passport][destination] =
days && days.length > 0
? [status, Number(days)]
: [status];
}

fs.writeFileSync(
"./data/passport_matrix.json",
JSON.stringify(matrix, null, 2)
);

console.log("✓ passport_matrix.json generated");

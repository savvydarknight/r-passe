import fs from "fs";

const csv = fs.readFileSync("./data/master.csv", "utf8");

const lines = csv.trim().split("\n");

const header = lines[0];

if (header !== "passport,destination,status,days") {
throw new Error("Invalid CSV header");
}

const rows = lines.slice(1);

const validStatuses = new Set(["vf", "vo", "ev", "et", "vr"]);
const seen = new Set<string>();

for (const [index, row] of rows.entries()) {
const rowNumber = index + 2;

const [passport, destination, status, days] = row.split(",");

if (!passport || passport.length !== 2) {
throw new Error(`Invalid passport code at row ${rowNumber}`);
}

if (!destination || destination.length !== 2) {
throw new Error(`Invalid destination code at row ${rowNumber}`);
}

if (passport === destination) {
throw new Error(`Self-reference at row ${rowNumber}`);
}

if (!validStatuses.has(status)) {
throw new Error(`Invalid status at row ${rowNumber}`);
}

if (days && Number.isNaN(Number(days))) {
throw new Error(`Invalid days value at row ${rowNumber}`);
}

const key = `${passport}:${destination}`;

if (seen.has(key)) {
throw new Error(`Duplicate route ${key} at row ${rowNumber}`);
}

seen.add(key);
}

console.log("✓ Validation passed");

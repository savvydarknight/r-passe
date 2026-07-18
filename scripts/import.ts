import fs from "fs";
import path from "path";
import { CODE_MAP } from "./code-map.ts";
import { NAME_MAP } from "./name-map.ts";
import { parseCSV, csvField } from "./csv.ts";

const R_DATA_DIR = process.env.R_DATA_DIR ?? "../r-data";

function parseDays(allowedStay: string): string {
  const s = allowedStay.toLowerCase();
  const num = s.match(/\d+/);
  if (!num) return "";
  const n = parseInt(num[0], 10);
  if (s.includes("year")) return String(n * 365);
  if (s.includes("month")) return String(n * 30);
  return String(n);
}

function cleanNotes(notes: string): string {
  return notes.replace(/\[\d+\]/g, "").trim();
}

function mapStatus(requirement: string, requirementRaw: string): string | null {
  if (requirement === "visa_free") return "vf";
  if (requirement === "visa_on_arrival") return "vo";
  if (requirement === "visa_required") return "vr";
  if (requirement === "no_admission") return "vr";
  if (requirement === "eta_evisa") {
    const raw = requirementRaw.toLowerCase();
    if (/\beta\b|electronic travel/.test(raw)) return "et";
    return "ev";
  }
  return null;
}

type MasterRow = {
  passport: string;
  destination: string;
  status: string;
  days: string;
  notes: string;
  source_url: string;
  last_verified: string;
  confidence: string;
};

function main() {
  const visaPath = path.join(R_DATA_DIR, "visa_requirements.csv");
  const rawText = fs.readFileSync(visaPath, "utf8");
  const rows = parseCSV(rawText);
  const header = rows[0];
  const dataRows = rows.slice(1);

  const idx = (name: string) => header.indexOf(name);
  const iPassport = idx("passport_code");
  const iDest = idx("destination_name");
  const iReq = idx("requirement");
  const iReqRaw = idx("requirement_raw");
  const iStay = idx("allowed_stay");
  const iNotes = idx("notes");
  const iUrl = idx("source_url");

  const seen = new Set<string>();
  const out: MasterRow[] = [];
  let skippedUnmapped = 0;
  let skippedUnknown = 0;
  let skippedDuplicate = 0;

  for (const r of dataRows) {
    if (r.length < header.length) continue;

    const rawPassport = r[iPassport];
    const rawDest = r[iDest];
    const requirement = r[iReq];
    const requirementRaw = r[iReqRaw];
    const allowedStay = r[iStay];
    const notes = r[iNotes];
    const sourceUrl = r[iUrl];

    const passport = CODE_MAP[rawPassport];
    const destination = NAME_MAP[rawDest];

    if (!passport || !destination) {
      skippedUnmapped++;
      continue;
    }

    const status = mapStatus(requirement, requirementRaw);
    if (!status) {
      skippedUnknown++;
      continue;
    }

    const key = `${passport}:${destination}`;
    if (seen.has(key)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(key);

    out.push({
      passport,
      destination,
      status,
      days: parseDays(allowedStay),
      notes: cleanNotes(notes),
      source_url: sourceUrl,
      last_verified: "",
      confidence: "unverified",
    });
  }

  out.sort((a, b) =>
    a.passport === b.passport
      ? a.destination.localeCompare(b.destination)
      : a.passport.localeCompare(b.passport)
  );

  const lines = ["passport,destination,status,days,notes,source_url,last_verified,confidence"];
  for (const row of out) {
    lines.push(
      [
        row.passport,
        row.destination,
        row.status,
        row.days,
        csvField(row.notes),
        csvField(row.source_url),
        row.last_verified,
        row.confidence,
      ].join(",")
    );
  }

  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync("./data/master.csv", lines.join("\n") + "\n");

  console.log(`✓ master.csv written: ${out.length} rows`);
  console.log(`  skipped (unmapped code): ${skippedUnmapped}`);
  console.log(`  skipped (unknown/unclassified requirement): ${skippedUnknown}`);
  console.log(`  skipped (duplicate route): ${skippedDuplicate}`);
}

main();

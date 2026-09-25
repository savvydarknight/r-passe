import fs from "fs";
import path from "path";
import { CODE_MAP } from "./code-map.ts";
import { NAME_MAP } from "./name-map.ts";
import { parseCSV, csvField } from "./csv.ts";
import { log, group } from "./log.ts";
import { USE_OFFICIAL_POLICY } from "./constants.ts";

const R_DATA_DIR = process.env.R_DATA_DIR ?? "../r-data";

const { codes: territoryCodes } = JSON.parse(
  fs.readFileSync("./data/territories.json", "utf8")
);
const territories = new Set<string>(territoryCodes);

const NAME_MAP_CI: Record<string, string> = {};
for (const [name, code] of Object.entries(NAME_MAP)) {
  NAME_MAP_CI[name.toLowerCase()] = code;
}
function resolveName(name: string): string | undefined {
  return NAME_MAP[name] ?? NAME_MAP_CI[name.trim().toLowerCase()];
}

function firstStaySegment(allowedStay: string): string {
  const parts = allowedStay.split(/\s+or\s+|\s*\/\s*/i).map((s) => s.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean);
  return parts[0] || allowedStay.trim();
}

function hasStayAlternative(allowedStay: string): boolean {
  return allowedStay.split(/\s+or\s+|\s*\/\s*/i).map((s) => s.trim()).filter(Boolean).length > 1;
}

function parseDays(allowedStay: string): string {
  const s = firstStaySegment(allowedStay).toLowerCase();
  const num = s.match(/\d+/);
  if (!num) return "";
  const n = parseInt(num[0], 10);
  if (s.includes("year")) return String(n * 365);
  if (s.includes("month")) return String(n * 30);
  return String(n);
}

function stayDisplay(allowedStay: string): string {
  const first = firstStaySegment(allowedStay);
  if (hasStayAlternative(allowedStay)) return first;
  return /\d/.test(first) ? "" : first;
}

function stayAlternativeNote(allowedStay: string): string {
  return hasStayAlternative(allowedStay) ? allowedStay.replace(/\[[^\]]*\]/g, "").trim() : "";
}

function cleanNotes(notes: string): string {
  return notes.trim();
}

function classifySegmentLabel(text: string): string | null {
  const t = text.toLowerCase();
  if (/not required|freedom of movement(?!.{0,60}\bpermit)|right of abode|free visa(?!\s*on\s*arrival)|visa waiver|id card valid|visa free/.test(t)) return "Visa not required";
  if (/eta\b|electronic(al)?\s*travel/.test(t)) return "ETA";
  if (/visa on arr\w*|voa\b|visitor[’']?s?\s*permit|permit on arrival/.test(t)) return "Visa on arrival";
  if (/evisa|e-visa|electronic\s*visa|electronic\s*authorization|electronic\s*entry|evisitor|e600\b|esta\b|electronic border|online visa|e-tourist card|e\s*tourist\s*card|\bease\b|mainland travel permit/.test(t)) return "eVisa";
  if (/visa required|vesa required|visa de facto required|tourist card required|permission required|invitation required|special permit required|travel certificate required|affidavit of identity required/.test(t)) return "Visa required";
  if (/admission refused/.test(t)) return "Admission refused";
  if (/admission restrict\w*|travel restrict\w*|travel banned|travel prohibited|visa restrict\w*|suspended|passport not recognized|particular visit regime/.test(t)) return "Admission restricted";
  return null;
}

function extractAllMethods(requirementRaw: string): string[] {
  const segments = requirementRaw
    .split(/\/|\bor\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length < 2) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    const label = classifySegmentLabel(seg);
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.length > 1 ? labels : [];
}

const STATUS_TO_LABEL: Record<string, string> = {
  vf: "Visa not required",
  et: "ETA",
  vo: "Visa on arrival",
  ev: "eVisa",
  vr: "Visa required",
  ar: "Admission refused",
};

function buildNotes(notes: string, requirementRaw: string, primaryStatus: string): string {
  const cleaned = cleanNotes(notes);
  const methods = extractAllMethods(requirementRaw);
  const primaryLabel = STATUS_TO_LABEL[primaryStatus];
  const additional = methods.filter((m) => m !== primaryLabel);
  if (additional.length === 0) return cleaned;
  const methodLines = [
    `Also available via ${additional.length > 1 ? "these methods" : "this method"}:`,
    ...additional.map((m) => `- ${m}`),
  ].join("\n");
  return cleaned ? `${methodLines}\n\n${cleaned}` : methodLines;
}

function joinNotes(methodNotes: string, notes: string): string {
  const method = methodNotes.trim();
  const cleaned = cleanNotes(notes);
  if (method && cleaned) return `${method}\n\n${cleaned}`;
  return method || cleaned;
}

function normalizeReciprocity(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (["✓", "✔️", "✔", "yes", "y"].includes(v)) return "Yes";
  if (["x", "✗", "✘", "no", "n"].includes(v)) return "No";
  return "";
}

function mapStatus(requirement: string, requirementRaw: string): string | null {
  if (requirement === "visa_free") return "vf";
  if (requirement === "eta") return "et";
  if (requirement === "visa_on_arrival") return "vo";
  if (requirement === "evisa") return "ev";
  if (requirement === "visa_required") return "vr";
  if (requirement === "admission_refused") return "ar";
  if (requirement === "no_admission") return /admission refused/i.test(requirementRaw) ? "ar" : "vr";
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
  reciprocity: string;
  footnote_ids: string;
  display: string;
  stay_display: string;
  travel_advisory: string;
};

function main() {
  const visaPath = path.join(R_DATA_DIR, "visa_requirements.csv");
  log(`reading ${visaPath}`);
  const rawText = fs.readFileSync(visaPath, "utf8");
  const rows = parseCSV(rawText);
  const header = rows[0];
  const dataRows = rows.slice(1);
  log(`parsed ${dataRows.length} data rows, header=${JSON.stringify(header)}`);

  const idx = (name: string) => header.indexOf(name);
  const iPassport = idx("passport_code");
  const iDest = idx("destination_name");
  const iReq = idx("requirement");
  const iReqRaw = idx("requirement_raw");
  const iStay = idx("allowed_stay");
  const iNotes = idx("notes");
  const iUrl = idx("source_url");
  const iReciprocity = idx("reciprocity");
  const iFootnoteIds = idx("footnote_ids");
  const iStayPrimary = idx("stay_primary");
  const iMethodNotes = idx("method_notes");
  const iDisplayOverride = idx("display_override");
  const iTravelAdvisory = idx("travel_advisory");
  log(`column indices: passport_code=${iPassport} destination_name=${iDest} requirement=${iReq} requirement_raw=${iReqRaw} allowed_stay=${iStay} notes=${iNotes} source_url=${iUrl} reciprocity=${iReciprocity}`);

  const seen = new Set<string>();
  const out: MasterRow[] = [];
  let skippedUnmapped = 0;
  let skippedUnknown = 0;
  let skippedDuplicate = 0;
  let skippedTerritoryPassport = 0;

  group("import: wikipedia pass", () => {
    for (const [i, r] of dataRows.entries()) {
      if (r.length < header.length) {
        log(`row ${i + 2}: skipped, ${r.length} fields < ${header.length} expected`);
        continue;
      }

      const rawPassport = r[iPassport];
      const rawDest = r[iDest];
      const requirement = r[iReq];
      const requirementRaw = r[iReqRaw];
      const allowedStay = r[iStay];
      const notes = r[iNotes];
      const sourceUrl = r[iUrl];
      const reciprocity = iReciprocity >= 0 ? normalizeReciprocity(r[iReciprocity] || "") : "";
      const footnoteIds = iFootnoteIds >= 0 ? r[iFootnoteIds] || "" : "";

      const passport = CODE_MAP[rawPassport];
      const destination = resolveName(rawDest);

      if (!passport || !destination) {
        skippedUnmapped++;
        log(`row ${i + 2}: skipped (unmapped) rawPassport='${rawPassport}'->${passport} rawDest='${rawDest}'->${destination}`);
        continue;
      }

      if (territories.has(passport)) {
        skippedTerritoryPassport++;
        log(`row ${i + 2}: skipped (territory as passport) ${passport}:${destination}`);
        continue;
      }

      const status = mapStatus(requirement, requirementRaw);
      if (!status) {
        skippedUnknown++;
        log(`row ${i + 2}: skipped (unknown requirement) requirement='${requirement}' requirement_raw='${requirementRaw}'`);
        continue;
      }

      const key = `${passport}:${destination}`;
      if (seen.has(key)) {
        skippedDuplicate++;
        log(`row ${i + 2}: skipped (duplicate) key=${key}`);
        continue;
      }
      seen.add(key);

      log(`row ${i + 2}: accepted ${key} status=${status} days_raw='${allowedStay}' notes='${notes}' source_url='${sourceUrl}' reciprocity='${reciprocity}'`);
      const stayText = iStayPrimary >= 0 ? r[iStayPrimary] || "" : allowedStay;
      const methodText = [r[iMethodNotes] || "", stayAlternativeNote(stayText)].filter(Boolean).join("\n");
      out.push({
        passport,
        destination,
        status,
        days: parseDays(stayText),
        stay_display: stayDisplay(stayText),
        notes: iMethodNotes >= 0 ? joinNotes(methodText, notes) : buildNotes(notes, requirementRaw, status),
        source_url: sourceUrl,
        last_verified: "",
        confidence: "unverified",
        reciprocity: reciprocity || "",
        footnote_ids: footnoteIds,
        display: iDisplayOverride >= 0 ? r[iDisplayOverride] || "" : "",
        travel_advisory: iTravelAdvisory >= 0 ? r[iTravelAdvisory] || "" : "",
      });
    }
    log(`wikipedia pass done: ${out.length} accepted, ${skippedUnmapped} unmapped, ${skippedUnknown} unknown, ${skippedDuplicate} duplicate`);
  });

  let backfilled = 0;
  const policyPath = path.join(R_DATA_DIR, "destination_policy.csv");
  group("import: destination-policy backfill", () => {
    if (!USE_OFFICIAL_POLICY) {
      log("official policy backfill disabled, skipping");
      return;
    }
    log(`checking for ${policyPath}`);
    if (!fs.existsSync(policyPath)) {
      log(`${policyPath} does not exist, skipping backfill`);
      return;
    }
    const policyRows = parseCSV(fs.readFileSync(policyPath, "utf8"));
    const pHeader = policyRows[0];
    const pIdx = (name: string) => pHeader.indexOf(name);
    const iPDest = pIdx("destination_name");
    const iPSource = pIdx("source_country_name");
    const iPReq = pIdx("requirement");
    const iPReqRaw = pIdx("requirement_raw");
    const iPStay = pIdx("allowed_stay");
    const iPNotes = pIdx("notes");
    const iPUrl = pIdx("source_url");
    log(`parsed ${policyRows.length - 1} policy rows, header=${JSON.stringify(pHeader)}`);

    for (const [i, r] of policyRows.slice(1).entries()) {
      if (r.length < pHeader.length) {
        log(`policy row ${i + 2}: skipped, ${r.length} fields < ${pHeader.length} expected`);
        continue;
      }

      const passport = resolveName(r[iPSource]);
      const destination = resolveName(r[iPDest]);
      if (!passport || !destination) {
        log(`policy row ${i + 2}: skipped (unmapped) source='${r[iPSource]}'->${passport} dest='${r[iPDest]}'->${destination}`);
        continue;
      }

      if (territories.has(passport)) {
        skippedTerritoryPassport++;
        log(`policy row ${i + 2}: skipped (territory as passport) ${passport}:${destination}`);
        continue;
      }

      const key = `${passport}:${destination}`;
      if (seen.has(key)) {
        log(`policy row ${i + 2}: skipped, ${key} already seen from wikipedia pass`);
        continue;
      }

      const status = mapStatus(r[iPReq], r[iPReqRaw]);
      if (!status) {
        log(`policy row ${i + 2}: skipped (unknown requirement) requirement='${r[iPReq]}'`);
        continue;
      }

      seen.add(key);
      backfilled++;
      log(`policy row ${i + 2}: backfilled ${key} status=${status} source_url='${r[iPUrl]}'`);
      out.push({
        passport,
        destination,
        status,
        days: parseDays(r[iPStay]),
        stay_display: stayDisplay(r[iPStay]),
        travel_advisory: "",
        notes: cleanNotes(r[iPNotes]),
        source_url: r[iPUrl],
        last_verified: "",
        confidence: "unverified",
        reciprocity: "",
        footnote_ids: "",
        display: "",
      });
    }
    log(`backfill done: ${backfilled} rows added`);
  });

  group("import: sort and write master.csv", () => {
    out.sort((a, b) =>
      a.passport === b.passport
        ? a.destination.localeCompare(b.destination)
        : a.passport.localeCompare(b.passport)
    );
    log(`sorted ${out.length} rows`);

    const lines = ["passport,destination,status,days,notes,source_url,last_verified,confidence,reciprocity,footnote_ids,display,stay_display,travel_advisory"];
    for (const [i, row] of out.entries()) {
      log(`writing row ${i + 1}/${out.length}: ${JSON.stringify(row)}`);
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
          csvField(row.reciprocity),
          csvField(row.footnote_ids),
          csvField(row.display),
          csvField(row.stay_display),
          csvField(row.travel_advisory),
        ].join(",")
      );
    }

    fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync("./data/master.csv", lines.join("\n") + "\n");
    log(`wrote ./data/master.csv, ${lines.length - 1} data lines`);
  });

  console.log(`✓ master.csv written: ${out.length} rows`);
  console.log(`  skipped (unmapped code): ${skippedUnmapped}`);
  console.log(`  skipped (territory as passport): ${skippedTerritoryPassport}`);
  console.log(`  skipped (unknown/unclassified requirement): ${skippedUnknown}`);
  console.log(`  skipped (duplicate route): ${skippedDuplicate}`);
  console.log(`  backfilled from destination-policy (official sources): ${backfilled}`);
}

main();

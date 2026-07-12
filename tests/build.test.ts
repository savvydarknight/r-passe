import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

describe("build", () => {
  const matrixPath = "./data/passport_matrix.json";
  const rankingsPath = "./generated/rankings.json";
  const scoresPath = "./generated/scores.json";
  const visaFreeCountsPath = "./generated/visa-free-counts.json";

  it("passport_matrix.json exists and is valid JSON", () => {
    assert.ok(fs.existsSync(matrixPath), "passport_matrix.json missing");
    const raw = fs.readFileSync(matrixPath, "utf8");
    const matrix = JSON.parse(raw);
    assert.equal(typeof matrix, "object");
    assert.ok(Object.keys(matrix).length > 0, "matrix is empty");
  });

  it("matrix has expected passport count", () => {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const count = Object.keys(matrix).length;
    // Range covers ~195 sovereign states plus passport-issuing territories
    // and SARs included in this dataset (e.g. Hong Kong, Macau, Bermuda,
    // Cayman Islands, American Samoa). Update if the dataset's scope changes.
    assert.ok(count >= 190 && count <= 235, `Unexpected passport count: ${count}`);
  });

  it("each passport entry is a non-empty object", () => {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    for (const [passport, destinations] of Object.entries(matrix)) {
      assert.ok(
        typeof destinations === "object" && Object.keys(destinations as object).length > 0,
        `Passport ${passport} has no destinations`
      );
    }
  });

  it("all statuses in matrix are valid", () => {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const valid = new Set(["vf", "vo", "ev", "et", "vr"]);
    for (const [passport, destinations] of Object.entries(matrix)) {
      for (const [dest, value] of Object.entries(destinations as object)) {
        const [status] = value as string[];
        assert.ok(valid.has(status), `Invalid status '${status}' for ${passport} → ${dest}`);
      }
    }
  });

  it("rankings.json is sorted descending by score", () => {
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, "utf8"));
    assert.ok(rankings.length > 0, "rankings is empty");
    for (let i = 1; i < rankings.length; i++) {
      assert.ok(
        rankings[i].score <= rankings[i - 1].score,
        `Rankings not sorted at position ${i + 1}`
      );
    }
  });

  it("scores and visa-free-counts cover all passports", () => {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const scores = JSON.parse(fs.readFileSync(scoresPath, "utf8"));
    const vfc = JSON.parse(fs.readFileSync(visaFreeCountsPath, "utf8"));
    for (const passport of Object.keys(matrix)) {
      assert.ok(passport in scores, `Missing score for ${passport}`);
      assert.ok(passport in vfc, `Missing visa-free count for ${passport}`);
    }
  });

  it("no passport has a negative score", () => {
    const scores = JSON.parse(fs.readFileSync(scoresPath, "utf8"));
    for (const [passport, score] of Object.entries(scores)) {
      assert.ok((score as number) >= 0, `Negative score for ${passport}`);
    }
  });

  it("route-metadata.json exists and covers every matrix route", () => {
    const metadataPath = "./generated/route-metadata.json";
    assert.ok(fs.existsSync(metadataPath), "route-metadata.json missing");

    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    for (const [passport, destinations] of Object.entries(matrix)) {
      for (const destination of Object.keys(destinations as object)) {
        const key = `${passport}:${destination}`;
        assert.ok(key in metadata, `Missing metadata for route ${key}`);
      }
    }
  });

  it("every route-metadata entry has a valid confidence value", () => {
    const metadata = JSON.parse(fs.readFileSync("./generated/route-metadata.json", "utf8"));
    const valid = new Set(["unverified", "verified", "disputed"]);
    for (const [key, entry] of Object.entries(metadata) as [string, any][]) {
      assert.ok(valid.has(entry.confidence), `Invalid confidence for ${key}: ${entry.confidence}`);
    }
  });
});

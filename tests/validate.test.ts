import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

describe("validate", () => {
  const csvPath = "./data/master.csv";
  const countriesPath = "./data/countries.json";

  it("master.csv exists", () => {
    assert.ok(fs.existsSync(csvPath), "master.csv missing");
  });

  it("header is correct", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
    assert.equal(lines[0], "passport,destination,status,days,source_url,last_verified,confidence");
  });

  it("has rows beyond the header", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
    assert.ok(lines.length > 1, "CSV has no data rows");
  });

  it("all codes are 2 characters", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    for (const [i, line] of lines.entries()) {
      const [passport, destination] = line.split(",");
      assert.equal(passport.length, 2, `Bad passport at row ${i + 2}: '${passport}'`);
      assert.equal(destination.length, 2, `Bad destination at row ${i + 2}: '${destination}'`);
    }
  });

  it("no self-references", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    for (const [i, line] of lines.entries()) {
      const [passport, destination] = line.split(",");
      assert.notEqual(passport, destination, `Self-reference at row ${i + 2}: ${passport}`);
    }
  });

  it("all statuses are valid", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    const valid = new Set(["vf", "vo", "ev", "et", "vr"]);
    for (const [i, line] of lines.entries()) {
      const [, , status] = line.split(",");
      assert.ok(valid.has(status), `Invalid status '${status}' at row ${i + 2}`);
    }
  });

  it("no duplicate routes", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    const seen = new Set<string>();
    for (const [i, line] of lines.entries()) {
      const [passport, destination] = line.split(",");
      const key = `${passport}:${destination}`;
      assert.ok(!seen.has(key), `Duplicate route ${key} at row ${i + 2}`);
      seen.add(key);
    }
  });

  it("all codes exist in countries.json", () => {
    const countries = JSON.parse(fs.readFileSync(countriesPath, "utf8"));
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    for (const [i, line] of lines.entries()) {
      const [passport, destination] = line.split(",");
      assert.ok(countries[passport], `Unknown passport '${passport}' at row ${i + 2}`);
      assert.ok(countries[destination], `Unknown destination '${destination}' at row ${i + 2}`);
    }
  });

  it("days field is numeric when present", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    for (const [i, line] of lines.entries()) {
      const [, , , days] = line.split(",");
      if (days && days.trim() !== "") {
        assert.ok(!Number.isNaN(Number(days)), `Invalid days '${days}' at row ${i + 2}`);
      }
    }
  });

  it("confidence is a valid value on every row", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    const valid = new Set(["unverified", "verified", "disputed"]);
    for (const [i, line] of lines.entries()) {
      const [, , , , , , confidence] = line.split(",");
      assert.ok(valid.has(confidence), `Invalid confidence '${confidence}' at row ${i + 2}`);
    }
  });

  it("last_verified is YYYY-MM-DD when present", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const [i, line] of lines.entries()) {
      const [, , , , , lastVerified] = line.split(",");
      if (lastVerified && lastVerified.trim() !== "") {
        assert.ok(dateRe.test(lastVerified), `Invalid last_verified '${lastVerified}' at row ${i + 2}`);
      }
    }
  });

  it("source_url is http(s) when present", () => {
    const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
    for (const [i, line] of lines.entries()) {
      const [, , , , sourceUrl] = line.split(",");
      if (sourceUrl && sourceUrl.trim() !== "") {
        assert.ok(/^https?:\/\//.test(sourceUrl), `Invalid source_url '${sourceUrl}' at row ${i + 2}`);
      }
    }
  });
});

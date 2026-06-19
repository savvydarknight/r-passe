#!/usr/bin/env python3
"""
Remove dependent territories entirely from data/master.csv.

Territories (Bermuda, Gibraltar, Puerto Rico, etc. — see data/territories.json)
are stripped out both as a `passport` and as a `destination`, so the CSV only
contains sovereign-to-sovereign routes. Run from the repo root:

    python3 scripts/strip_territories.py
"""
import csv
import json

CSV_PATH = "data/master.csv"
TERRITORIES_PATH = "data/territories.json"

with open(TERRITORIES_PATH) as f:
    territories = set(json.load(f)["codes"])

with open(CSV_PATH, newline="") as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

before = len(rows)
kept = [
    row for row in rows
    if row[0] not in territories and row[1] not in territories
]
removed = before - len(kept)

with open(CSV_PATH, "w", newline="\n") as f:
    writer = csv.writer(f, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(kept)

print(f"✓ Removed {removed} territory rows ({before} -> {len(kept)})")

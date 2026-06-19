#!/usr/bin/env python3
"""
Remove dependent territories from data/countries.json, mirroring
scripts/strip_territories.py's treatment of master.csv.

Run from the repo root:
    python3 scripts/strip_countries_territories.py
"""
import json

COUNTRIES_PATH = "data/countries.json"
TERRITORIES_PATH = "data/territories.json"

with open(TERRITORIES_PATH) as f:
    territories = set(json.load(f)["codes"])

with open(COUNTRIES_PATH) as f:
    countries = json.load(f)

before = len(countries)
kept = {code: name for code, name in countries.items() if code not in territories}
removed = before - len(kept)

with open(COUNTRIES_PATH, "w") as f:
    json.dump(kept, f, indent=2, ensure_ascii=False, sort_keys=True)
    f.write("\n")

print(f"✓ Removed {removed} territory entries ({before} -> {len(kept)})")

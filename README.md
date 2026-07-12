# Passport Index

Lightweight passport mobility dataset.

* Simple
* Fast

```csv
passport,destination,status,days,source_url,last_verified,confidence
KE,SG,vf,30,,,unverified
KE,US,vr,,,,unverified
```

## Status Codes

```text
vf = Visa Free
vo = Visa on Arrival
ev = eVisa
et = ETA
vr = Visa Required
```

## Build Flow

```text
master.csv
    ↓
validate.ts   ← checks codes against countries.json
    ↓
build.ts
    ↓
passport_matrix.json
    ↓
stats.ts
    ↓
generated/*
    ↓
check.ts      ← post-build integrity check
    ↓
changelog.ts  ← appends entry to CHANGELOG.md
```

## Editing Data

Use the edit CLI to add, update, or remove routes:

```bash
npm run edit -- add KE US vf 90       # add or update a route
npm run edit -- add KE US vf 90 --source=https://travel.state.gov --verified=2026-07-12 --confidence=verified
npm run edit -- remove KE US          # remove a route
npm run edit -- lookup KE SG          # check a single route
npm run edit -- passport KE           # all routes for a passport
npm run edit -- destination US        # all passports for a destination
```

After editing, run `npm run generate` to rebuild.

## CLI

The CLI lets you query passport and visa data directly from your terminal.

### 1. Install Go

Download and install Go from https://go.dev/dl — available for Windows, macOS, and Linux. Follow the installer, then verify:

```bash
go version
```

### 2. Get the repo

```bash
git clone https://github.com/cictehro/passport-index.git
cd passport-index
```

### 3. Build the CLI

```bash
go build -o passport-cli ./cmd/passport-cli
```

On Windows this produces `passport-cli.exe` automatically.

### 4. Use it

```bash
./passport-cli lookup KE SG           # Kenya → Singapore visa status
./passport-cli passport KE            # all destinations for Kenya
./passport-cli destination US         # all passports and their US visa status
./passport-cli rank KE                # Kenya rank, score, and visa-free count
./passport-cli top 10                 # top 10 ranked passports
```

On Windows, replace `./passport-cli` with `passport-cli.exe`:

```cmd
passport-cli.exe lookup KE SG
```

> The CLI reads from `data/` and `generated/` so it must be run from the repo root.

## Tech Stack

* CSV → source data
* JSON → output
* TypeScript → build tools
* Go → CLI



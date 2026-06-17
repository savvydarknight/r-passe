# Passport Index

Lightweight passport mobility dataset.

## Goals

* Simple
* Fast
* Easy to update
* Minimal duplication

## Structure

```text
passport-index/
├── data/
│   ├── countries.json
│   ├── master.csv
│   └── passport_matrix.json
│
├── generated/
│   ├── rankings.json
│   ├── scores.json
│   └── visa-free-counts.json
│
├── scripts/
│   ├── build.ts
│   ├── changelog.ts
│   ├── check.ts
│   ├── edit.ts
│   ├── stats.ts
│   └── validate.ts
│
├── tests/
│   ├── build.test.ts
│   └── validate.test.ts
│
├── cmd/
│   └── passport-cli/
│       └── main.go
│
├── internal/
│   ├── lookup/
│   ├── ranking/
│   └── export/
│
├── docs/
│   ├── schema.md
│   ├── status-codes.md
│   └── methodology.md
│
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── go.mod
└── README.md
```

## Source of Truth

`data/master.csv`

```csv
passport,destination,status,days
KE,SG,vf,30
KE,US,vr,
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

## Principles

* Edit one file.
* Generate everything else.
* Keep data portable.
* Keep the repo small.

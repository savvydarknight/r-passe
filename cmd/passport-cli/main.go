package main

import (
	"fmt"
	"os"

	"github.com/cictehro/passport-index/internal/lookup"
	"github.com/cictehro/passport-index/internal/ranking"
)

const usage = `passport-cli — Passport mobility lookup

Usage:
  passport-cli lookup <passport> <destination>   Check visa status between two countries
  passport-cli passport <code>                   Show all destinations for a passport
  passport-cli destination <code>                Show all passports for a destination
  passport-cli rank <code>                       Show rank and mobility score for a passport
  passport-cli top [n]                           Show top N ranked passports (default: 10)

Examples:
  passport-cli lookup KE SG
  passport-cli passport KE
  passport-cli destination US
  passport-cli rank KE
  passport-cli top 5

Status codes:
  vf = Visa Free
  et = ETA
  vo = Visa on Arrival
  ev = eVisa
  vr = Visa Required
  ar = Admission Refused
`

func main() {
	if len(os.Args) < 2 {
		fmt.Print(usage)
		os.Exit(0)
	}

	db, err := lookup.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: could not load data: %v\n", err)
		fmt.Fprintf(os.Stderr, "make sure you run this from the repo root after running: npm run generate\n")
		os.Exit(1)
	}

	switch os.Args[1] {

	case "lookup":
		if len(os.Args) < 4 {
			fmt.Fprintln(os.Stderr, "usage: passport-cli lookup <passport> <destination>")
			os.Exit(1)
		}
		passport := os.Args[2]
		destination := os.Args[3]
		result := db.Lookup(passport, destination)
		fmt.Println(result)

	case "passport":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: passport-cli passport <code>")
			os.Exit(1)
		}
		db.ShowPassport(os.Args[2])

	case "destination":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: passport-cli destination <code>")
			os.Exit(1)
		}
		db.ShowDestination(os.Args[2])

	case "rank":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: passport-cli rank <code>")
			os.Exit(1)
		}
		ranking.ShowRank(os.Args[2])

	case "top":
		n := 10
		if len(os.Args) >= 3 {
			fmt.Sscanf(os.Args[2], "%d", &n)
		}
		ranking.ShowTop(n)

	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", os.Args[1])
		fmt.Print(usage)
		os.Exit(1)
	}
}

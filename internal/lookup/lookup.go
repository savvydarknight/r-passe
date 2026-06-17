package lookup

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// Matrix structure: passport -> destination -> [status, ?days]
type Matrix map[string]map[string][]interface{}

type Countries map[string]string

type DB struct {
	Matrix    Matrix
	Countries Countries
}

var statusLabels = map[string]string{
	"vf": "Visa Free",
	"vo": "Visa on Arrival",
	"ev": "eVisa",
	"et": "ETA",
	"vr": "Visa Required",
}

var statusOrder = []string{"vf", "vo", "ev", "et", "vr"}

func Load() (*DB, error) {
	matrixData, err := os.ReadFile("./data/passport_matrix.json")
	if err != nil {
		return nil, fmt.Errorf("passport_matrix.json: %w", err)
	}

	countriesData, err := os.ReadFile("./data/countries.json")
	if err != nil {
		return nil, fmt.Errorf("countries.json: %w", err)
	}

	var matrix Matrix
	if err := json.Unmarshal(matrixData, &matrix); err != nil {
		return nil, fmt.Errorf("parsing matrix: %w", err)
	}

	var countries Countries
	if err := json.Unmarshal(countriesData, &countries); err != nil {
		return nil, fmt.Errorf("parsing countries: %w", err)
	}

	return &DB{Matrix: matrix, Countries: countries}, nil
}

func (db *DB) countryName(code string) string {
	code = strings.ToUpper(code)
	if name, ok := db.Countries[code]; ok {
		return name
	}
	return code
}

func (db *DB) Lookup(passport, destination string) string {
	passport = strings.ToUpper(passport)
	destination = strings.ToUpper(destination)

	pName := db.countryName(passport)
	dName := db.countryName(destination)

	destinations, ok := db.Matrix[passport]
	if !ok {
		return fmt.Sprintf("✗ Unknown passport: %s", passport)
	}

	entry, ok := destinations[destination]
	if !ok {
		return fmt.Sprintf("No data for %s → %s", pName, dName)
	}

	status := ""
	if len(entry) > 0 {
		status, _ = entry[0].(string)
	}

	label := statusLabels[status]
	if label == "" {
		label = status
	}

	days := ""
	if len(entry) > 1 {
		if d, ok := entry[1].(float64); ok && d > 0 {
			days = fmt.Sprintf(" · %d days", int(d))
		}
	}

	return fmt.Sprintf("%s → %s: %s%s", pName, dName, label, days)
}

func (db *DB) ShowPassport(code string) {
	code = strings.ToUpper(code)
	name := db.countryName(code)

	destinations, ok := db.Matrix[code]
	if !ok {
		fmt.Fprintf(os.Stderr, "✗ Unknown passport: %s\n", code)
		os.Exit(1)
	}

	// Group by status
	grouped := map[string][]string{}
	for dest, entry := range destinations {
		if len(entry) > 0 {
			status, _ := entry[0].(string)
			grouped[status] = append(grouped[status], db.countryName(dest))
		}
	}

	fmt.Printf("\n%s passport (%d destinations)\n", name, len(destinations))
	fmt.Println(strings.Repeat("─", 40))

	for _, status := range statusOrder {
		dests := grouped[status]
		if len(dests) == 0 {
			continue
		}
		sortStrings(dests)
		fmt.Printf("\n%s (%d)\n", statusLabels[status], len(dests))
		for _, d := range dests {
			fmt.Printf("  %s\n", d)
		}
	}
	fmt.Println()
}

func (db *DB) ShowDestination(code string) {
	code = strings.ToUpper(code)
	name := db.countryName(code)

	grouped := map[string][]string{}
	total := 0

	for passport, destinations := range db.Matrix {
		entry, ok := destinations[code]
		if !ok {
			continue
		}
		if len(entry) > 0 {
			status, _ := entry[0].(string)
			grouped[status] = append(grouped[status], db.countryName(passport))
			total++
		}
	}

	if total == 0 {
		fmt.Fprintf(os.Stderr, "✗ No data for destination: %s\n", code)
		os.Exit(1)
	}

	fmt.Printf("\n%s as destination (%d passports)\n", name, total)
	fmt.Println(strings.Repeat("─", 40))

	for _, status := range statusOrder {
		passports := grouped[status]
		if len(passports) == 0 {
			continue
		}
		sortStrings(passports)
		fmt.Printf("\n%s (%d)\n", statusLabels[status], len(passports))
		for _, p := range passports {
			fmt.Printf("  %s\n", p)
		}
	}
	fmt.Println()
}

// simple insertion sort for small slices
func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}

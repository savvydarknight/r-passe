package api

import (
	"encoding/json"
	"os"
	"sort"
	"strings"
)

type Matrix map[string]map[string][]interface{}
type Countries map[string]string

type RankEntry struct {
	Rank     int     `json:"rank"`
	Passport string  `json:"passport"`
	Score    float64 `json:"score"`
}

type DB struct {
	Matrix    Matrix
	Countries Countries
	Rankings  []RankEntry
	Scores    map[string]float64
	VFCounts  map[string]int
	RouteMeta map[string]RouteMeta
}

type RouteMeta struct {
	SourceURL    string `json:"source_url"`
	LastVerified string `json:"last_verified"`
	Confidence   string `json:"confidence"`
}

var StatusLabels = map[string]string{
	"vf": "Visa Free",
	"vo": "Visa on Arrival",
	"ev": "eVisa",
	"et": "ETA",
	"vr": "Visa Required",
}

var StatusOrder = []string{"vf", "vo", "ev", "et", "vr"}

func readJSON(path string, target interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

func Load() (*DB, error) {
	db := &DB{}

	if err := readJSON("./data/passport_matrix.json", &db.Matrix); err != nil {
		return nil, err
	}
	if err := readJSON("./data/countries.json", &db.Countries); err != nil {
		return nil, err
	}
	readJSON("./generated/rankings.json", &db.Rankings)
	readJSON("./generated/scores.json", &db.Scores)
	readJSON("./generated/visa-free-counts.json", &db.VFCounts)
	readJSON("./generated/route-metadata.json", &db.RouteMeta)

	return db, nil
}

func (db *DB) CountryName(code string) string {
	code = strings.ToUpper(code)
	if name, ok := db.Countries[code]; ok {
		return name
	}
	return code
}

type LookupResult struct {
	Passport     string `json:"passport"`
	PassportName string `json:"passport_name"`
	Destination  string `json:"destination"`
	DestName     string `json:"destination_name"`
	Status       string `json:"status"`
	StatusLabel  string `json:"status_label"`
	Days         int    `json:"days,omitempty"`
	Found        bool   `json:"found"`
	SourceURL    string `json:"source_url,omitempty"`
	LastVerified string `json:"last_verified,omitempty"`
	Confidence   string `json:"confidence,omitempty"`
}

func (db *DB) Lookup(passport, destination string) LookupResult {
	passport = strings.ToUpper(passport)
	destination = strings.ToUpper(destination)

	result := LookupResult{
		Passport:     passport,
		PassportName: db.CountryName(passport),
		Destination:  destination,
		DestName:     db.CountryName(destination),
	}

	destinations, ok := db.Matrix[passport]
	if !ok {
		return result
	}

	entry, ok := destinations[destination]
	if !ok {
		return result
	}

	result.Found = true
	if len(entry) > 0 {
		status, _ := entry[0].(string)
		result.Status = status
		result.StatusLabel = StatusLabels[status]
	}
	if len(entry) > 1 {
		if d, ok := entry[1].(float64); ok {
			result.Days = int(d)
		}
	}

	if meta, ok := db.RouteMeta[passport+":"+destination]; ok {
		result.SourceURL = meta.SourceURL
		result.LastVerified = meta.LastVerified
		result.Confidence = meta.Confidence
	}

	return result
}

type GroupedDest struct {
	Status      string   `json:"status"`
	StatusLabel string   `json:"status_label"`
	Countries   []string `json:"countries"`
}

func (db *DB) Passport(code string) (string, int, []GroupedDest, bool) {
	code = strings.ToUpper(code)
	destinations, ok := db.Matrix[code]
	if !ok {
		return "", 0, nil, false
	}

	grouped := map[string][]string{}
	for dest, entry := range destinations {
		if len(entry) > 0 {
			status, _ := entry[0].(string)
			grouped[status] = append(grouped[status], db.CountryName(dest))
		}
	}

	return db.CountryName(code), len(destinations), db.groupedList(grouped), true
}

func (db *DB) Destination(code string) (string, int, []GroupedDest, bool) {
	code = strings.ToUpper(code)
	grouped := map[string][]string{}
	total := 0

	for passport, destinations := range db.Matrix {
		entry, ok := destinations[code]
		if !ok {
			continue
		}
		if len(entry) > 0 {
			status, _ := entry[0].(string)
			grouped[status] = append(grouped[status], db.CountryName(passport))
			total++
		}
	}

	if total == 0 {
		return "", 0, nil, false
	}

	return db.CountryName(code), total, db.groupedList(grouped), true
}

func (db *DB) groupedList(grouped map[string][]string) []GroupedDest {
	list := []GroupedDest{}
	for _, status := range StatusOrder {
		countries := grouped[status]
		if len(countries) == 0 {
			continue
		}
		sort.Strings(countries)
		list = append(list, GroupedDest{
			Status:      status,
			StatusLabel: StatusLabels[status],
			Countries:   countries,
		})
	}
	return list
}

type RankResult struct {
	Passport     string  `json:"passport"`
	PassportName string  `json:"passport_name"`
	Rank         int     `json:"rank"`
	Total        int     `json:"total"`
	Score        float64 `json:"score"`
	VisaFree     int     `json:"visa_free"`
	Found        bool    `json:"found"`
}

func (db *DB) Rank(code string) RankResult {
	code = strings.ToUpper(code)
	for _, entry := range db.Rankings {
		if entry.Passport == code {
			return RankResult{
				Passport:     code,
				PassportName: db.CountryName(code),
				Rank:         entry.Rank,
				Total:        len(db.Rankings),
				Score:        db.Scores[code],
				VisaFree:     db.VFCounts[code],
				Found:        true,
			}
		}
	}
	return RankResult{Passport: code, PassportName: db.CountryName(code)}
}

func (db *DB) Top(n int) []RankEntry {
	if n > len(db.Rankings) {
		n = len(db.Rankings)
	}
	if n < 0 {
		n = 0
	}
	return db.Rankings[:n]
}

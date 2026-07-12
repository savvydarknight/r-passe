package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type Server struct {
	db *DB
}

func NewServer(db *DB) *Server {
	return &Server{db: db}
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/countries", s.handleCountries)
	mux.HandleFunc("/lookup", s.handleLookup)
	mux.HandleFunc("/passport/", s.handlePassport)
	mux.HandleFunc("/destination/", s.handleDestination)
	mux.HandleFunc("/rank/", s.handleRank)
	mux.HandleFunc("/top", s.handleTop)

	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			writeJSON(w, http.StatusOK, map[string]string{})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"passports": len(s.db.Matrix),
	})
}

func (s *Server) handleCountries(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.db.Countries)
}

func (s *Server) handleLookup(w http.ResponseWriter, r *http.Request) {
	passport := r.URL.Query().Get("passport")
	destination := r.URL.Query().Get("destination")

	if passport == "" || destination == "" {
		writeError(w, http.StatusBadRequest, "passport and destination query params are required")
		return
	}

	writeJSON(w, http.StatusOK, s.db.Lookup(passport, destination))
}

func (s *Server) handlePassport(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimPrefix(r.URL.Path, "/passport/")
	if code == "" {
		writeError(w, http.StatusBadRequest, "passport code is required")
		return
	}

	name, total, grouped, ok := s.db.Passport(code)
	if !ok {
		writeError(w, http.StatusNotFound, "unknown passport: "+code)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"passport":     strings.ToUpper(code),
		"name":         name,
		"destinations": total,
		"grouped":      grouped,
	})
}

func (s *Server) handleDestination(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimPrefix(r.URL.Path, "/destination/")
	if code == "" {
		writeError(w, http.StatusBadRequest, "destination code is required")
		return
	}

	name, total, grouped, ok := s.db.Destination(code)
	if !ok {
		writeError(w, http.StatusNotFound, "no data for destination: "+code)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"destination": strings.ToUpper(code),
		"name":        name,
		"passports":   total,
		"grouped":     grouped,
	})
}

func (s *Server) handleRank(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimPrefix(r.URL.Path, "/rank/")
	if code == "" {
		writeError(w, http.StatusBadRequest, "passport code is required")
		return
	}

	result := s.db.Rank(code)
	if !result.Found {
		writeError(w, http.StatusNotFound, "unknown passport: "+code)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleTop(w http.ResponseWriter, r *http.Request) {
	n := 10
	if raw := r.URL.Query().Get("n"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			n = parsed
		}
	}

	writeJSON(w, http.StatusOK, s.db.Top(n))
}

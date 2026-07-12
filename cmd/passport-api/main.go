package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/cictehro/passport-index/internal/api"
)

func main() {
	db, err := api.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: could not load data: %v\n", err)
		fmt.Fprintf(os.Stderr, "make sure you run this from the repo root after running: npm run generate\n")
		os.Exit(1)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := api.NewServer(db)

	log.Printf("passport-api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, server.Handler()))
}

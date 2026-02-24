package main

import (
	"fmt"
	"os"

	"github.com/ExpertVagabond/cpanel-mcp/internal/client"
	"github.com/ExpertVagabond/cpanel-mcp/internal/config"
	"github.com/ExpertVagabond/cpanel-mcp/internal/tools"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Config error: %s\n", err)
		os.Exit(1)
	}

	c := client.New(cfg)

	s := server.NewMCPServer("cpanel-mcp", "0.1.0")
	tools.Register(s, c)

	fmt.Fprintf(os.Stderr, "cpanel-mcp v0.1.0 running (47 tools)\n")

	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "Fatal: %s\n", err)
		os.Exit(1)
	}
}

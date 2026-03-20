package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/ExpertVagabond/cpanel-mcp/internal/client"
	"github.com/ExpertVagabond/cpanel-mcp/internal/config"
	"github.com/ExpertVagabond/cpanel-mcp/internal/tools"
	"github.com/mark3labs/mcp-go/server"
)

// redactSensitive strips token and password values from error messages
// to prevent credential leakage in logs or stderr output.
func redactSensitive(msg string) string {
	// Redact any known credential env var values that may appear in error strings
	for _, envKey := range []string{"CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD"} {
		if val := os.Getenv(envKey); val != "" && len(val) > 3 {
			msg = strings.ReplaceAll(msg, val, "[REDACTED]")
		}
	}
	// Redact anything that looks like an auth header value (prefix user:token)
	// Pattern: "cpanel <user>:<token>" or "whm <user>:<token>"
	for _, prefix := range []string{"cpanel ", "whm "} {
		if idx := strings.Index(strings.ToLower(msg), prefix); idx != -1 {
			end := strings.IndexAny(msg[idx:], " \n\r\t\"'")
			if end == -1 {
				msg = msg[:idx] + prefix + "[REDACTED]"
			} else {
				msg = msg[:idx] + prefix + "[REDACTED]" + msg[idx+end:]
			}
		}
	}
	return msg
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Config error: %s\n", redactSensitive(err.Error()))
		os.Exit(1)
	}

	c := client.New(cfg)

	s := server.NewMCPServer("cpanel-mcp", "0.1.0")
	tools.Register(s, c)

	fmt.Fprintf(os.Stderr, "cpanel-mcp v0.1.0 running (47 tools)\n")

	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "Fatal: %s\n", redactSensitive(err.Error()))
		os.Exit(1)
	}
}

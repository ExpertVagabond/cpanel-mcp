package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/ExpertVagabond/cpanel-mcp/internal/client"
	"github.com/ExpertVagabond/cpanel-mcp/internal/config"
	"github.com/ExpertVagabond/cpanel-mcp/internal/tools"
	"github.com/mark3labs/mcp-go/server"
)

// ── Security Constants ──────────────────────────────────────────────────

// maxToolInputSize limits the JSON payload accepted per tool call.
const maxToolInputSize = 1 * 1024 * 1024 // 1 MB

// credentialEnvKeys lists env vars whose values must be scrubbed from output.
var credentialEnvKeys = []string{
	"CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD", "CPANEL_WHM_TOKEN",
}

// longTokenRe matches long base64/hex token-like strings.
var longTokenRe = regexp.MustCompile(`[A-Za-z0-9_\-]{40,}`)

// redactSensitive strips token and password values from error messages
// to prevent credential leakage in logs or stderr output.
func redactSensitive(msg string) string {
	// Redact any known credential env var values that may appear in error strings
	for _, envKey := range credentialEnvKeys {
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
	// Catch any remaining long token-like strings
	msg = longTokenRe.ReplaceAllString(msg, "[REDACTED-TOKEN]")
	return msg
}

// validateToolName checks that a tool name contains only safe characters.
func validateToolName(name string) error {
	if len(name) == 0 || len(name) > 128 {
		return fmt.Errorf("invalid tool name length: %d", len(name))
	}
	for _, c := range name {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' || c == '-') {
			return fmt.Errorf("tool name contains invalid character: %c", c)
		}
	}
	return nil
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

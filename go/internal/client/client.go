package client

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/ExpertVagabond/cpanel-mcp/internal/config"
)

// ── Security Constants ──────────────────────────────────────────────────

// maxPathLength limits the API path length to prevent oversized URLs.
const maxPathLength = 2048

// maxParamValueLength limits individual query parameter values.
const maxParamValueLength = 4096

// requestTimeout is the hard upper limit for any cPanel API call.
const requestTimeout = 60 // seconds

type CpanelClient struct {
	cfg    *config.CpanelConfig
	client *http.Client
}

type CpanelApiError struct {
	Status  int
	Message string
}

func (e *CpanelApiError) Error() string {
	return fmt.Sprintf("cPanel API %d: %s", e.Status, redactErrorBody(e.Message))
}

// maxResponseBody limits the amount of data read from cPanel API responses
// to prevent memory exhaustion from oversized or malicious responses.
const maxResponseBody = 10 * 1024 * 1024 // 10 MB

// redactErrorBody strips credential-like patterns from HTTP error response
// bodies so they are never surfaced to clients.
func redactErrorBody(body string) string {
	if len(body) > 500 {
		body = body[:500] + "...[truncated]"
	}
	// Redact auth header patterns
	body = regexp.MustCompile(`(?i)(cpanel|whm)\s+\S+:\S+`).ReplaceAllString(body, "[redacted-auth]")
	// Redact long token-like strings
	body = regexp.MustCompile(`[A-Za-z0-9_-]{32,}`).ReplaceAllString(body, "[redacted-token]")
	// Redact any env var values that may appear
	for _, envKey := range []string{"CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD"} {
		if val := os.Getenv(envKey); val != "" && len(val) > 3 {
			body = strings.ReplaceAll(body, val, "[REDACTED]")
		}
	}
	return body
}

func New(cfg *config.CpanelConfig) *CpanelClient {
	skipVerify := !cfg.VerifySSL

	// SECURITY WARNING: InsecureSkipVerify disables TLS certificate verification.
	// This makes the connection vulnerable to man-in-the-middle attacks.
	// Only use this for development/self-signed certs. Set CPANEL_VERIFY_SSL=true in production.
	if skipVerify {
		log.Println("[WARN] TLS certificate verification is DISABLED (InsecureSkipVerify=true). " +
			"Set CPANEL_VERIFY_SSL=true for production environments to prevent MITM attacks.")
	}

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: skipVerify,
		},
	}
	return &CpanelClient{
		cfg: cfg,
		client: &http.Client{
			Transport: transport,
			Timeout:   time.Duration(cfg.Timeout) * time.Second,
		},
	}
}

// sanitizeAuthComponent ensures a username or token value is safe for use
// in the Authorization header. Strips control characters, newlines (header
// injection), and null bytes. Returns an error if the value is empty after
// sanitization.
func sanitizeAuthComponent(name, value string) (string, error) {
	// Strip control characters including CR/LF (prevent header injection)
	cleaned := strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return -1 // drop the character
		}
		return r
	}, value)
	cleaned = strings.TrimSpace(cleaned)
	if cleaned == "" {
		return "", fmt.Errorf("%s is empty or contains only invalid characters", name)
	}
	return cleaned, nil
}

func (c *CpanelClient) Request(ctx context.Context, apiType, path string, params map[string]string) (json.RawMessage, error) {
	// Validate path length and characters
	if len(path) > maxPathLength {
		return nil, fmt.Errorf("API path exceeds maximum length (%d > %d)", len(path), maxPathLength)
	}
	if strings.ContainsAny(path, "\x00\r\n") {
		return nil, fmt.Errorf("API path contains invalid characters")
	}
	// Validate param values
	for k, v := range params {
		if len(v) > maxParamValueLength {
			return nil, fmt.Errorf("parameter %q value exceeds max length (%d > %d)", k, len(v), maxParamValueLength)
		}
	}

	port := c.cfg.Port
	authPrefix := "cpanel"
	authUser := c.cfg.Username
	authToken := c.cfg.Token
	if apiType == "whm" {
		port = c.cfg.WHMPort
		authPrefix = "whm"
		authUser = c.cfg.WHMUsername
	}

	// Security: sanitize auth components to prevent header injection
	cleanUser, err := sanitizeAuthComponent("username", authUser)
	if err != nil {
		return nil, fmt.Errorf("auth error: %w", err)
	}
	cleanToken, err := sanitizeAuthComponent("token", authToken)
	if err != nil {
		return nil, fmt.Errorf("auth error: %w", err)
	}

	u, err := url.Parse(fmt.Sprintf("https://%s:%d%s", c.cfg.Host, port, path))
	if err != nil {
		return nil, err
	}
	q := u.Query()
	for k, v := range params {
		if v != "" {
			q.Set(k, v)
		}
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("%s %s:%s", authPrefix, cleanUser, cleanToken))
	req.Header.Set("Accept", "application/json")

	// Security: verify constructed URL still points to the intended host
	// (prevents host-override via crafted path or param values)
	if u.Hostname() != c.cfg.Host {
		return nil, fmt.Errorf("URL hostname mismatch — possible injection in path or params")
	}

	resp, err := c.client.Do(req)
	if err != nil {
		// Security: network errors may contain the URL with auth tokens — redact them
		errMsg := err.Error()
		if c.cfg.Token != "" {
			errMsg = strings.ReplaceAll(errMsg, c.cfg.Token, "[REDACTED]")
		}
		errMsg = strings.ReplaceAll(errMsg, fmt.Sprintf("%s:%d", c.cfg.Host, port), "[host]")
		return nil, &CpanelApiError{Status: 0, Message: fmt.Sprintf("Network error: %s", redactErrorBody(errMsg))}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBody))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, &CpanelApiError{Status: resp.StatusCode, Message: redactErrorBody(string(body))}
	}

	return json.RawMessage(body), nil
}

// UAPI calls the UAPI endpoint and extracts result.data
func (c *CpanelClient) UAPI(ctx context.Context, module, function string, params map[string]string) (json.RawMessage, error) {
	path := fmt.Sprintf("/execute/%s/%s", module, function)
	raw, err := c.Request(ctx, "uapi", path, params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Result struct {
			Status int              `json:"status"`
			Data   json.RawMessage  `json:"data"`
			Errors []string         `json:"errors"`
		} `json:"result"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	if resp.Result.Status != 1 {
		msg := "Unknown UAPI error"
		if len(resp.Result.Errors) > 0 {
			msg = resp.Result.Errors[0]
		}
		return nil, &CpanelApiError{Status: 0, Message: msg}
	}
	return resp.Result.Data, nil
}

// WHM calls the WHM API 1 endpoint and extracts data
func (c *CpanelClient) WHM(ctx context.Context, function string, params map[string]string) (json.RawMessage, error) {
	if params == nil {
		params = make(map[string]string)
	}
	params["api.version"] = "1"
	path := fmt.Sprintf("/json-api/%s", function)
	raw, err := c.Request(ctx, "whm", path, params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Metadata struct {
			Result int    `json:"result"`
			Reason string `json:"reason"`
		} `json:"metadata"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	if resp.Metadata.Result != 1 {
		return nil, &CpanelApiError{Status: 0, Message: resp.Metadata.Reason}
	}
	return resp.Data, nil
}

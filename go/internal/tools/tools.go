package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"regexp"
	"strings"

	"github.com/ExpertVagabond/cpanel-mcp/internal/client"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// ---------------------------------------------------------------------------
// Security: credential redaction for error messages
// ---------------------------------------------------------------------------

// redactCredentials strips known credential patterns from error messages
// so they are never surfaced to the MCP client.
func redactCredentials(msg string) string {
	// Redact env var values that may be reflected in errors
	for _, envKey := range []string{"CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD"} {
		if val := os.Getenv(envKey); val != "" && len(val) > 3 {
			msg = strings.ReplaceAll(msg, val, "[REDACTED]")
		}
	}
	// Redact auth header patterns (cpanel user:token, whm user:token)
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
	// Redact long alphanumeric sequences that look like tokens (32+ chars)
	tokenPattern := regexp.MustCompile(`[A-Za-z0-9_-]{32,}`)
	msg = tokenPattern.ReplaceAllString(msg, "[REDACTED]")
	// Truncate overly long messages
	if len(msg) > 500 {
		msg = msg[:500] + "...[truncated]"
	}
	return msg
}

// ---------------------------------------------------------------------------
// Security: input validation helpers
// ---------------------------------------------------------------------------

var (
	domainLabelRe    = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$`)
	cpanelUsernameRe = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]{0,15}$`)
	serviceUsernameRe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.\-]{0,31}$`)
	databaseNameRe   = regexp.MustCompile(`^[a-zA-Z0-9_]{1,64}$`)
	numericRe        = regexp.MustCompile(`^\d+$`)
	safeServiceNameRe = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]*$`)
	emailLocalRe     = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+$`)
	packageNameRe    = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_. \-]{0,63}$`)
	phpVersionRe     = regexp.MustCompile(`^ea-php\d{2,3}$`)
)

func validateDomain(val string) error {
	if val == "" {
		return fmt.Errorf("domain is required")
	}
	if len(val) > 253 {
		return fmt.Errorf("domain exceeds maximum length")
	}
	labels := strings.Split(strings.TrimSuffix(val, "."), ".")
	if len(labels) < 2 {
		return fmt.Errorf("invalid domain format")
	}
	for _, label := range labels {
		if !domainLabelRe.MatchString(label) {
			return fmt.Errorf("invalid domain label: %s", label)
		}
	}
	return nil
}

func validateEmail(val string) error {
	if val == "" {
		return fmt.Errorf("email is required")
	}
	if len(val) > 254 {
		return fmt.Errorf("email exceeds maximum length")
	}
	parts := strings.SplitN(val, "@", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return fmt.Errorf("invalid email format")
	}
	if len(parts[0]) > 64 || !emailLocalRe.MatchString(parts[0]) {
		return fmt.Errorf("invalid email local part")
	}
	return validateDomain(parts[1])
}

func validateSafePath(val string) error {
	if val == "" {
		return fmt.Errorf("path is required")
	}
	if len(val) > 4096 {
		return fmt.Errorf("path exceeds maximum length")
	}
	if strings.Contains(val, "\x00") {
		return fmt.Errorf("path must not contain null bytes")
	}
	// Block path traversal
	if strings.Contains(val, "..") {
		return fmt.Errorf("path traversal detected")
	}
	// Block dangerous shell characters
	if strings.ContainsAny(val, "<>|;`$") {
		return fmt.Errorf("path contains forbidden characters")
	}
	return nil
}

func validateSafeFilename(val string) error {
	if val == "" {
		return fmt.Errorf("filename is required")
	}
	if len(val) > 255 {
		return fmt.Errorf("filename exceeds maximum length")
	}
	if strings.Contains(val, "/") || strings.Contains(val, "\\") {
		return fmt.Errorf("filename must not contain directory separators")
	}
	if strings.Contains(val, "\x00") {
		return fmt.Errorf("filename must not contain null bytes")
	}
	if val == "." || val == ".." {
		return fmt.Errorf("filename must not be '.' or '..'")
	}
	return nil
}

func validatePassword(val string) error {
	if len(val) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	if len(val) > 128 {
		return fmt.Errorf("password exceeds maximum length")
	}
	if strings.Contains(val, "\x00") {
		return fmt.Errorf("password must not contain null bytes")
	}
	return nil
}

func validateCpanelUsername(val string) error {
	if val == "" {
		return fmt.Errorf("username is required")
	}
	if !cpanelUsernameRe.MatchString(val) {
		return fmt.Errorf("invalid cPanel username format")
	}
	return nil
}

func validateServiceUsername(val string) error {
	if val == "" {
		return fmt.Errorf("username is required")
	}
	if !serviceUsernameRe.MatchString(val) {
		return fmt.Errorf("invalid service username format")
	}
	return nil
}

func validateDatabaseName(val string) error {
	if val == "" {
		return fmt.Errorf("database name is required")
	}
	if !databaseNameRe.MatchString(val) {
		return fmt.Errorf("invalid database name format")
	}
	return nil
}

func validateDnsRecordType(val string) error {
	valid := map[string]bool{
		"A": true, "AAAA": true, "CNAME": true, "MX": true,
		"TXT": true, "SRV": true, "CAA": true,
	}
	if !valid[val] {
		return fmt.Errorf("invalid DNS record type: %s", val)
	}
	return nil
}

func validateIPAddress(val string) error {
	if net.ParseIP(val) == nil {
		return fmt.Errorf("invalid IP address")
	}
	return nil
}

func validateRequired(name, val string) error {
	if val == "" {
		return fmt.Errorf("%s is required", name)
	}
	if strings.Contains(val, "\x00") {
		return fmt.Errorf("%s must not contain null bytes", name)
	}
	return nil
}

func validateNumeric(name, val string) error {
	if !numericRe.MatchString(val) {
		return fmt.Errorf("%s must be a non-negative integer", name)
	}
	return nil
}

func validateCronField(name, val string) error {
	if val == "" {
		return fmt.Errorf("%s is required", name)
	}
	// Allow: *, */N, N, N-M, N,M,O, N-M/S
	cronRe := regexp.MustCompile(`^(\*|\d+(-\d+)?(\/\d+)?)(,(\*|\d+(-\d+)?(\/\d+)?))*$`)
	if val != "*" && !cronRe.MatchString(val) {
		return fmt.Errorf("invalid cron %s format", name)
	}
	return nil
}

// dangerousCronPatterns blocks obvious shell injection patterns in cron commands.
var dangerousCronPatterns = []*regexp.Regexp{
	regexp.MustCompile(`\$\(.*\)`),                        // Command substitution $(...)
	regexp.MustCompile("`[^`]+`"),                          // Backtick command substitution
	regexp.MustCompile(`\|\s*(bash|sh|zsh|dash|ksh|csh)\b`), // Piping to shells
	regexp.MustCompile(`;\s*(rm|chmod|chown|dd|mkfs|fdisk)\s+-rf?\s+/`), // Destructive cmds on root
	regexp.MustCompile(`>\s*/etc/`),                        // Writing to /etc
	regexp.MustCompile(`>\s*/dev/`),                        // Writing to devices
	regexp.MustCompile(`\beval\b`),                         // eval
	regexp.MustCompile(`\bexec\b.*<`),                      // exec with redirection
}

func validateCronCommand(val string) error {
	if val == "" {
		return fmt.Errorf("command is required")
	}
	if len(val) > 1024 {
		return fmt.Errorf("command exceeds maximum length")
	}
	if strings.Contains(val, "\x00") {
		return fmt.Errorf("command must not contain null bytes")
	}
	for _, pattern := range dangerousCronPatterns {
		if pattern.MatchString(val) {
			return fmt.Errorf("command contains potentially dangerous patterns — review the command and ensure it is safe")
		}
	}
	return nil
}

func validateForwardOption(val string) error {
	valid := map[string]bool{
		"fwd": true, "fail": true, "blackhole": true, "pipe": true,
	}
	if !valid[val] {
		return fmt.Errorf("invalid forward option: %s (allowed: fwd, fail, blackhole, pipe)", val)
	}
	return nil
}

func validatePEM(name, val string) error {
	if len(val) < 50 {
		return fmt.Errorf("%s PEM data is too short", name)
	}
	if !strings.HasPrefix(strings.TrimSpace(val), "-----BEGIN") {
		return fmt.Errorf("%s must be PEM-encoded", name)
	}
	return nil
}

func validateCountryCode(val string) error {
	if len(val) != 2 {
		return fmt.Errorf("country code must be exactly 2 characters")
	}
	matched, _ := regexp.MatchString(`^[A-Z]{2}$`, val)
	if !matched {
		return fmt.Errorf("country code must be two uppercase letters")
	}
	return nil
}

func validatePackageName(val string) error {
	if val == "" {
		return fmt.Errorf("package name is required")
	}
	if !packageNameRe.MatchString(val) {
		return fmt.Errorf("invalid package name format")
	}
	return nil
}

func validatePHPVersion(val string) error {
	if !phpVersionRe.MatchString(val) {
		return fmt.Errorf("PHP version must match format ea-phpNN (e.g., ea-php81)")
	}
	return nil
}

// validPrivileges is the allowlist of MySQL privileges accepted by the set_privileges tool.
var validPrivileges = map[string]bool{
	"ALL PRIVILEGES":          true,
	"ALL":                     true,
	"SELECT":                  true,
	"INSERT":                  true,
	"UPDATE":                  true,
	"DELETE":                  true,
	"CREATE":                  true,
	"DROP":                    true,
	"ALTER":                   true,
	"INDEX":                   true,
	"CREATE TEMPORARY TABLES": true,
	"LOCK TABLES":             true,
	"REFERENCES":              true,
	"CREATE VIEW":             true,
	"SHOW VIEW":               true,
	"CREATE ROUTINE":          true,
	"ALTER ROUTINE":           true,
	"EXECUTE":                 true,
	"EVENT":                   true,
	"TRIGGER":                 true,
}

func validatePrivileges(val string) error {
	if val == "" {
		return fmt.Errorf("privileges are required")
	}
	parts := strings.Split(val, ",")
	for _, p := range parts {
		trimmed := strings.TrimSpace(strings.ToUpper(p))
		if !validPrivileges[trimmed] {
			return fmt.Errorf("invalid privilege %q — allowed: ALL PRIVILEGES, SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, CREATE TEMPORARY TABLES, LOCK TABLES, REFERENCES, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EXECUTE, EVENT, TRIGGER", p)
		}
	}
	return nil
}

func validateServiceName(val string) error {
	valid := map[string]bool{
		"httpd": true, "mysql": true, "exim": true, "named": true,
		"ftpd": true, "dovecot": true, "spamd": true, "clamd": true,
		"cpanel": true, "cpsrvd": true,
	}
	if !valid[val] {
		return fmt.Errorf("invalid service name: %s", val)
	}
	return nil
}

func validateSafeText(name, val string, maxLen int) error {
	if val == "" {
		return fmt.Errorf("%s is required", name)
	}
	if len(val) > maxLen {
		return fmt.Errorf("%s exceeds maximum length of %d characters", name, maxLen)
	}
	for _, r := range val {
		if r < 0x20 && r != '\t' && r != '\n' {
			return fmt.Errorf("%s must not contain control characters", name)
		}
	}
	return nil
}

func Register(s *server.MCPServer, c *client.CpanelClient) {
	registerEmailTools(s, c)
	registerFileTools(s, c)
	registerMysqlTools(s, c)
	registerSSLTools(s, c)
	registerDNSTools(s, c)
	registerDomainTools(s, c)
	registerCronTools(s, c)
	registerBackupTools(s, c)
	registerFTPTools(s, c)
	registerPHPTools(s, c)
	registerWHMTools(s, c)
}

func jsonResult(data json.RawMessage) string {
	if data == nil {
		return "{}"
	}
	var pretty json.RawMessage
	if err := json.Unmarshal(data, &pretty); err != nil {
		return string(data)
	}
	out, _ := json.MarshalIndent(pretty, "", "  ")
	return string(out)
}

func textContent(text string) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: text}},
	}
}

func errorContent(err error) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Error: %s", redactCredentials(err.Error()))}},
		IsError: true,
	}
}

func validationError(msg string) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Validation error: %s", msg)}},
		IsError: true,
	}
}

func strArg(args map[string]interface{}, key string) string {
	if v, ok := args[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func uapiHandler(c *client.CpanelClient, module, function string, paramKeys []string) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := make(map[string]string)
		for _, k := range paramKeys {
			if v := strArg(req.Params.Arguments, k); v != "" {
				params[k] = v
			}
		}
		data, err := c.UAPI(ctx, module, function, params)
		if err != nil {
			return errorContent(err), nil
		}
		return textContent(jsonResult(data)), nil
	}
}

func whmHandler(c *client.CpanelClient, function string, paramKeys []string) server.ToolHandlerFunc {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := make(map[string]string)
		for _, k := range paramKeys {
			if v := strArg(req.Params.Arguments, k); v != "" {
				params[k] = v
			}
		}
		data, err := c.WHM(ctx, function, params)
		if err != nil {
			return errorContent(err), nil
		}
		return textContent(jsonResult(data)), nil
	}
}

func prop(desc string) map[string]any {
	return map[string]any{"type": "string", "description": desc}
}

func registerEmailTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_email_list_accounts", Description: "List all email accounts with disk usage and quota information.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Filter by domain"), "regex": prop("Filter regex")}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := make(map[string]string)
			if d := strArg(req.Params.Arguments, "domain"); d != "" {
				if err := validateDomain(d); err != nil {
					return validationError(err.Error()), nil
				}
				params["domain"] = d
			}
			if r := strArg(req.Params.Arguments, "regex"); r != "" {
				if len(r) > 256 {
					return validationError("regex filter exceeds maximum length"), nil
				}
				params["regex"] = r
			}
			data, err := c.UAPI(ctx, "Email", "list_pops_with_disk", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_email_create_account", Description: "Create a new email account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address"), "password": prop("Password"), "quota": prop("Quota in MB")}, Required: []string{"email", "password"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			email := strArg(req.Params.Arguments, "email")
			if err := validateEmail(email); err != nil {
				return validationError(err.Error()), nil
			}
			password := strArg(req.Params.Arguments, "password")
			if err := validatePassword(password); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"email": email, "password": password}
			if q := strArg(req.Params.Arguments, "quota"); q != "" {
				if err := validateNumeric("quota", q); err != nil {
					return validationError(err.Error()), nil
				}
				params["quota"] = q
			}
			data, err := c.UAPI(ctx, "Email", "add_pop", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_email_delete_account", Description: "Delete an email account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address")}, Required: []string{"email"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			email := strArg(req.Params.Arguments, "email")
			if err := validateEmail(email); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Email", "delete_pop", map[string]string{"email": email})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_email_set_quota", Description: "Update mailbox quota.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address"), "quota": prop("Quota in MB")}, Required: []string{"email", "quota"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			email := strArg(req.Params.Arguments, "email")
			if err := validateEmail(email); err != nil {
				return validationError(err.Error()), nil
			}
			quota := strArg(req.Params.Arguments, "quota")
			if err := validateNumeric("quota", quota); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Email", "edit_pop_quota", map[string]string{"email": email, "quota": quota})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_email_list_forwarders", Description: "List email forwarders.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Filter by domain")}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := make(map[string]string)
			if d := strArg(req.Params.Arguments, "domain"); d != "" {
				if err := validateDomain(d); err != nil {
					return validationError(err.Error()), nil
				}
				params["domain"] = d
			}
			data, err := c.UAPI(ctx, "Email", "list_forwarders", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_email_create_forwarder", Description: "Create an email forwarder.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain"), "email": prop("Source email"), "fwdopt": prop("Forward action: fwd, fail, blackhole, pipe"), "fwdemail": prop("Destination email")}, Required: []string{"domain", "email", "fwdopt"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			email := strArg(req.Params.Arguments, "email")
			if err := validateRequired("email", email); err != nil {
				return validationError(err.Error()), nil
			}
			fwdopt := strArg(req.Params.Arguments, "fwdopt")
			if err := validateForwardOption(fwdopt); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"domain": domain, "email": email, "fwdopt": fwdopt}
			if fe := strArg(req.Params.Arguments, "fwdemail"); fe != "" {
				if err := validateEmail(fe); err != nil {
					return validationError(err.Error()), nil
				}
				params["fwdemail"] = fe
			} else if fwdopt == "fwd" {
				return validationError("destination email (fwdemail) is required when fwdopt is 'fwd'"), nil
			}
			data, err := c.UAPI(ctx, "Email", "add_forwarder", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerFileTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_files_list", Description: "List files and directories.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory path"), "types": prop("Filter: file, dir, both")}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := make(map[string]string)
			if d := strArg(req.Params.Arguments, "dir"); d != "" {
				if err := validateSafePath(d); err != nil {
					return validationError(err.Error()), nil
				}
				params["dir"] = d
			}
			if t := strArg(req.Params.Arguments, "types"); t != "" {
				valid := map[string]bool{"file": true, "dir": true, "both": true}
				if !valid[t] {
					return validationError("types must be one of: file, dir, both"), nil
				}
				params["types"] = t
			}
			data, err := c.UAPI(ctx, "Fileman", "list_files", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_files_get_content", Description: "Read file contents.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory"), "file": prop("Filename")}, Required: []string{"dir", "file"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			dir := strArg(req.Params.Arguments, "dir")
			if err := validateSafePath(dir); err != nil {
				return validationError(err.Error()), nil
			}
			file := strArg(req.Params.Arguments, "file")
			if err := validateSafeFilename(file); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Fileman", "get_file_content", map[string]string{"dir": dir, "file": file})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_files_save", Description: "Write content to a file.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory"), "file": prop("Filename"), "content": prop("File content")}, Required: []string{"dir", "file", "content"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			dir := strArg(req.Params.Arguments, "dir")
			if err := validateSafePath(dir); err != nil {
				return validationError(err.Error()), nil
			}
			file := strArg(req.Params.Arguments, "file")
			if err := validateSafeFilename(file); err != nil {
				return validationError(err.Error()), nil
			}
			content := strArg(req.Params.Arguments, "content")
			if len(content) > 10_000_000 {
				return validationError("file content exceeds 10 MB limit"), nil
			}
			data, err := c.UAPI(ctx, "Fileman", "save_file_content", map[string]string{"dir": dir, "file": file, "content": content})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_files_delete", Description: "Delete a file or directory.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"path": prop("Full path to delete")}, Required: []string{"path"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			p := strArg(req.Params.Arguments, "path")
			if err := validateSafePath(p); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Fileman", "fileop", map[string]string{"op": "unlink", "sourcefiles": p})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerMysqlTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_list_databases", Description: "List MySQL databases.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Mysql", "list_databases", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_list_users", Description: "List MySQL users.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Mysql", "list_users", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_mysql_create_database", Description: "Create a MySQL database.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Database name")}, Required: []string{"name"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			name := strArg(req.Params.Arguments, "name")
			if err := validateDatabaseName(name); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Mysql", "create_database", map[string]string{"name": name})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_mysql_delete_database", Description: "Delete a MySQL database.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Database name")}, Required: []string{"name"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			name := strArg(req.Params.Arguments, "name")
			if err := validateDatabaseName(name); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Mysql", "delete_database", map[string]string{"name": name})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_mysql_create_user", Description: "Create a MySQL user.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Username"), "password": prop("Password")}, Required: []string{"name", "password"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			name := strArg(req.Params.Arguments, "name")
			if err := validateServiceUsername(name); err != nil {
				return validationError(err.Error()), nil
			}
			password := strArg(req.Params.Arguments, "password")
			if err := validatePassword(password); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Mysql", "create_user", map[string]string{"name": name, "password": password})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_mysql_set_privileges", Description: "Grant privileges to a MySQL user.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "database": prop("Database"), "privileges": prop("Privileges")}, Required: []string{"user", "database", "privileges"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			user := strArg(req.Params.Arguments, "user")
			if err := validateServiceUsername(user); err != nil {
				return validationError(err.Error()), nil
			}
			database := strArg(req.Params.Arguments, "database")
			if err := validateDatabaseName(database); err != nil {
				return validationError(err.Error()), nil
			}
			privileges := strArg(req.Params.Arguments, "privileges")
			if err := validatePrivileges(privileges); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "Mysql", "set_privileges_on_database", map[string]string{"user": user, "database": database, "privileges": privileges})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerSSLTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_ssl_list_certs", Description: "List SSL certificates.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "SSL", "list_certs", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_ssl_install_cert", Description: "Install an SSL certificate.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain"), "cert": prop("PEM certificate"), "key": prop("PEM private key"), "cabundle": prop("CA bundle")}, Required: []string{"domain", "cert", "key"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			cert := strArg(req.Params.Arguments, "cert")
			if err := validatePEM("cert", cert); err != nil {
				return validationError(err.Error()), nil
			}
			key := strArg(req.Params.Arguments, "key")
			if err := validatePEM("key", key); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"domain": domain, "cert": cert, "key": key}
			if cab := strArg(req.Params.Arguments, "cabundle"); cab != "" {
				if err := validatePEM("cabundle", cab); err != nil {
					return validationError(err.Error()), nil
				}
				params["cabundle"] = cab
			}
			data, err := c.UAPI(ctx, "SSL", "install_ssl", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_ssl_generate_csr", Description: "Generate a CSR.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domains": prop("Domain"), "city": prop("City"), "state": prop("State"), "country": prop("Country code"), "company": prop("Company"), "email": prop("Email")}, Required: []string{"domains", "city", "state", "country", "company", "email"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domains := strArg(req.Params.Arguments, "domains")
			if err := validateDomain(domains); err != nil {
				return validationError(err.Error()), nil
			}
			city := strArg(req.Params.Arguments, "city")
			if err := validateSafeText("city", city, 128); err != nil {
				return validationError(err.Error()), nil
			}
			state := strArg(req.Params.Arguments, "state")
			if err := validateSafeText("state", state, 128); err != nil {
				return validationError(err.Error()), nil
			}
			country := strArg(req.Params.Arguments, "country")
			if err := validateCountryCode(country); err != nil {
				return validationError(err.Error()), nil
			}
			company := strArg(req.Params.Arguments, "company")
			if err := validateSafeText("company", company, 128); err != nil {
				return validationError(err.Error()), nil
			}
			email := strArg(req.Params.Arguments, "email")
			if err := validateEmail(email); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "SSL", "generate_csr", map[string]string{
				"domains": domains, "city": city, "state": state,
				"country": country, "company": company, "email": email,
			})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerDNSTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_dns_list_zones", Description: "List DNS zones.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "DNS", "list_zones", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_dns_get_records", Description: "Get DNS records for a domain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain name")}, Required: []string{"domain"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "DNS", "parse_zone", map[string]string{"domain": domain})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_dns_add_record", Description: "Add a DNS record.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain zone"), "name": prop("Record name"), "type": prop("Record type"), "data": prop("Record value"), "ttl": prop("TTL in seconds"), "priority": prop("Priority for MX/SRV")}, Required: []string{"domain", "name", "type", "data"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			name := strArg(req.Params.Arguments, "name")
			if err := validateRequired("name", name); err != nil {
				return validationError(err.Error()), nil
			}
			if len(name) > 253 {
				return validationError("record name exceeds maximum length"), nil
			}
			recType := strArg(req.Params.Arguments, "type")
			if err := validateDnsRecordType(recType); err != nil {
				return validationError(err.Error()), nil
			}
			rdata := strArg(req.Params.Arguments, "data")
			if err := validateRequired("data", rdata); err != nil {
				return validationError(err.Error()), nil
			}
			if len(rdata) > 4096 {
				return validationError("record data exceeds maximum length"), nil
			}
			// Require priority for MX and SRV
			priority := strArg(req.Params.Arguments, "priority")
			if (recType == "MX" || recType == "SRV") && priority == "" {
				return validationError(fmt.Sprintf("priority is required for %s records", recType)), nil
			}
			params := map[string]string{
				"domain":     domain,
				"add.0.name": name,
				"add.0.type": recType,
				"add.0.data": rdata,
				"add.0.ttl":  "14400",
				"serial":     fmt.Sprintf("%d", 0),
			}
			if ttl := strArg(req.Params.Arguments, "ttl"); ttl != "" {
				if err := validateNumeric("ttl", ttl); err != nil {
					return validationError(err.Error()), nil
				}
				params["add.0.ttl"] = ttl
			}
			if priority != "" {
				if err := validateNumeric("priority", priority); err != nil {
					return validationError(err.Error()), nil
				}
				params["add.0.preference"] = priority
			}
			data, err := c.UAPI(ctx, "DNS", "mass_edit_zone", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_dns_delete_record", Description: "Delete a DNS record by line number.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain zone"), "line": prop("Line number")}, Required: []string{"domain", "line"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			line := strArg(req.Params.Arguments, "line")
			if err := validateNumeric("line", line); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "DNS", "mass_edit_zone", map[string]string{
				"domain":        domain,
				"remove.0.line": line,
				"serial":        "0",
			})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerDomainTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_domains_list", Description: "List all domains, subdomains, addon and parked domains.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "DomainInfo", "list_domains", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_domains_add_subdomain", Description: "Create a subdomain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Subdomain name"), "rootdomain": prop("Root domain"), "dir": prop("Document root")}, Required: []string{"domain", "rootdomain"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateRequired("domain", domain); err != nil {
				return validationError(err.Error()), nil
			}
			if len(domain) > 63 || !domainLabelRe.MatchString(domain) {
				return validationError("invalid subdomain label format"), nil
			}
			rootdomain := strArg(req.Params.Arguments, "rootdomain")
			if err := validateDomain(rootdomain); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"domain": domain, "rootdomain": rootdomain}
			if d := strArg(req.Params.Arguments, "dir"); d != "" {
				if err := validateSafePath(d); err != nil {
					return validationError(err.Error()), nil
				}
				params["dir"] = d
			}
			data, err := c.UAPI(ctx, "SubDomain", "addsubdomain", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_domains_remove_subdomain", Description: "Remove a subdomain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Full subdomain")}, Required: []string{"domain"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "SubDomain", "delsubdomain", map[string]string{"domain": domain})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerCronTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_cron_list_jobs", Description: "List all cron jobs.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "CronJob", "list_cron", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_cron_add_job", Description: "Add a cron job.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"command": prop("Command"), "minute": prop("Minute"), "hour": prop("Hour"), "day": prop("Day"), "month": prop("Month"), "weekday": prop("Weekday")}, Required: []string{"command", "minute", "hour", "day", "month", "weekday"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			command := strArg(req.Params.Arguments, "command")
			if err := validateCronCommand(command); err != nil {
				return validationError(err.Error()), nil
			}
			minute := strArg(req.Params.Arguments, "minute")
			if err := validateCronField("minute", minute); err != nil {
				return validationError(err.Error()), nil
			}
			hour := strArg(req.Params.Arguments, "hour")
			if err := validateCronField("hour", hour); err != nil {
				return validationError(err.Error()), nil
			}
			day := strArg(req.Params.Arguments, "day")
			if err := validateCronField("day", day); err != nil {
				return validationError(err.Error()), nil
			}
			month := strArg(req.Params.Arguments, "month")
			if err := validateCronField("month", month); err != nil {
				return validationError(err.Error()), nil
			}
			weekday := strArg(req.Params.Arguments, "weekday")
			if err := validateCronField("weekday", weekday); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "CronJob", "add_line", map[string]string{
				"command": command, "minute": minute, "hour": hour,
				"day": day, "month": month, "weekday": weekday,
			})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_cron_remove_job", Description: "Remove a cron job by line key.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"linekey": prop("Cron line key")}, Required: []string{"linekey"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			linekey := strArg(req.Params.Arguments, "linekey")
			if err := validateRequired("linekey", linekey); err != nil {
				return validationError(err.Error()), nil
			}
			if len(linekey) > 512 {
				return validationError("linekey exceeds maximum length"), nil
			}
			data, err := c.UAPI(ctx, "CronJob", "remove_line", map[string]string{"linekey": linekey})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerBackupTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_backups_list", Description: "List available backups.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Backup", "list_backups", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_backups_create", Description: "Create a full backup.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Notification email")}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := make(map[string]string)
			if e := strArg(req.Params.Arguments, "email"); e != "" {
				if err := validateEmail(e); err != nil {
					return validationError(err.Error()), nil
				}
				params["email"] = e
			}
			data, err := c.UAPI(ctx, "Backup", "fullbackup_to_homedir", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerFTPTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_ftp_list_accounts", Description: "List FTP accounts.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Ftp", "list_ftp_with_disk", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_ftp_create_account", Description: "Create an FTP account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "pass": prop("Password"), "homedir": prop("Home directory"), "quota": prop("Quota in MB")}, Required: []string{"user", "pass"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			user := strArg(req.Params.Arguments, "user")
			if err := validateServiceUsername(user); err != nil {
				return validationError(err.Error()), nil
			}
			pass := strArg(req.Params.Arguments, "pass")
			if err := validatePassword(pass); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"user": user, "pass": pass}
			if h := strArg(req.Params.Arguments, "homedir"); h != "" {
				if err := validateSafePath(h); err != nil {
					return validationError(err.Error()), nil
				}
				params["homedir"] = h
			}
			if q := strArg(req.Params.Arguments, "quota"); q != "" {
				if err := validateNumeric("quota", q); err != nil {
					return validationError(err.Error()), nil
				}
				params["quota"] = q
			}
			data, err := c.UAPI(ctx, "Ftp", "add_ftp", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_ftp_delete_account", Description: "Delete an FTP account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "destroy": prop("Also delete home dir (1)")}, Required: []string{"user"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			user := strArg(req.Params.Arguments, "user")
			if err := validateServiceUsername(user); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"user": user}
			if d := strArg(req.Params.Arguments, "destroy"); d != "" {
				if d != "0" && d != "1" {
					return validationError("destroy must be '0' or '1'"), nil
				}
				params["destroy"] = d
			}
			data, err := c.UAPI(ctx, "Ftp", "delete_ftp", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerPHPTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_php_get_version", Description: "Get PHP version per domain.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "LangPHP", "php_get_vhost_versions", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_php_set_version", Description: "Set PHP version for a domain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"vhost": prop("Domain"), "version": prop("PHP version (ea-php81, etc)")}, Required: []string{"vhost", "version"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			vhost := strArg(req.Params.Arguments, "vhost")
			if err := validateDomain(vhost); err != nil {
				return validationError(err.Error()), nil
			}
			version := strArg(req.Params.Arguments, "version")
			if err := validatePHPVersion(version); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.UAPI(ctx, "LangPHP", "php_set_vhost_versions", map[string]string{"vhost": vhost, "version": version})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerWHMTools(s *server.MCPServer, c *client.CpanelClient) {
	// Accounts
	s.AddTool(mcp.Tool{Name: "cpanel_whm_list_accounts", Description: "List all cPanel accounts on the server.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"searchtype": prop("Search field"), "search": prop("Search value")}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := make(map[string]string)
			if st := strArg(req.Params.Arguments, "searchtype"); st != "" {
				valid := map[string]bool{"domain": true, "owner": true, "user": true, "ip": true, "package": true}
				if !valid[st] {
					return validationError("searchtype must be one of: domain, owner, user, ip, package"), nil
				}
				params["searchtype"] = st
			}
			if s := strArg(req.Params.Arguments, "search"); s != "" {
				if len(s) > 253 {
					return validationError("search value exceeds maximum length"), nil
				}
				// Block characters that could be used for injection
				searchSafe := regexp.MustCompile(`^[a-zA-Z0-9._@:/-]*$`)
				if !searchSafe.MatchString(s) {
					return validationError("search value contains invalid characters"), nil
				}
				params["search"] = s
			}
			data, err := c.WHM(ctx, "listaccts", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_whm_create_account", Description: "Create a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"username": prop("Username"), "domain": prop("Domain"), "password": prop("Password"), "plan": prop("Package"), "quota": prop("Disk quota MB"), "bwlimit": prop("Bandwidth MB"), "contactemail": prop("Contact email")}, Required: []string{"username", "domain"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			username := strArg(req.Params.Arguments, "username")
			if err := validateCpanelUsername(username); err != nil {
				return validationError(err.Error()), nil
			}
			domain := strArg(req.Params.Arguments, "domain")
			if err := validateDomain(domain); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"username": username, "domain": domain}
			if pw := strArg(req.Params.Arguments, "password"); pw != "" {
				if err := validatePassword(pw); err != nil {
					return validationError(err.Error()), nil
				}
				params["password"] = pw
			}
			if plan := strArg(req.Params.Arguments, "plan"); plan != "" {
				if err := validatePackageName(plan); err != nil {
					return validationError(err.Error()), nil
				}
				params["plan"] = plan
			}
			if q := strArg(req.Params.Arguments, "quota"); q != "" {
				if err := validateNumeric("quota", q); err != nil {
					return validationError(err.Error()), nil
				}
				params["quota"] = q
			}
			if bw := strArg(req.Params.Arguments, "bwlimit"); bw != "" {
				if err := validateNumeric("bwlimit", bw); err != nil {
					return validationError(err.Error()), nil
				}
				params["bwlimit"] = bw
			}
			if ce := strArg(req.Params.Arguments, "contactemail"); ce != "" {
				if err := validateEmail(ce); err != nil {
					return validationError(err.Error()), nil
				}
				params["contactemail"] = ce
			}
			data, err := c.WHM(ctx, "createacct", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_whm_suspend_account", Description: "Suspend a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "reason": prop("Reason")}, Required: []string{"user"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			user := strArg(req.Params.Arguments, "user")
			if err := validateCpanelUsername(user); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"user": user}
			if r := strArg(req.Params.Arguments, "reason"); r != "" {
				if err := validateSafeText("reason", r, 512); err != nil {
					return validationError(err.Error()), nil
				}
				params["reason"] = r
			}
			data, err := c.WHM(ctx, "suspendacct", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	s.AddTool(mcp.Tool{Name: "cpanel_whm_terminate_account", Description: "Permanently terminate a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "keepdns": prop("Keep DNS zone (1)")}, Required: []string{"user"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			user := strArg(req.Params.Arguments, "user")
			if err := validateCpanelUsername(user); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"user": user}
			if kd := strArg(req.Params.Arguments, "keepdns"); kd != "" {
				if kd != "0" && kd != "1" {
					return validationError("keepdns must be '0' or '1'"), nil
				}
				params["keepdns"] = kd
			}
			data, err := c.WHM(ctx, "removeacct", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	// Services
	s.AddTool(mcp.Tool{Name: "cpanel_whm_service_status", Description: "Check all server service statuses.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "servicestatus", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_whm_restart_service", Description: "Restart a server service.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"service": prop("Service name")}, Required: []string{"service"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			service := strArg(req.Params.Arguments, "service")
			if err := validateServiceName(service); err != nil {
				return validationError(err.Error()), nil
			}
			data, err := c.WHM(ctx, "restartservice", map[string]string{"service": service})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	// Packages
	s.AddTool(mcp.Tool{Name: "cpanel_whm_list_packages", Description: "List hosting packages.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "listpkgs", nil))

	s.AddTool(mcp.Tool{Name: "cpanel_whm_create_package", Description: "Create a hosting package.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Package name"), "quota": prop("Disk MB"), "bwlimit": prop("Bandwidth MB"), "maxftp": prop("Max FTP"), "maxsql": prop("Max databases"), "maxpop": prop("Max email"), "maxsub": prop("Max subdomains"), "maxaddon": prop("Max addon domains")}, Required: []string{"name"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			name := strArg(req.Params.Arguments, "name")
			if err := validatePackageName(name); err != nil {
				return validationError(err.Error()), nil
			}
			params := map[string]string{"name": name}
			for _, key := range []string{"quota", "bwlimit", "maxftp", "maxsql", "maxpop", "maxsub", "maxaddon"} {
				if v := strArg(req.Params.Arguments, key); v != "" {
					if err := validateNumeric(key, v); err != nil {
						return validationError(err.Error()), nil
					}
					params[key] = v
				}
			}
			data, err := c.WHM(ctx, "addpkg", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})

	// Server
	s.AddTool(mcp.Tool{Name: "cpanel_whm_get_hostname", Description: "Get server hostname.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "gethostname", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_load_average", Description: "Get server load average.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "loadavg", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_version", Description: "Get cPanel/WHM version.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "version", nil))
}

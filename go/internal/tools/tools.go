package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ExpertVagabond/cpanel-mcp/internal/client"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

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
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Error: %s", err)}},
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
	s.AddTool(mcp.Tool{Name: "cpanel_email_list_accounts", Description: "List all email accounts with disk usage and quota information.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Filter by domain"), "regex": prop("Filter regex")}}}, uapiHandler(c, "Email", "list_pops_with_disk", []string{"domain", "regex"}))
	s.AddTool(mcp.Tool{Name: "cpanel_email_create_account", Description: "Create a new email account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address"), "password": prop("Password"), "quota": prop("Quota in MB")}, Required: []string{"email", "password"}}}, uapiHandler(c, "Email", "add_pop", []string{"email", "password", "quota"}))
	s.AddTool(mcp.Tool{Name: "cpanel_email_delete_account", Description: "Delete an email account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address")}, Required: []string{"email"}}}, uapiHandler(c, "Email", "delete_pop", []string{"email"}))
	s.AddTool(mcp.Tool{Name: "cpanel_email_set_quota", Description: "Update mailbox quota.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Email address"), "quota": prop("Quota in MB")}, Required: []string{"email", "quota"}}}, uapiHandler(c, "Email", "edit_pop_quota", []string{"email", "quota"}))
	s.AddTool(mcp.Tool{Name: "cpanel_email_list_forwarders", Description: "List email forwarders.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Filter by domain")}}}, uapiHandler(c, "Email", "list_forwarders", []string{"domain"}))
	s.AddTool(mcp.Tool{Name: "cpanel_email_create_forwarder", Description: "Create an email forwarder.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain"), "email": prop("Source email"), "fwdopt": prop("Forward action: fwd, fail, blackhole, pipe"), "fwdemail": prop("Destination email")}, Required: []string{"domain", "email", "fwdopt"}}}, uapiHandler(c, "Email", "add_forwarder", []string{"domain", "email", "fwdopt", "fwdemail"}))
}

func registerFileTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_files_list", Description: "List files and directories.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory path"), "types": prop("Filter: file, dir, both")}}}, uapiHandler(c, "Fileman", "list_files", []string{"dir", "types"}))
	s.AddTool(mcp.Tool{Name: "cpanel_files_get_content", Description: "Read file contents.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory"), "file": prop("Filename")}, Required: []string{"dir", "file"}}}, uapiHandler(c, "Fileman", "get_file_content", []string{"dir", "file"}))
	s.AddTool(mcp.Tool{Name: "cpanel_files_save", Description: "Write content to a file.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"dir": prop("Directory"), "file": prop("Filename"), "content": prop("File content")}, Required: []string{"dir", "file", "content"}}}, uapiHandler(c, "Fileman", "save_file_content", []string{"dir", "file", "content"}))
	s.AddTool(mcp.Tool{Name: "cpanel_files_delete", Description: "Delete a file or directory.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"path": prop("Full path to delete")}, Required: []string{"path"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			p := strArg(req.Params.Arguments, "path")
			data, err := c.UAPI(ctx, "Fileman", "fileop", map[string]string{"op": "unlink", "sourcefiles": p})
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
}

func registerMysqlTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_list_databases", Description: "List MySQL databases.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Mysql", "list_databases", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_create_database", Description: "Create a MySQL database.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Database name")}, Required: []string{"name"}}}, uapiHandler(c, "Mysql", "create_database", []string{"name"}))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_delete_database", Description: "Delete a MySQL database.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Database name")}, Required: []string{"name"}}}, uapiHandler(c, "Mysql", "delete_database", []string{"name"}))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_list_users", Description: "List MySQL users.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Mysql", "list_users", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_create_user", Description: "Create a MySQL user.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Username"), "password": prop("Password")}, Required: []string{"name", "password"}}}, uapiHandler(c, "Mysql", "create_user", []string{"name", "password"}))
	s.AddTool(mcp.Tool{Name: "cpanel_mysql_set_privileges", Description: "Grant privileges to a MySQL user.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "database": prop("Database"), "privileges": prop("Privileges")}, Required: []string{"user", "database", "privileges"}}}, uapiHandler(c, "Mysql", "set_privileges_on_database", []string{"user", "database", "privileges"}))
}

func registerSSLTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_ssl_list_certs", Description: "List SSL certificates.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "SSL", "list_certs", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_ssl_install_cert", Description: "Install an SSL certificate.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain"), "cert": prop("PEM certificate"), "key": prop("PEM private key"), "cabundle": prop("CA bundle")}, Required: []string{"domain", "cert", "key"}}}, uapiHandler(c, "SSL", "install_ssl", []string{"domain", "cert", "key", "cabundle"}))
	s.AddTool(mcp.Tool{Name: "cpanel_ssl_generate_csr", Description: "Generate a CSR.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domains": prop("Domain"), "city": prop("City"), "state": prop("State"), "country": prop("Country code"), "company": prop("Company"), "email": prop("Email")}, Required: []string{"domains", "city", "state", "country", "company", "email"}}}, uapiHandler(c, "SSL", "generate_csr", []string{"domains", "city", "state", "country", "company", "email"}))
}

func registerDNSTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_dns_list_zones", Description: "List DNS zones.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "DNS", "list_zones", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_dns_get_records", Description: "Get DNS records for a domain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain name")}, Required: []string{"domain"}}}, uapiHandler(c, "DNS", "parse_zone", []string{"domain"}))
	s.AddTool(mcp.Tool{Name: "cpanel_dns_add_record", Description: "Add a DNS record.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain zone"), "name": prop("Record name"), "type": prop("Record type"), "data": prop("Record value"), "ttl": prop("TTL in seconds"), "priority": prop("Priority for MX/SRV")}, Required: []string{"domain", "name", "type", "data"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			params := map[string]string{
				"domain":     strArg(req.Params.Arguments, "domain"),
				"add.0.name": strArg(req.Params.Arguments, "name"),
				"add.0.type": strArg(req.Params.Arguments, "type"),
				"add.0.data": strArg(req.Params.Arguments, "data"),
				"add.0.ttl":  "14400",
				"serial":     fmt.Sprintf("%d", 0),
			}
			if ttl := strArg(req.Params.Arguments, "ttl"); ttl != "" {
				params["add.0.ttl"] = ttl
			}
			if p := strArg(req.Params.Arguments, "priority"); p != "" {
				params["add.0.preference"] = p
			}
			data, err := c.UAPI(ctx, "DNS", "mass_edit_zone", params)
			if err != nil {
				return errorContent(err), nil
			}
			return textContent(jsonResult(data)), nil
		})
	s.AddTool(mcp.Tool{Name: "cpanel_dns_delete_record", Description: "Delete a DNS record by line number.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Domain zone"), "line": prop("Line number")}, Required: []string{"domain", "line"}}},
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			data, err := c.UAPI(ctx, "DNS", "mass_edit_zone", map[string]string{
				"domain":        strArg(req.Params.Arguments, "domain"),
				"remove.0.line": strArg(req.Params.Arguments, "line"),
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
	s.AddTool(mcp.Tool{Name: "cpanel_domains_add_subdomain", Description: "Create a subdomain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Subdomain name"), "rootdomain": prop("Root domain"), "dir": prop("Document root")}, Required: []string{"domain", "rootdomain"}}}, uapiHandler(c, "SubDomain", "addsubdomain", []string{"domain", "rootdomain", "dir"}))
	s.AddTool(mcp.Tool{Name: "cpanel_domains_remove_subdomain", Description: "Remove a subdomain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"domain": prop("Full subdomain")}, Required: []string{"domain"}}}, uapiHandler(c, "SubDomain", "delsubdomain", []string{"domain"}))
}

func registerCronTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_cron_list_jobs", Description: "List all cron jobs.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "CronJob", "list_cron", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_cron_add_job", Description: "Add a cron job.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"command": prop("Command"), "minute": prop("Minute"), "hour": prop("Hour"), "day": prop("Day"), "month": prop("Month"), "weekday": prop("Weekday")}, Required: []string{"command", "minute", "hour", "day", "month", "weekday"}}}, uapiHandler(c, "CronJob", "add_line", []string{"command", "minute", "hour", "day", "month", "weekday"}))
	s.AddTool(mcp.Tool{Name: "cpanel_cron_remove_job", Description: "Remove a cron job by line key.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"linekey": prop("Cron line key")}, Required: []string{"linekey"}}}, uapiHandler(c, "CronJob", "remove_line", []string{"linekey"}))
}

func registerBackupTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_backups_list", Description: "List available backups.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Backup", "list_backups", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_backups_create", Description: "Create a full backup.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"email": prop("Notification email")}}}, uapiHandler(c, "Backup", "fullbackup_to_homedir", []string{"email"}))
}

func registerFTPTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_ftp_list_accounts", Description: "List FTP accounts.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "Ftp", "list_ftp_with_disk", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_ftp_create_account", Description: "Create an FTP account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "pass": prop("Password"), "homedir": prop("Home directory"), "quota": prop("Quota in MB")}, Required: []string{"user", "pass"}}}, uapiHandler(c, "Ftp", "add_ftp", []string{"user", "pass", "homedir", "quota"}))
	s.AddTool(mcp.Tool{Name: "cpanel_ftp_delete_account", Description: "Delete an FTP account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "destroy": prop("Also delete home dir (1)")}, Required: []string{"user"}}}, uapiHandler(c, "Ftp", "delete_ftp", []string{"user", "destroy"}))
}

func registerPHPTools(s *server.MCPServer, c *client.CpanelClient) {
	s.AddTool(mcp.Tool{Name: "cpanel_php_get_version", Description: "Get PHP version per domain.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, uapiHandler(c, "LangPHP", "php_get_vhost_versions", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_php_set_version", Description: "Set PHP version for a domain.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"vhost": prop("Domain"), "version": prop("PHP version (ea-php81, etc)")}, Required: []string{"vhost", "version"}}}, uapiHandler(c, "LangPHP", "php_set_vhost_versions", []string{"vhost", "version"}))
}

func registerWHMTools(s *server.MCPServer, c *client.CpanelClient) {
	// Accounts
	s.AddTool(mcp.Tool{Name: "cpanel_whm_list_accounts", Description: "List all cPanel accounts on the server.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"searchtype": prop("Search field"), "search": prop("Search value")}}}, whmHandler(c, "listaccts", []string{"searchtype", "search"}))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_create_account", Description: "Create a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"username": prop("Username"), "domain": prop("Domain"), "password": prop("Password"), "plan": prop("Package"), "quota": prop("Disk quota MB"), "bwlimit": prop("Bandwidth MB"), "contactemail": prop("Contact email")}, Required: []string{"username", "domain"}}}, whmHandler(c, "createacct", []string{"username", "domain", "password", "plan", "quota", "bwlimit", "contactemail"}))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_suspend_account", Description: "Suspend a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "reason": prop("Reason")}, Required: []string{"user"}}}, whmHandler(c, "suspendacct", []string{"user", "reason"}))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_terminate_account", Description: "Permanently terminate a cPanel account.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"user": prop("Username"), "keepdns": prop("Keep DNS zone (1)")}, Required: []string{"user"}}}, whmHandler(c, "removeacct", []string{"user", "keepdns"}))
	// Services
	s.AddTool(mcp.Tool{Name: "cpanel_whm_service_status", Description: "Check all server service statuses.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "servicestatus", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_restart_service", Description: "Restart a server service.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"service": prop("Service name")}, Required: []string{"service"}}}, whmHandler(c, "restartservice", []string{"service"}))
	// Packages
	s.AddTool(mcp.Tool{Name: "cpanel_whm_list_packages", Description: "List hosting packages.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "listpkgs", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_create_package", Description: "Create a hosting package.", InputSchema: mcp.ToolInputSchema{Type: "object", Properties: map[string]any{"name": prop("Package name"), "quota": prop("Disk MB"), "bwlimit": prop("Bandwidth MB"), "maxftp": prop("Max FTP"), "maxsql": prop("Max databases"), "maxpop": prop("Max email"), "maxsub": prop("Max subdomains"), "maxaddon": prop("Max addon domains")}, Required: []string{"name"}}}, whmHandler(c, "addpkg", []string{"name", "quota", "bwlimit", "maxftp", "maxsql", "maxpop", "maxsub", "maxaddon"}))
	// Server
	s.AddTool(mcp.Tool{Name: "cpanel_whm_get_hostname", Description: "Get server hostname.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "gethostname", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_load_average", Description: "Get server load average.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "loadavg", nil))
	s.AddTool(mcp.Tool{Name: "cpanel_whm_version", Description: "Get cPanel/WHM version.", InputSchema: mcp.ToolInputSchema{Type: "object"}}, whmHandler(c, "version", nil))
}

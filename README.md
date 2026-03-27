# cpanel-mcp

**Most complete cPanel MCP server -- 47 tools across UAPI + WHM. Nearly 2x the nearest competitor.**

[![npm version](https://img.shields.io/npm/v/cpanel-mcp.svg)](https://www.npmjs.com/package/cpanel-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tools: 47](https://img.shields.io/badge/tools-47-green)]()

---

Full cPanel and WHM management through the Model Context Protocol. 36 UAPI tools for user-level operations (email, DNS, MySQL, SSL, files, FTP, cron, domains, PHP, backups) plus 11 WHM tools for server administration (accounts, packages, services). Available as npm, PyPI, and Go packages.

## Install

```bash
npx cpanel-mcp          # TypeScript (npm)
uvx cpanel-mcp          # Python (PyPI)
go install github.com/ExpertVagabond/cpanel-mcp/cmd/cpanel-mcp@latest  # Go
```

## Configure

Add to `claude_desktop_config.json` or `~/.mcp.json`:

```json
{
  "mcpServers": {
    "cpanel": {
      "command": "npx",
      "args": ["-y", "cpanel-mcp"],
      "env": {
        "CPANEL_HOST": "server.example.com",
        "CPANEL_USERNAME": "myuser",
        "CPANEL_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CPANEL_HOST` | Yes | -- | Server hostname |
| `CPANEL_USERNAME` | Yes | -- | cPanel username |
| `CPANEL_API_TOKEN` | Yes | -- | [API token](https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/) |
| `CPANEL_PORT` | No | `2083` | UAPI port |
| `CPANEL_WHM_PORT` | No | `2087` | WHM API port |
| `CPANEL_WHM_USERNAME` | No | `root` | WHM username |
| `CPANEL_VERIFY_SSL` | No | `false` | Verify TLS certificates |

## Tool Reference

### UAPI -- User-Level (36 tools)

| Category | Tools | Count |
|---|---|---|
| **Email** | `cpanel_email_list_accounts` `cpanel_email_create_account` `cpanel_email_delete_account` `cpanel_email_set_quota` `cpanel_email_list_forwarders` `cpanel_email_create_forwarder` | 6 |
| **Files** | `cpanel_files_list` `cpanel_files_get_content` `cpanel_files_save` `cpanel_files_delete` | 4 |
| **MySQL** | `cpanel_mysql_list_databases` `cpanel_mysql_create_database` `cpanel_mysql_delete_database` `cpanel_mysql_list_users` `cpanel_mysql_create_user` `cpanel_mysql_set_privileges` | 6 |
| **SSL** | `cpanel_ssl_list_certs` `cpanel_ssl_install_cert` `cpanel_ssl_generate_csr` | 3 |
| **DNS** | `cpanel_dns_list_zones` `cpanel_dns_get_records` `cpanel_dns_add_record` `cpanel_dns_delete_record` | 4 |
| **Domains** | `cpanel_domains_list` `cpanel_domains_add_subdomain` `cpanel_domains_remove_subdomain` | 3 |
| **Cron** | `cpanel_cron_list_jobs` `cpanel_cron_add_job` `cpanel_cron_remove_job` | 3 |
| **Backups** | `cpanel_backups_list` `cpanel_backups_create` | 2 |
| **FTP** | `cpanel_ftp_list_accounts` `cpanel_ftp_create_account` `cpanel_ftp_delete_account` | 3 |
| **PHP** | `cpanel_php_get_version` `cpanel_php_set_version` | 2 |

### WHM -- Admin-Level (11 tools)

| Category | Tools | Count |
|---|---|---|
| **Accounts** | `cpanel_whm_list_accounts` `cpanel_whm_create_account` `cpanel_whm_suspend_account` `cpanel_whm_terminate_account` | 4 |
| **Services** | `cpanel_whm_service_status` `cpanel_whm_restart_service` | 2 |
| **Packages** | `cpanel_whm_list_packages` `cpanel_whm_create_package` | 2 |
| **Server** | `cpanel_whm_get_hostname` `cpanel_whm_load_average` `cpanel_whm_version` | 3 |

## Usage Examples

```
You: List all email accounts on my server
Claude: [calls cpanel_email_list_accounts] Found 12 email accounts on example.com...

You: Create a new MySQL database called "app_prod"
Claude: [calls cpanel_mysql_create_database] Database "app_prod" created successfully.

You: Add a CNAME record pointing blog to my main domain
Claude: [calls cpanel_dns_add_record] Added CNAME record: blog -> example.com

You: What's the server load?
Claude: [calls cpanel_whm_load_average] Load: 0.42, 0.38, 0.35 (1m, 5m, 15m)
```

## Why This One?

| | cpanel-mcp | [ringo380/cpanel-mcp](https://github.com/ringo380/cpanel-mcp) |
|---|---|---|
| **Tool count** | 47 | 27 |
| **WHM admin tools** | 11 (accounts, services, packages, server) | Limited |
| **API coverage** | UAPI + WHM API 1 | UAPI only |
| **Languages** | TypeScript, Python, Go | TypeScript |
| **Email management** | Full CRUD + forwarders + quotas | Basic |
| **MySQL** | Full CRUD + users + privileges | Basic |
| **SSL** | List + install + CSR generation | No |
| **Backups** | List + create | No |

47 tools covering 14 categories across both UAPI and WHM. The next-largest cPanel MCP has 27 tools with no WHM coverage.

## API Reference

- **UAPI** (port 2083): User-level operations -- email, files, databases, SSL, DNS
- **WHM API 1** (port 2087): Server admin -- accounts, services, packages, server info
- Auth: `Authorization: cpanel USER:TOKEN` (UAPI) or `whm root:TOKEN` (WHM)

## Development

```bash
cd typescript && npm install && npm run build
npx @modelcontextprotocol/inspector build/index.js
```

## Related Projects

- [ordinals-mcp](https://github.com/ExpertVagabond/ordinals-mcp) -- Bitcoin Ordinals MCP server
- [solana-mcp-server-app](https://github.com/ExpertVagabond/solana-mcp-server-app) -- Solana wallet + DeFi MCP
- [solmail-mcp](https://github.com/ExpertVagabond/solmail-mcp) -- On-chain mail via Solana

## License

[MIT](LICENSE) -- [Purple Squirrel Media](https://github.com/ExpertVagabond)

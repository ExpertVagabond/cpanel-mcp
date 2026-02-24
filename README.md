# cpanel-mcp

cPanel & WHM MCP Server — manage hosting via [Model Context Protocol](https://modelcontextprotocol.io).

**47 tools** across 14 categories covering both UAPI (user-level) and WHM API 1 (admin-level) operations. Available in **TypeScript**, **Python**, and **Go**.

## Quick Start

### TypeScript (npm)
```bash
npx cpanel-mcp
```

### Python (PyPI)
```bash
uvx cpanel-mcp
```

### Go
```bash
go install github.com/ExpertVagabond/cpanel-mcp/cmd/cpanel-mcp@latest
cpanel-mcp
```

## Configuration

Set these environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CPANEL_HOST` | Yes | — | Server hostname (e.g., `server.example.com`) |
| `CPANEL_USERNAME` | Yes | — | cPanel username |
| `CPANEL_API_TOKEN` | Yes | — | API token ([generate here](https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/)) |
| `CPANEL_PORT` | No | `2083` | UAPI port |
| `CPANEL_WHM_PORT` | No | `2087` | WHM API port |
| `CPANEL_WHM_USERNAME` | No | `root` | WHM username |
| `CPANEL_VERIFY_SSL` | No | `false` | Verify TLS certificates |

## Claude Code Integration

Add to your Claude Code settings (`~/.claude/settings.json`):

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

## Tools (47)

### UAPI (User-Level) — 36 tools

| Category | Tools |
|----------|-------|
| **Email** | `cpanel_email_list_accounts`, `create_account`, `delete_account`, `set_quota`, `list_forwarders`, `create_forwarder` |
| **Files** | `cpanel_files_list`, `get_content`, `save`, `delete` |
| **MySQL** | `cpanel_mysql_list_databases`, `create_database`, `delete_database`, `list_users`, `create_user`, `set_privileges` |
| **SSL** | `cpanel_ssl_list_certs`, `install_cert`, `generate_csr` |
| **DNS** | `cpanel_dns_list_zones`, `get_records`, `add_record`, `delete_record` |
| **Domains** | `cpanel_domains_list`, `add_subdomain`, `remove_subdomain` |
| **Cron** | `cpanel_cron_list_jobs`, `add_job`, `remove_job` |
| **Backups** | `cpanel_backups_list`, `create` |
| **FTP** | `cpanel_ftp_list_accounts`, `create_account`, `delete_account` |
| **PHP** | `cpanel_php_get_version`, `set_version` |

### WHM (Admin-Level) — 11 tools

| Category | Tools |
|----------|-------|
| **Accounts** | `cpanel_whm_list_accounts`, `create_account`, `suspend_account`, `terminate_account` |
| **Services** | `cpanel_whm_service_status`, `restart_service` |
| **Packages** | `cpanel_whm_list_packages`, `create_package` |
| **Server** | `cpanel_whm_get_hostname`, `load_average`, `version` |

## API Reference

This server targets two cPanel API layers:

- **UAPI** (port 2083): User-level operations — email, files, databases, SSL, DNS, etc.
- **WHM API 1** (port 2087): Server admin — accounts, services, packages, server info

Auth uses API tokens: `Authorization: cpanel USER:TOKEN` (UAPI) or `Authorization: whm root:TOKEN` (WHM).

## Development

```bash
# TypeScript
cd typescript && npm install && npm run build
npx @modelcontextprotocol/inspector build/index.js

# Python
cd python && pip install -e ".[dev]"
python -m cpanel_mcp

# Go
cd go && make build
./bin/cpanel-mcp
```

## License

MIT — Purple Squirrel Media

# :gear: cpanel-mcp

[![npm version](https://img.shields.io/npm/v/cpanel-mcp.svg)](https://www.npmjs.com/package/cpanel-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/ExpertVagabond/cpanel-mcp)](https://github.com/ExpertVagabond/cpanel-mcp/stargazers)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**cPanel & WHM MCP Server** -- manage hosting infrastructure via [Model Context Protocol](https://modelcontextprotocol.io). 47 tools across 14 categories covering UAPI (user-level) and WHM API 1 (admin-level) operations. Available in TypeScript, Python, and Go.

## Install

```bash
npx cpanel-mcp          # TypeScript (npm)
uvx cpanel-mcp          # Python (PyPI)
go install github.com/ExpertVagabond/cpanel-mcp/cmd/cpanel-mcp@latest  # Go
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CPANEL_HOST` | Yes | -- | Server hostname |
| `CPANEL_USERNAME` | Yes | -- | cPanel username |
| `CPANEL_API_TOKEN` | Yes | -- | [API token](https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/) |
| `CPANEL_PORT` | No | `2083` | UAPI port |
| `CPANEL_WHM_PORT` | No | `2087` | WHM API port |
| `CPANEL_WHM_USERNAME` | No | `root` | WHM username |
| `CPANEL_VERIFY_SSL` | No | `false` | Verify TLS certificates |

## Claude Code / Claude Desktop Integration

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

### UAPI -- User-Level (36 tools)

| Category | Tools |
|----------|-------|
| **Email** (6) | `list_accounts`, `create_account`, `delete_account`, `set_quota`, `list_forwarders`, `create_forwarder` |
| **Files** (4) | `list`, `get_content`, `save`, `delete` |
| **MySQL** (6) | `list_databases`, `create_database`, `delete_database`, `list_users`, `create_user`, `set_privileges` |
| **SSL** (3) | `list_certs`, `install_cert`, `generate_csr` |
| **DNS** (4) | `list_zones`, `get_records`, `add_record`, `delete_record` |
| **Domains** (3) | `list`, `add_subdomain`, `remove_subdomain` |
| **Cron** (3) | `list_jobs`, `add_job`, `remove_job` |
| **Backups** (2) | `list`, `create` |
| **FTP** (3) | `list_accounts`, `create_account`, `delete_account` |
| **PHP** (2) | `get_version`, `set_version` |

### WHM -- Admin-Level (11 tools)

| Category | Tools |
|----------|-------|
| **Accounts** (4) | `list_accounts`, `create_account`, `suspend_account`, `terminate_account` |
| **Services** (2) | `service_status`, `restart_service` |
| **Packages** (2) | `list_packages`, `create_package` |
| **Server** (3) | `get_hostname`, `load_average`, `version` |

## Usage Example

```
You: List all email accounts on my server
Claude: [calls cpanel_email_list_accounts] Found 12 email accounts on example.com...

You: Create a new MySQL database called "app_prod"
Claude: [calls cpanel_mysql_create_database] Database "app_prod" created successfully.
```

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

## License

MIT -- [Purple Squirrel Media](https://github.com/ExpertVagabond)

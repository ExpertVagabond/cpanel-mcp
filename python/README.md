# cpanel-mcp (Python)

Python implementation of the cPanel & WHM MCP server — 47 tools over the cPanel
UAPI and WHM API, built on [FastMCP](https://github.com/modelcontextprotocol/python-sdk).

This is one of three implementations in this repository; see the
[repository README](../README.md) for the TypeScript and Go versions.

## Install

```bash
pip install -e .
```

## Run

```bash
cpanel-mcp          # console script
python -m cpanel_mcp
```

## Configuration

Configured entirely through environment variables:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `CPANEL_HOST` | yes | — | cPanel/WHM hostname |
| `CPANEL_USERNAME` | yes | — | cPanel account username |
| `CPANEL_API_TOKEN` | yes | — | API token for authentication |
| `CPANEL_WHM_USERNAME` | for WHM tools | — | WHM (reseller/root) username |
| `CPANEL_PORT` | no | `2083` | cPanel UAPI port |
| `CPANEL_WHM_PORT` | no | `2087` | WHM API port |
| `CPANEL_VERIFY_SSL` | no | `false` | Set `true` to verify TLS certificates |
| `CPANEL_TIMEOUT` | no | `30` | Request timeout in seconds |

## Tools

47 tools across 11 modules:

| Module | Tools | Covers |
|---|---:|---|
| `whm` | 12 | WHM account and server administration |
| `email` | 7 | Mailboxes, forwarders, filters |
| `mysql` | 7 | Databases, users, grants |
| `dns` | 5 | Zones and records |
| `files` | 5 | File management |
| `cron` | 4 | Scheduled jobs |
| `domains` | 4 | Addon, parked, and subdomains |
| `ftp` | 4 | FTP accounts |
| `ssl` | 4 | Certificates |
| `backups` | 3 | Backup listing and restore |
| `php` | 3 | PHP version and settings |

## Layout

```
src/cpanel_mcp/
  server.py      FastMCP server, registers every tool module
  config.py      environment-based configuration
  tools/         one module per cPanel/WHM area
```

## License

MIT

# cPanel MCP Server

Polyglot monorepo: TypeScript (npm), Python (PyPI), Go module.

## Structure
- `schemas/tools.json` — shared tool definitions (source of truth)
- `typescript/` — TypeScript/Node MCP server
- `python/` — Python MCP server (FastMCP + httpx)
- `go/` — Go MCP server (mcp-go SDK)

## Build Commands
- TypeScript: `cd typescript && npm run build`
- Python: `cd python && pip install -e ".[dev]"`
- Go: `cd go && make build`

## Config (env vars)
- `CPANEL_HOST` (required) — cPanel server hostname
- `CPANEL_USERNAME` (required) — cPanel username
- `CPANEL_API_TOKEN` (required) — API token
- `CPANEL_PORT` — UAPI port (default: 2083)
- `CPANEL_WHM_PORT` — WHM port (default: 2087)
- `CPANEL_VERIFY_SSL` — verify TLS (default: false)

## Conventions
- Follow ordinals-mcp patterns for TypeScript (McpAction, Zod, esbuild)
- Follow FastMCP patterns for Python (@mcp.tool decorators)
- Follow mcp-go SDK patterns for Go
- All tools prefixed with `cpanel_`
- UAPI tools: `cpanel_{category}_{action}`
- WHM tools: `cpanel_whm_{category}_{action}`

#!/bin/bash
# Wrapper that reads API token from vault and launches cpanel-mcp
# Read token from file descriptor 3 to avoid consuming stdin (MCP uses stdin)
export CPANEL_API_TOKEN="$(cat < /Volumes/Virtual\ Server/configs/credentials/cpanel/api-token)"
exec node "/Volumes/Virtual Server/projects/cpanel-mcp/typescript/build/index.js" </dev/stdin

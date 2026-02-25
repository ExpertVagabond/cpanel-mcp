#!/bin/bash
# Wrapper that reads cPanel token from vault and starts MCP server
export CPANEL_HOST="server392.web-hosting.com"
export CPANEL_USERNAME="purpzxrc"
export CPANEL_API_TOKEN="$(cat "/Volumes/Virtual Server/configs/credentials/cpanel/api-token")"
exec node "/Volumes/Virtual Server/projects/cpanel-mcp/typescript/build/index.js"

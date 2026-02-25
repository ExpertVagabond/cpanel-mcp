#!/bin/bash
# Wrapper that reads API token from vault and launches cpanel-mcp
export CPANEL_API_TOKEN="$(cat /Volumes/Virtual\ Server/configs/credentials/cpanel/api-token)"
exec node "/Volumes/Virtual Server/projects/cpanel-mcp/typescript/build/index.js"

"""DNS zone management tools (UAPI DNS module)."""

import time

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_dns_list_zones() -> str:
        """List all DNS zones for the account."""
        data = await uapi_call(config, "DNS", "list_zones")
        return str(data)

    @mcp.tool()
    async def cpanel_dns_get_records(domain: str) -> str:
        """Get all DNS records for a specific domain zone."""
        data = await uapi_call(config, "DNS", "parse_zone", {"domain": domain})
        return str(data)

    @mcp.tool()
    async def cpanel_dns_add_record(
        domain: str, name: str, type: str, data: str, ttl: str = "14400", priority: str = "",
    ) -> str:
        """Add a DNS record (A, AAAA, CNAME, MX, TXT, SRV, CAA)."""
        params: dict[str, str] = {
            "domain": domain,
            "add.0.name": name,
            "add.0.type": type,
            "add.0.data": data,
            "add.0.ttl": ttl,
            "serial": str(int(time.time())),
        }
        if priority:
            params["add.0.preference"] = priority
        result = await uapi_call(config, "DNS", "mass_edit_zone", params)
        return str(result)

    @mcp.tool()
    async def cpanel_dns_delete_record(domain: str, line: str) -> str:
        """Delete a DNS record by line number (use cpanel_dns_get_records to find it)."""
        result = await uapi_call(config, "DNS", "mass_edit_zone", {
            "domain": domain,
            "remove.0.line": line,
            "serial": str(int(time.time())),
        })
        return str(result)

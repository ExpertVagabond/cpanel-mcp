"""Domain management tools (UAPI DomainInfo/SubDomain modules)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_domains_list() -> str:
        """List all domains, subdomains, addon domains, and parked domains."""
        data = await uapi_call(config, "DomainInfo", "list_domains")
        return str(data)

    @mcp.tool()
    async def cpanel_domains_add_subdomain(domain: str, rootdomain: str, dir: str = "") -> str:
        """Create a new subdomain under an existing domain."""
        params: dict[str, str] = {"domain": domain, "rootdomain": rootdomain}
        if dir:
            params["dir"] = dir
        data = await uapi_call(config, "SubDomain", "addsubdomain", params)
        return str(data)

    @mcp.tool()
    async def cpanel_domains_remove_subdomain(domain: str) -> str:
        """Remove a subdomain."""
        data = await uapi_call(config, "SubDomain", "delsubdomain", {"domain": domain})
        return str(data)

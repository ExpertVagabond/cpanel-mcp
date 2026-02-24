"""PHP configuration tools (UAPI LangPHP module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_php_get_version() -> str:
        """Get PHP version for each domain/vhost."""
        data = await uapi_call(config, "LangPHP", "php_get_vhost_versions")
        return str(data)

    @mcp.tool()
    async def cpanel_php_set_version(vhost: str, version: str) -> str:
        """Set PHP version for a domain (e.g., ea-php81, ea-php82, ea-php83)."""
        data = await uapi_call(config, "LangPHP", "php_set_vhost_versions", {"vhost": vhost, "version": version})
        return str(data)

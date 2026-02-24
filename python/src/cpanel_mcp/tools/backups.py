"""Backup tools (UAPI Backup module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_backups_list() -> str:
        """List available backups."""
        data = await uapi_call(config, "Backup", "list_backups")
        return str(data)

    @mcp.tool()
    async def cpanel_backups_create(email: str = "") -> str:
        """Create a full backup to the home directory."""
        params: dict[str, str] = {}
        if email:
            params["email"] = email
        data = await uapi_call(config, "Backup", "fullbackup_to_homedir", params)
        return str(data)

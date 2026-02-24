"""FTP account tools (UAPI Ftp module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_ftp_list_accounts() -> str:
        """List all FTP accounts with disk usage."""
        data = await uapi_call(config, "Ftp", "list_ftp_with_disk")
        return str(data)

    @mcp.tool()
    async def cpanel_ftp_create_account(user: str, pass_: str, homedir: str = "", quota: str = "") -> str:
        """Create a new FTP account."""
        params: dict[str, str] = {"user": user, "pass": pass_}
        if homedir:
            params["homedir"] = homedir
        if quota:
            params["quota"] = quota
        data = await uapi_call(config, "Ftp", "add_ftp", params)
        return str(data)

    @mcp.tool()
    async def cpanel_ftp_delete_account(user: str, destroy: str = "") -> str:
        """Delete an FTP account."""
        params: dict[str, str] = {"user": user}
        if destroy:
            params["destroy"] = destroy
        data = await uapi_call(config, "Ftp", "delete_ftp", params)
        return str(data)

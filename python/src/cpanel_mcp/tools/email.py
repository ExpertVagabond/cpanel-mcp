"""Email management tools (UAPI Email module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_email_list_accounts(domain: str = "", regex: str = "") -> str:
        """List all email accounts with disk usage and quota information."""
        params: dict[str, str] = {}
        if domain:
            params["domain"] = domain
        if regex:
            params["regex"] = regex
        data = await uapi_call(config, "Email", "list_pops_with_disk", params)
        return str(data)

    @mcp.tool()
    async def cpanel_email_create_account(email: str, password: str, quota: str = "") -> str:
        """Create a new email account with password and optional quota."""
        params: dict[str, str] = {"email": email, "password": password}
        if quota:
            params["quota"] = quota
        data = await uapi_call(config, "Email", "add_pop", params)
        return str(data)

    @mcp.tool()
    async def cpanel_email_delete_account(email: str) -> str:
        """Delete an email account permanently."""
        data = await uapi_call(config, "Email", "delete_pop", {"email": email})
        return str(data)

    @mcp.tool()
    async def cpanel_email_set_quota(email: str, quota: str) -> str:
        """Update the mailbox size quota for an email account."""
        data = await uapi_call(config, "Email", "edit_pop_quota", {"email": email, "quota": quota})
        return str(data)

    @mcp.tool()
    async def cpanel_email_list_forwarders(domain: str = "") -> str:
        """List all email forwarders, optionally filtered by domain."""
        params: dict[str, str] = {}
        if domain:
            params["domain"] = domain
        data = await uapi_call(config, "Email", "list_forwarders", params)
        return str(data)

    @mcp.tool()
    async def cpanel_email_create_forwarder(domain: str, email: str, fwdopt: str, fwdemail: str = "") -> str:
        """Create an email forwarder (fwdopt: fwd, fail, blackhole, pipe)."""
        params: dict[str, str] = {"domain": domain, "email": email, "fwdopt": fwdopt}
        if fwdemail:
            params["fwdemail"] = fwdemail
        data = await uapi_call(config, "Email", "add_forwarder", params)
        return str(data)

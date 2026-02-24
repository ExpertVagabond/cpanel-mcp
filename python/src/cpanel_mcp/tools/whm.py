"""WHM server administration tools (WHM API 1)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import whm_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    # --- Accounts ---

    @mcp.tool()
    async def cpanel_whm_list_accounts(searchtype: str = "", search: str = "") -> str:
        """List all cPanel accounts on the server. Filter by domain, owner, user, ip, or package."""
        params: dict[str, str] = {}
        if searchtype:
            params["searchtype"] = searchtype
        if search:
            params["search"] = search
        data = await whm_call(config, "listaccts", params)
        return str(data)

    @mcp.tool()
    async def cpanel_whm_create_account(
        username: str, domain: str, password: str = "", plan: str = "",
        quota: str = "", bwlimit: str = "", contactemail: str = "",
    ) -> str:
        """Create a new cPanel account with domain and optional package."""
        params: dict[str, str] = {"username": username, "domain": domain}
        if password:
            params["password"] = password
        if plan:
            params["plan"] = plan
        if quota:
            params["quota"] = quota
        if bwlimit:
            params["bwlimit"] = bwlimit
        if contactemail:
            params["contactemail"] = contactemail
        data = await whm_call(config, "createacct", params)
        return str(data)

    @mcp.tool()
    async def cpanel_whm_suspend_account(user: str, reason: str = "") -> str:
        """Suspend a cPanel account."""
        params: dict[str, str] = {"user": user}
        if reason:
            params["reason"] = reason
        data = await whm_call(config, "suspendacct", params)
        return str(data)

    @mcp.tool()
    async def cpanel_whm_terminate_account(user: str, keepdns: str = "") -> str:
        """Permanently terminate a cPanel account. Irreversible."""
        params: dict[str, str] = {"user": user}
        if keepdns:
            params["keepdns"] = keepdns
        data = await whm_call(config, "removeacct", params)
        return str(data)

    # --- Services ---

    @mcp.tool()
    async def cpanel_whm_service_status() -> str:
        """Check status of all server services (Apache, MySQL, Exim, etc.)."""
        data = await whm_call(config, "servicestatus")
        return str(data)

    @mcp.tool()
    async def cpanel_whm_restart_service(service: str) -> str:
        """Restart a server service (httpd, mysql, exim, named, ftpd, dovecot, etc.)."""
        data = await whm_call(config, "restartservice", {"service": service})
        return str(data)

    # --- Packages ---

    @mcp.tool()
    async def cpanel_whm_list_packages() -> str:
        """List all hosting packages."""
        data = await whm_call(config, "listpkgs")
        return str(data)

    @mcp.tool()
    async def cpanel_whm_create_package(
        name: str, quota: str = "", bwlimit: str = "", maxftp: str = "",
        maxsql: str = "", maxpop: str = "", maxsub: str = "", maxaddon: str = "",
    ) -> str:
        """Create a hosting package with resource limits."""
        params: dict[str, str] = {"name": name}
        for k, v in {"quota": quota, "bwlimit": bwlimit, "maxftp": maxftp,
                      "maxsql": maxsql, "maxpop": maxpop, "maxsub": maxsub,
                      "maxaddon": maxaddon}.items():
            if v:
                params[k] = v
        data = await whm_call(config, "addpkg", params)
        return str(data)

    # --- Server ---

    @mcp.tool()
    async def cpanel_whm_get_hostname() -> str:
        """Get the server hostname."""
        data = await whm_call(config, "gethostname")
        return str(data)

    @mcp.tool()
    async def cpanel_whm_load_average() -> str:
        """Get current server load average."""
        data = await whm_call(config, "loadavg")
        return str(data)

    @mcp.tool()
    async def cpanel_whm_version() -> str:
        """Get cPanel/WHM version information."""
        data = await whm_call(config, "version")
        return str(data)

"""MySQL database tools (UAPI Mysql module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_mysql_list_databases() -> str:
        """List all MySQL databases for the account."""
        data = await uapi_call(config, "Mysql", "list_databases")
        return str(data)

    @mcp.tool()
    async def cpanel_mysql_create_database(name: str) -> str:
        """Create a new MySQL database (auto-prefixed with cPanel username)."""
        data = await uapi_call(config, "Mysql", "create_database", {"name": name})
        return str(data)

    @mcp.tool()
    async def cpanel_mysql_delete_database(name: str) -> str:
        """Delete a MySQL database permanently."""
        data = await uapi_call(config, "Mysql", "delete_database", {"name": name})
        return str(data)

    @mcp.tool()
    async def cpanel_mysql_list_users() -> str:
        """List all MySQL users for the account."""
        data = await uapi_call(config, "Mysql", "list_users")
        return str(data)

    @mcp.tool()
    async def cpanel_mysql_create_user(name: str, password: str) -> str:
        """Create a new MySQL user with a password."""
        data = await uapi_call(config, "Mysql", "create_user", {"name": name, "password": password})
        return str(data)

    @mcp.tool()
    async def cpanel_mysql_set_privileges(user: str, database: str, privileges: str) -> str:
        """Grant privileges to a MySQL user on a database."""
        data = await uapi_call(
            config, "Mysql", "set_privileges_on_database",
            {"user": user, "database": database, "privileges": privileges},
        )
        return str(data)

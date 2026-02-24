"""Cron job tools (UAPI CronJob module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_cron_list_jobs() -> str:
        """List all cron jobs."""
        data = await uapi_call(config, "CronJob", "list_cron")
        return str(data)

    @mcp.tool()
    async def cpanel_cron_add_job(
        command: str, minute: str, hour: str, day: str, month: str, weekday: str,
    ) -> str:
        """Add a new cron job with schedule and command."""
        data = await uapi_call(config, "CronJob", "add_line", {
            "command": command, "minute": minute, "hour": hour,
            "day": day, "month": month, "weekday": weekday,
        })
        return str(data)

    @mcp.tool()
    async def cpanel_cron_remove_job(linekey: str) -> str:
        """Remove a cron job by line key (use cpanel_cron_list_jobs first)."""
        data = await uapi_call(config, "CronJob", "remove_line", {"linekey": linekey})
        return str(data)

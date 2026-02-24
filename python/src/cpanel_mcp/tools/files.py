"""File management tools (UAPI Fileman module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_files_list(dir: str = "", types: str = "") -> str:
        """List files and directories in a given path."""
        params: dict[str, str] = {}
        if dir:
            params["dir"] = dir
        if types:
            params["types"] = types
        data = await uapi_call(config, "Fileman", "list_files", params)
        return str(data)

    @mcp.tool()
    async def cpanel_files_get_content(dir: str, file: str) -> str:
        """Read the contents of a text file."""
        data = await uapi_call(config, "Fileman", "get_file_content", {"dir": dir, "file": file})
        return str(data)

    @mcp.tool()
    async def cpanel_files_save(dir: str, file: str, content: str) -> str:
        """Write content to a file. Creates or overwrites."""
        data = await uapi_call(config, "Fileman", "save_file_content", {"dir": dir, "file": file, "content": content})
        return str(data)

    @mcp.tool()
    async def cpanel_files_delete(path: str) -> str:
        """Delete a file or directory."""
        data = await uapi_call(config, "Fileman", "fileop", {"op": "unlink", "sourcefiles": path})
        return str(data)

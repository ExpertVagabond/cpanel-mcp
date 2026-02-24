"""cPanel MCP Server — FastMCP implementation."""

from mcp.server.fastmcp import FastMCP

from .config import load_config
from .tools import email, files, mysql, ssl, dns, domains, cron, backups, ftp, php, whm

mcp = FastMCP("cpanel-mcp")


def _register_all() -> None:
    config = load_config()
    email.register(mcp, config)
    files.register(mcp, config)
    mysql.register(mcp, config)
    ssl.register(mcp, config)
    dns.register(mcp, config)
    domains.register(mcp, config)
    cron.register(mcp, config)
    backups.register(mcp, config)
    ftp.register(mcp, config)
    php.register(mcp, config)
    whm.register(mcp, config)


_register_all()


def main() -> None:
    mcp.run()

"""SSL certificate tools (UAPI SSL module)."""

from mcp.server.fastmcp import FastMCP

from ..config import CpanelConfig
from ..client import uapi_call


def register(mcp: FastMCP, config: CpanelConfig) -> None:
    @mcp.tool()
    async def cpanel_ssl_list_certs() -> str:
        """List all installed SSL certificates."""
        data = await uapi_call(config, "SSL", "list_certs")
        return str(data)

    @mcp.tool()
    async def cpanel_ssl_install_cert(domain: str, cert: str, key: str, cabundle: str = "") -> str:
        """Install an SSL certificate for a domain."""
        params: dict[str, str] = {"domain": domain, "cert": cert, "key": key}
        if cabundle:
            params["cabundle"] = cabundle
        data = await uapi_call(config, "SSL", "install_ssl", params)
        return str(data)

    @mcp.tool()
    async def cpanel_ssl_generate_csr(
        domains: str, city: str, state: str, country: str, company: str, email: str,
    ) -> str:
        """Generate a Certificate Signing Request (CSR) for a domain."""
        data = await uapi_call(config, "SSL", "generate_csr", {
            "domains": domains, "city": city, "state": state,
            "country": country, "company": company, "email": email,
        })
        return str(data)

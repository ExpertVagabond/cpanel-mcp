"""Base HTTP client for cPanel API calls."""

import httpx

from ..config import CpanelConfig

_client: httpx.AsyncClient | None = None


class CpanelApiError(Exception):
    def __init__(self, status: int, message: str, raw: dict | None = None):
        super().__init__(f"cPanel API {status}: {message}")
        self.status = status
        self.raw = raw


async def get_client(config: CpanelConfig) -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            verify=config.verify_ssl,
            timeout=config.timeout,
        )
    return _client


async def request(
    config: CpanelConfig,
    api_type: str,
    path: str,
    params: dict[str, str] | None = None,
) -> dict:
    client = await get_client(config)
    port = config.port if api_type == "uapi" else config.whm_port
    auth_prefix = "cpanel" if api_type == "uapi" else "whm"
    auth_user = config.username if api_type == "uapi" else config.whm_username

    url = f"https://{config.host}:{port}{path}"
    response = await client.get(
        url,
        params=params,
        headers={
            "Authorization": f"{auth_prefix} {auth_user}:{config.token}",
            "Accept": "application/json",
        },
    )
    response.raise_for_status()
    return response.json()

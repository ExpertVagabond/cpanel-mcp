"""UAPI client (port 2083, user-level operations)."""

from ..config import CpanelConfig
from .base import CpanelApiError, request


async def uapi_call(
    config: CpanelConfig,
    module: str,
    function: str,
    params: dict[str, str] | None = None,
) -> dict:
    raw = await request(config, "uapi", f"/execute/{module}/{function}", params)
    result = raw.get("result", {})
    if result.get("status") != 1:
        errors = result.get("errors") or ["Unknown UAPI error"]
        raise CpanelApiError(0, "; ".join(errors), raw)
    return result.get("data", {})

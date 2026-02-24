"""WHM API 1 client (port 2087, admin-level operations)."""

from ..config import CpanelConfig
from .base import CpanelApiError, request


async def whm_call(
    config: CpanelConfig,
    function: str,
    params: dict[str, str] | None = None,
) -> dict:
    all_params = {"api.version": "1", **(params or {})}
    raw = await request(config, "whm", f"/json-api/{function}", all_params)
    metadata = raw.get("metadata", {})
    if metadata.get("result") != 1:
        raise CpanelApiError(0, metadata.get("reason", "Unknown WHM error"), raw)
    return raw.get("data", {})

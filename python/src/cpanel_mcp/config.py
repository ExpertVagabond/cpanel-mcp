"""Configuration from environment variables."""

import os
from dataclasses import dataclass


@dataclass
class CpanelConfig:
    host: str
    username: str
    token: str
    port: int = 2083
    whm_port: int = 2087
    whm_username: str = "root"
    verify_ssl: bool = False
    timeout: float = 30.0


def load_config() -> CpanelConfig:
    host = os.environ.get("CPANEL_HOST", "")
    username = os.environ.get("CPANEL_USERNAME", "")
    token = os.environ.get("CPANEL_API_TOKEN", "")

    if not host:
        raise ValueError("CPANEL_HOST environment variable is required")
    if not username:
        raise ValueError("CPANEL_USERNAME environment variable is required")
    if not token:
        raise ValueError("CPANEL_API_TOKEN environment variable is required")

    return CpanelConfig(
        host=host,
        username=username,
        token=token,
        port=int(os.environ.get("CPANEL_PORT", "2083")),
        whm_port=int(os.environ.get("CPANEL_WHM_PORT", "2087")),
        whm_username=os.environ.get("CPANEL_WHM_USERNAME", "root"),
        verify_ssl=os.environ.get("CPANEL_VERIFY_SSL", "").lower() == "true",
        timeout=float(os.environ.get("CPANEL_TIMEOUT", "30")),
    )

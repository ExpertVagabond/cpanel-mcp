"""cPanel API clients."""

from .uapi import uapi_call
from .whm import whm_call

__all__ = ["uapi_call", "whm_call"]

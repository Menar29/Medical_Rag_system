"""
API key authentication middleware.

Keys are read from the API_KEY environment variable (comma-separated for rotation).
Set REQUIRE_API_KEY=false to disable auth (dev/local only).

Usage (in routes):
    from .auth import require_api_key
    @router.post("/query", dependencies=[Depends(require_api_key)])
"""

import os
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

_REQUIRE = os.getenv("REQUIRE_API_KEY", "true").lower() not in ("false", "0", "no")


def _get_valid_keys() -> set[str]:
    raw = os.getenv("API_KEY", "")
    return {k.strip() for k in raw.split(",") if k.strip()}


def require_api_key(api_key: str = Security(_API_KEY_HEADER)) -> str:
    """FastAPI dependency — raises 401 if the key is invalid."""
    if not _REQUIRE:
        return "dev"

    valid = _get_valid_keys()
    if not valid:
        # No key configured → warn but allow (avoids hard lockout on fresh deploy)
        return "unconfigured"

    if not api_key or api_key not in valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API invalide ou absente. Fournissez l'en-tête X-API-Key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return api_key

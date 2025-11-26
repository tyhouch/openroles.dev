from fastapi import Header, HTTPException, status

from app.config import settings


def verify_admin_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    """
    Verify the admin API key from the X-API-Key header.

    Used to protect admin endpoints that trigger expensive operations
    (scraping, normalization, synthesis).
    """
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_API_KEY not configured on server",
        )

    if x_api_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return x_api_key

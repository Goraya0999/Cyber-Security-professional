"""
FastAPI dependencies — database session, current user injection.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.user import User

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)
internal_api_key_scheme = APIKeyHeader(name="X-Internal-API-Key", auto_error=False)


async def get_db() -> AsyncSession:
    """Yield an async DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate Bearer JWT and return the authenticated User.
    Raises 401 on missing/invalid/expired token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_or_internal_service(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    internal_api_key: str | None = Depends(internal_api_key_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Allow normal user JWT auth or trusted gateway-to-ML service calls.

    The internal key is optional and only accepted when DIDS_INTERNAL_API_KEY is
    configured, so local development keeps the same JWT behavior by default.
    """
    if settings.dids_internal_api_key and internal_api_key == settings.dids_internal_api_key:
        return None

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await get_current_user(credentials=credentials, db=db)

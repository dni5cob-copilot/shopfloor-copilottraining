from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from auth import Role, create_access_token, create_refresh_token, verify_password
from database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # TODO: replace with real user lookup from a User table
    # Placeholder: accept admin/admin with supervisor role for development
    if form_data.username != "admin" or not verify_password(form_data.password, "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"):  # noqa: E501  # "secret"
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token("00000000-0000-0000-0000-000000000001", Role.supervisor)
    refresh_token = create_refresh_token("00000000-0000-0000-0000-000000000001")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

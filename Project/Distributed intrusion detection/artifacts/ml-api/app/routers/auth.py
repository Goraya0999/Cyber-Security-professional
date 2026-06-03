from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db, get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, AuthResponse, UserOut

router = APIRouter()


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    existing = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": "Conflict", "message": "Email already registered"},
        )

    # Check duplicate username
    existing_un = await db.execute(
        select(User).where(User.username == body.username)
    )
    if existing_un.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": "Conflict", "message": "Username already taken"},
        )

    user = User(
        username=body.username,
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, {"username": user.username, "email": user.email})
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    # Constant-time check prevents user enumeration
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail={"error": "Unauthorized", "message": "Invalid email or password"},
        )

    token = create_access_token(user.id, {"username": user.username, "email": user.email})
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

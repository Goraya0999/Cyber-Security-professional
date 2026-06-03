from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, field_validator, AfterValidator
import re


def validate_email_format(v: str) -> str:
    """Basic RFC-5322 email format check (no DNS/deliverability check)."""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, v):
        raise ValueError(f"Invalid email address: {v!r}")
    return v.lower()


EmailField = Annotated[str, AfterValidator(validate_email_format)]


class SignupRequest(BaseModel):
    username: str
    email: EmailField
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not re.match(r"^\w{3,30}$", v):
            raise ValueError("Username must be 3-30 alphanumeric/underscore characters")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailField
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserOut

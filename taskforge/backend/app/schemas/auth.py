from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=1024)


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=1024)


class MobileRefreshRequest(BaseModel):
    refresh_token: str


class UserMe(BaseModel):
    id: UUID
    email: str
    email_verified_at: Optional[datetime]
    providers: List[str]


class MobileAuthResponse(BaseModel):
    user: UserMe
    access_token: str
    refresh_token: str

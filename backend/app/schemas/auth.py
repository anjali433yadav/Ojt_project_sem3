
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool


class UserLogin(BaseModel):
    email: str
    password: str


class AdminUserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    role: str


class AdminRoleUpdate(BaseModel):
    role: str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool

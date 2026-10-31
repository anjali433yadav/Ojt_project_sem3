from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class TrainingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    content: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=100)


class TrainingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    content: str
    category: str
    is_published: bool


class TrainingPublishRequest(BaseModel):
    is_published: bool


class TrainingAssignRequest(BaseModel):
    employee_ids: list[UUID] = Field(min_length=1)
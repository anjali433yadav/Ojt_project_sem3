
from pydantic import BaseModel, Field


class SimulationCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    subject: str = Field(min_length=3, max_length=255)
    content: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=100)
    difficulty: str = "beginner"
class SimulationReportRequest(BaseModel):
    feedback: str = Field(
        min_length=3,
        max_length=1000
    )
class SimulationContentUpdate(BaseModel):
    content: str = Field(min_length=10)

from pydantic import BaseModel, Field

class SimulationGenerationRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=150)
    audience: str = Field(min_length=3, max_length=100)
    difficulty: str = "beginner"


class SaveAIDraftRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    subject: str = Field(min_length=3, max_length=255)
    content: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=100)
    difficulty: str = "beginner"
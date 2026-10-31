from pydantic import BaseModel, Field


class SimulationReviewRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    review_comment: str | None = Field(default=None, max_length=1000)
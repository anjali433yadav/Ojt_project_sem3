
from uuid import UUID
from pydantic import BaseModel, Field


class CampaignTargetAssign(BaseModel):
    user_ids: list[UUID] = Field(min_length=1)

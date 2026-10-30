from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator


class CallCreate(BaseModel):
    prospect_name: str
    prospect_role: str
    company: str

    @field_validator("prospect_name", "prospect_role", "company", mode="before")
    def validate_text_field(cls, v: Any, info) -> str:
        if v is None or not isinstance(v, str):
            raise ValueError(f"{info.field_name} is required and must be a string")
        v = v.strip()
        if len(v) < 1 or len(v) > 120:
            raise ValueError(f"{info.field_name} must be between 1 and 120 characters")
        return v


class StageResultUpdate(BaseModel):
    tap_key: str
    prospect_words: Optional[str] = None

    @field_validator("tap_key")
    def validate_tap_key(cls, v: Any) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            raise ValueError("tap_key is required")
        return v.strip()

    @field_validator("prospect_words")
    def validate_words(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not isinstance(v, str):
                raise ValueError("prospect_words must be a string")
            if len(v) > 1000:
                raise ValueError("prospect_words cannot exceed 1000 characters")
        return v


class CallClose(BaseModel):
    outcome: Optional[str] = None
    general_notes: Optional[str] = None

    @field_validator("outcome")
    def validate_outcome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                return None
        return v

    @field_validator("general_notes")
    def validate_general_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 2000:
                raise ValueError("general_notes cannot exceed 2000 characters")
        return v

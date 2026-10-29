from typing import List, Dict, Any
from fastapi import APIRouter
from app.db import fetch_all_stages

router = APIRouter(prefix="/stages", tags=["stages"])


@router.get("")
def get_stages() -> List[Dict[str, Any]]:
    """
    Returns all 8 stages ordered by sort_order.
    """
    return fetch_all_stages()

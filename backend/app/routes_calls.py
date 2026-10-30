from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.models import CallCreate, StageResultUpdate, CallClose
from app.db import (
    create_call,
    get_call,
    upsert_stage_result,
    close_call,
    list_calls,
    get_call_with_results,
    is_valid_tap,
    STAGE_8_OUTCOMES,
    STAGE_NAME_MAP,
)

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("", status_code=status.HTTP_201_CREATED)
def start_call(payload: CallCreate) -> Dict[str, Any]:
    """
    Start a call.
    Trims prospect_name, prospect_role and company (1 to 120 chars).
    Returns 201 with the created call.
    """
    call = create_call(
        prospect_name=payload.prospect_name,
        prospect_role=payload.prospect_role,
        company=payload.company,
    )
    return call


@router.put("/{call_id}/stages/{stage_id}")
def update_call_stage(
    call_id: str,
    stage_id: int,
    payload: StageResultUpdate,
) -> Dict[str, Any]:
    """
    Save a stage result (upsert) and advance.
    - 404 if the call does not exist.
    - 409 if the call is already closed.
    - 422 if stage_id is not 1 to 8 or tap_key is not one of that stage's 4 taps.
    - Updates furthest_stage and current_stage.
    """
    if stage_id < 1 or stage_id > 8:
        raise HTTPException(
            status_code=422,
            detail="stage_id must be between 1 and 8",
        )

    call = get_call(call_id)
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )

    if call.get("status") == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Call is already closed",
        )

    if not is_valid_tap(stage_id, payload.tap_key):
        raise HTTPException(
            status_code=422,
            detail=f"tap_key '{payload.tap_key}' is not valid for stage {stage_id}",
        )

    result = upsert_stage_result(
        call_id=call_id,
        stage_id=stage_id,
        tap_key=payload.tap_key,
        prospect_words=payload.prospect_words,
    )
    return result


@router.post("/{call_id}/close")
def close_call_endpoint(
    call_id: str,
    payload: CallClose,
) -> Dict[str, Any]:
    """
    Close the call (Finish call at Stage 8, or End call at any stage).
    - 404 if missing.
    - 409 if already closed.
    - If outcome omitted, defaults to ended_early.
    - If outcome given, must be in Stage 8 outcomes AND furthest_stage == 8, else 422.
    - Sets summary_status='skipped' for now (no LLM yet).
    """
    call = get_call(call_id)
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )

    if call.get("status") == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Call is already closed",
        )

    outcome = payload.outcome
    if not outcome:
        outcome = "ended_early"
    else:
        if outcome not in STAGE_8_OUTCOMES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid outcome '{outcome}'. Must be one of: {sorted(list(STAGE_8_OUTCOMES))}",
            )
        if int(call.get("furthest_stage", 1)) != 8:
            raise HTTPException(
                status_code=422,
                detail="Outcome can only be specified when furthest_stage is 8",
            )

    # 1. Save call as closed first (guaranteed closed state)
    call_with_results = get_call_with_results(call_id)
    stage_results = call_with_results.get("stage_results", []) if call_with_results else []

    closed_call = close_call(
        call_id=call_id,
        outcome=outcome,
        summary=None,
        summary_status="pending",
        general_notes=payload.general_notes,
    )

    # 2. Run LLM one-line summary (10s timeout, max 80 chars)
    try:
        from app.llm import generate_summary
        summary_text = generate_summary(
            call=closed_call,
            stage_results=stage_results,
            stage_name_map=STAGE_NAME_MAP,
        )
        if summary_text:
            final_call = close_call(
                call_id=call_id,
                outcome=outcome,
                summary=summary_text,
                summary_status="done",
                general_notes=payload.general_notes,
            )
        else:
            final_call = close_call(
                call_id=call_id,
                outcome=outcome,
                summary=None,
                summary_status="failed",
                general_notes=payload.general_notes,
            )
    except Exception:
        final_call = close_call(
            call_id=call_id,
            outcome=outcome,
            summary=None,
            summary_status="failed",
            general_notes=payload.general_notes,
        )

    return final_call


@router.get("")
def get_all_calls() -> List[Dict[str, Any]]:
    """
    List calls, newest first.
    Includes furthest_stage_name joined from stages.
    """
    return list_calls()


@router.get("/{call_id}")
def get_single_call(call_id: str) -> Dict[str, Any]:
    """
    One call with all its stage results.
    - 404 if not found.
    """
    call_with_results = get_call_with_results(call_id)
    if not call_with_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )
    return call_with_results

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import httpx

from app.main import app
from app.llm import clean_summary, build_user_prompt, generate_summary

client = TestClient(app)


# ---------------------------------------------------------------------------
# Unit Tests for LLM Prompt Builder & Output Cleaner
# ---------------------------------------------------------------------------
def test_clean_summary():
    # Strips quotes, trailing periods, and markdown
    raw = '"*High raw material costs*; agreed to follow-up call on Friday."'
    cleaned = clean_summary(raw)
    assert cleaned == "High raw material costs; agreed to follow-up call on Friday"
    assert not cleaned.endswith(".")
    assert '"' not in cleaned
    assert "*" not in cleaned
    assert len(cleaned) <= 80

    # Enforces 80-character maximum
    long_raw = "A" * 100
    cleaned_long = clean_summary(long_raw)
    assert len(cleaned_long) == 80


def test_build_user_prompt():
    call = {
        "prospect_name": "Rajesh Sharma",
        "prospect_role": "Managing Director",
        "company": "Apex Forge Ltd",
        "furthest_stage": 5,
        "furthest_stage_name": "Their need",
        "outcome": "ended_early",
    }
    stage_results = [
        {"stage_id": 1, "tap_key": "reached_right_person", "prospect_words": "Direct line"},
        {"stage_id": 5, "tap_key": "described_situation", "prospect_words": "Tooling replacement takes 3 weeks"},
    ]
    stage_names = {1: "Opening", 5: "Their need"}

    prompt = build_user_prompt(call, stage_results, stage_names)
    assert "Rajesh Sharma, Managing Director at Apex Forge Ltd" in prompt
    assert "Their need (Stage 5)" in prompt
    assert "Verbatim need stated by prospect: Tooling replacement takes 3 weeks" in prompt


# ---------------------------------------------------------------------------
# Integration Tests for Call Close with LLM Summary
# ---------------------------------------------------------------------------
def test_close_call_llm_success_mocked():
    """
    On close, LLM generates a summary:
    - Call is closed
    - summary is populated (<= 80 chars)
    - summary_status is 'done'
    """
    # 1. Create a call and log Stage 1
    call = client.post(
        "/calls",
        json={"prospect_name": "Anita Roy", "prospect_role": "VP Ops", "company": "Roy Logistics"},
    ).json()
    call_id = call["id"]

    client.put(f"/calls/{call_id}/stages/1", json={"tap_key": "reached_right_person"})

    mock_summary = "Tooling downtime takes 3 weeks; agreed to WhatsApp catalog"

    # 2. Close call with mocked LLM summary
    with patch("app.llm.generate_summary", return_value=mock_summary):
        resp = client.post(f"/calls/{call_id}/close", json={})

    assert resp.status_code == 200
    closed = resp.json()
    assert closed["status"] == "closed"
    assert closed["outcome"] == "ended_early"
    assert closed["summary"] == mock_summary
    assert closed["summary_status"] == "done"
    assert len(closed["summary"]) <= 80


def test_close_call_llm_failure_still_closes_call():
    """
    If LLM generation fails (times out, HTTP error, or throws an exception):
    - Call MUST still be saved as closed
    - summary is None
    - summary_status is 'failed'
    """
    # 1. Create a call
    call = client.post(
        "/calls",
        json={"prospect_name": "Sunil Nair", "prospect_role": "COO", "company": "Nair Solar"},
    ).json()
    call_id = call["id"]

    client.put(f"/calls/{call_id}/stages/1", json={"tap_key": "reached_right_person"})

    # 2. Close call while LLM raises an error (e.g. timeout)
    with patch("app.llm.generate_summary", side_effect=httpx.TimeoutException("Read timed out")):
        resp = client.post(f"/calls/{call_id}/close", json={})

    assert resp.status_code == 200
    closed = resp.json()
    assert closed["status"] == "closed"
    assert closed["summary"] is None
    assert closed["summary_status"] == "failed"


def test_generate_summary_timeout_handled_gracefully():
    """
    Directly tests that generate_summary catches TimeoutException and returns None.
    """
    call = {"prospect_name": "Pooja", "furthest_stage": 1, "outcome": "ended_early"}
    with patch("app.llm.LLM_API_KEY", "test-secret-key-12345"):
        with patch("httpx.Client.post", side_effect=httpx.TimeoutException("10s timeout")):
            result = generate_summary(call, [], {1: "Opening"})
            assert result is None

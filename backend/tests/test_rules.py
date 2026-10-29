import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Rule 1: Validation errors on POST /calls
# ---------------------------------------------------------------------------
def test_create_call_success():
    resp = client.post(
        "/calls",
        json={
            "prospect_name": "  Amitabh Patel  ",
            "prospect_role": "  CEO  ",
            "company": "  Patel Logistics  ",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["prospect_name"] == "Amitabh Patel"
    assert data["prospect_role"] == "CEO"
    assert data["company"] == "Patel Logistics"
    assert data["status"] == "in_progress"
    assert data["current_stage"] == 1
    assert data["furthest_stage"] == 1
    assert "id" in data


@pytest.mark.parametrize(
    "payload,expected_detail_contains",
    [
        (
            {"prospect_name": "", "prospect_role": "CEO", "company": "Acme"},
            "prospect_name",
        ),
        (
            {"prospect_name": "   ", "prospect_role": "CEO", "company": "Acme"},
            "prospect_name",
        ),
        (
            {"prospect_name": "A" * 121, "prospect_role": "CEO", "company": "Acme"},
            "prospect_name",
        ),
        (
            {"prospect_name": "John", "prospect_role": "", "company": "Acme"},
            "prospect_role",
        ),
        (
            {"prospect_name": "John", "prospect_role": "CEO", "company": ""},
            "company",
        ),
        (
            {"prospect_name": "John"},  # Missing fields
            "prospect_role",
        ),
    ],
)
def test_create_call_validation_errors(payload, expected_detail_contains):
    resp = client.post("/calls", json=payload)
    assert resp.status_code == 422
    data = resp.json()
    assert "detail" in data
    assert expected_detail_contains in data["detail"].lower()


# ---------------------------------------------------------------------------
# Rule 2: 404 for a missing call
# ---------------------------------------------------------------------------
def test_404_for_missing_call():
    missing_id = "00000000-0000-0000-0000-000000000000"

    resp_put = client.put(
        f"/calls/{missing_id}/stages/1",
        json={"tap_key": "reached_right_person"},
    )
    assert resp_put.status_code == 404
    assert resp_put.json() == {"detail": "Call not found"}

    resp_close = client.post(
        f"/calls/{missing_id}/close",
        json={"outcome": "ended_early"},
    )
    assert resp_close.status_code == 404
    assert resp_close.json() == {"detail": "Call not found"}

    resp_get = client.get(f"/calls/{missing_id}")
    assert resp_get.status_code == 404
    assert resp_get.json() == {"detail": "Call not found"}


# ---------------------------------------------------------------------------
# Rule 3: 409 on closed calls
# ---------------------------------------------------------------------------
def test_409_on_closed_call():
    # Create call and close it
    c = client.post(
        "/calls",
        json={"prospect_name": "Meera Rao", "prospect_role": "Director", "company": "TechNova"},
    ).json()
    call_id = c["id"]

    close_resp = client.post(f"/calls/{call_id}/close", json={})
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    # Attempting to save a stage on a closed call must return 409
    put_resp = client.put(
        f"/calls/{call_id}/stages/1",
        json={"tap_key": "reached_right_person"},
    )
    assert put_resp.status_code == 409
    assert put_resp.json() == {"detail": "Call is already closed"}

    # Attempting to close again must return 409
    close_again = client.post(f"/calls/{call_id}/close", json={})
    assert close_again.status_code == 409
    assert close_again.json() == {"detail": "Call is already closed"}


# ---------------------------------------------------------------------------
# Rule 4: Stage validations (stage 1-8, valid taps, 1000 char cap on words)
# ---------------------------------------------------------------------------
def test_put_stage_validation_errors():
    c = client.post(
        "/calls",
        json={"prospect_name": "Suresh Kumar", "prospect_role": "Owner", "company": "Kumar Auto"},
    ).json()
    call_id = c["id"]

    # Invalid stage_id < 1 or > 8
    resp_0 = client.put(f"/calls/{call_id}/stages/0", json={"tap_key": "gatekeeper_answered"})
    assert resp_0.status_code == 422
    assert "between 1 and 8" in resp_0.json()["detail"]

    resp_9 = client.put(f"/calls/{call_id}/stages/9", json={"tap_key": "meeting_booked"})
    assert resp_9.status_code == 422
    assert "between 1 and 8" in resp_9.json()["detail"]

    # Invalid tap_key for Stage 1 (e.g. using a Stage 2 tap)
    resp_invalid_tap = client.put(
        f"/calls/{call_id}/stages/1",
        json={"tap_key": "asked_who_calling"},
    )
    assert resp_invalid_tap.status_code == 422
    assert "not valid for stage 1" in resp_invalid_tap.json()["detail"]

    # Missing tap_key
    resp_no_tap = client.put(f"/calls/{call_id}/stages/1", json={})
    assert resp_no_tap.status_code == 422

    # prospect_words > 1000 chars
    long_words = "A" * 1001
    resp_long_words = client.put(
        f"/calls/{call_id}/stages/1",
        json={"tap_key": "reached_right_person", "prospect_words": long_words},
    )
    assert resp_long_words.status_code == 422
    assert "1000" in resp_long_words.json()["detail"]


# ---------------------------------------------------------------------------
# Rule 5: Upsert not creating duplicates
# ---------------------------------------------------------------------------
def test_upsert_does_not_create_duplicates():
    c = client.post(
        "/calls",
        json={"prospect_name": "Rohan Gupta", "prospect_role": "VP Sales", "company": "Gupta Steels"},
    ).json()
    call_id = c["id"]

    # Save Stage 1 first time
    r1 = client.put(
        f"/calls/{call_id}/stages/1",
        json={"tap_key": "gatekeeper_answered", "prospect_words": "Receptionist spoke"},
    )
    assert r1.status_code == 200

    # Re-save Stage 1 with updated tap and words
    r2 = client.put(
        f"/calls/{call_id}/stages/1",
        json={"tap_key": "reached_right_person", "prospect_words": "Actually reached Rohan"},
    )
    assert r2.status_code == 200

    # Fetch call with results: must have exactly 1 stage_result
    call_detail = client.get(f"/calls/{call_id}").json()
    stage_results = call_detail["stage_results"]
    assert len(stage_results) == 1
    assert stage_results[0]["stage_id"] == 1
    assert stage_results[0]["tap_key"] == "reached_right_person"
    assert stage_results[0]["prospect_words"] == "Actually reached Rohan"


# ---------------------------------------------------------------------------
# Rule 6: furthest_stage logic
# ---------------------------------------------------------------------------
def test_furthest_stage_and_current_stage_logic():
    c = client.post(
        "/calls",
        json={"prospect_name": "Vikram Singh", "prospect_role": "MD", "company": "Singh Textiles"},
    ).json()
    call_id = c["id"]

    # Initial state
    assert c["furthest_stage"] == 1
    assert c["current_stage"] == 1

    # Save stage 1 -> furthest=1, current=2
    s1 = client.put(f"/calls/{call_id}/stages/1", json={"tap_key": "reached_right_person"}).json()
    assert s1["call"]["furthest_stage"] == 1
    assert s1["call"]["current_stage"] == 2

    # Save stage 3 -> furthest=3, current=4
    s3 = client.put(f"/calls/{call_id}/stages/3", json={"tap_key": "yes_talk_now"}).json()
    assert s3["call"]["furthest_stage"] == 3
    assert s3["call"]["current_stage"] == 4

    # Go back and edit stage 2 -> furthest should remain 3 (max(3, 2)), current becomes 3 (min(2+1, 8))
    s2 = client.put(f"/calls/{call_id}/stages/2", json={"tap_key": "let_me_go_on"}).json()
    assert s2["call"]["furthest_stage"] == 3
    assert s2["call"]["current_stage"] == 3


# ---------------------------------------------------------------------------
# Rule 7: ended_early when outcome is omitted
# ---------------------------------------------------------------------------
def test_ended_early_when_outcome_omitted():
    c = client.post(
        "/calls",
        json={"prospect_name": "Pooja Hegde", "prospect_role": "Director", "company": "Apex Bio"},
    ).json()
    call_id = c["id"]

    # Close with empty body
    closed_empty = client.post(f"/calls/{call_id}/close", json={}).json()
    assert closed_empty["status"] == "closed"
    assert closed_empty["outcome"] == "ended_early"
    assert closed_empty["summary_status"] in ("failed", "skipped")
    assert closed_empty["ended_at"] is not None


# ---------------------------------------------------------------------------
# Rule 8: 422 for an outcome sent before stage 8 & valid Stage 8 close
# ---------------------------------------------------------------------------
def test_outcome_before_stage_8_returns_422():
    c = client.post(
        "/calls",
        json={"prospect_name": "Deepak Verma", "prospect_role": "Founder", "company": "Verma Cloud"},
    ).json()
    call_id = c["id"]

    # Advance to Stage 4 only
    client.put(f"/calls/{call_id}/stages/1", json={"tap_key": "reached_right_person"})
    client.put(f"/calls/{call_id}/stages/4", json={"tap_key": "described_business"})

    # Send Stage 8 outcome "meeting_booked" before reaching stage 8 -> MUST return 422
    bad_close = client.post(
        f"/calls/{call_id}/close",
        json={"outcome": "meeting_booked"},
    )
    assert bad_close.status_code == 422
    assert "furthest_stage is 8" in bad_close.json()["detail"]

    # Invalid outcome string -> 422
    invalid_outcome = client.post(
        f"/calls/{call_id}/close",
        json={"outcome": "something_else"},
    )
    assert invalid_outcome.status_code == 422

    # Now advance to Stage 8
    client.put(f"/calls/{call_id}/stages/8", json={"tap_key": "meeting_booked"})

    # Now closing with meeting_booked must succeed (200)
    good_close = client.post(
        f"/calls/{call_id}/close",
        json={"outcome": "meeting_booked"},
    )
    assert good_close.status_code == 200
    assert good_close.json()["status"] == "closed"
    assert good_close.json()["outcome"] == "meeting_booked"


# ---------------------------------------------------------------------------
# Rule 9: List calls newest first with furthest_stage_name
# ---------------------------------------------------------------------------
def test_list_calls_order_and_enrichment():
    resp = client.get("/calls")
    assert resp.status_code == 200
    calls = resp.json()
    assert isinstance(calls, list)
    assert len(calls) > 0

    first_call = calls[0]
    required_fields = [
        "id",
        "prospect_name",
        "prospect_role",
        "company",
        "started_at",
        "ended_at",
        "furthest_stage",
        "furthest_stage_name",
        "outcome",
        "summary",
        "summary_status",
        "status",
    ]
    for field in required_fields:
        assert field in first_call

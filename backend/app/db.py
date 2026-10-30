import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Set
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_supabase_client: Optional[Client] = None

# Static seed stages matching db/seed.sql
SEED_STAGES: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Opening",
        "purpose": "Reach the right person and say who you are in ten seconds.",
        "prospect_says": [
            "Can you please come again? From where are you calling?",
            "I am no longer with Omnicare.",
            "Why, is this the bank?"
        ],
        "tap_options": [
            {"key": "gatekeeper_answered", "label": "Switchboard or assistant answered"},
            {"key": "reached_right_person", "label": "Reached the right person"},
            {"key": "left_or_wrong_person", "label": "Left the company or wrong person"},
            {"key": "bad_line_or_no_answer", "label": "Bad line or no answer"}
        ],
        "sort_order": 1
    },
    {
        "id": 2,
        "name": "Purpose",
        "purpose": "Say why you called in one or two sentences they can repeat to a colleague.",
        "prospect_says": [
            "Calling from where?",
            "Yes, regarding what?",
            "What do you guys do?"
        ],
        "tap_options": [
            {"key": "asked_who_calling", "label": "Asked who is calling"},
            {"key": "asked_what_about", "label": "Asked what it is about"},
            {"key": "asked_what_we_do", "label": "Asked what we do"},
            {"key": "let_me_go_on", "label": "Let me go on"}
        ],
        "sort_order": 2
    },
    {
        "id": 3,
        "name": "Permission",
        "purpose": "Find out if they will talk now: a yes, a no, or a time to call back.",
        "prospect_says": [
            "Can you call me in an hour?",
            "I am driving, but I can speak to you.",
            "After 2 PM. Call us in the afternoon."
        ],
        "tap_options": [
            {"key": "yes_talk_now", "label": "Said yes, talk now"},
            {"key": "call_later", "label": "Asked us to call later"},
            {"key": "send_first", "label": "Wants it on WhatsApp or email first"},
            {"key": "no_time", "label": "Said no time"}
        ],
        "sort_order": 3
    },
    {
        "id": 4,
        "name": "Their business",
        "purpose": "Ask about their company before you say anything about yours.",
        "prospect_says": [
            "We do only manufacturing.",
            "My clientele at this moment is government only.",
            "I mean, we are a manufacturing facility here."
        ],
        "tap_options": [
            {"key": "described_business", "label": "Described their business"},
            {"key": "answered_briefly", "label": "Answered in a word or two"},
            {"key": "corrected_us", "label": "Corrected what we assumed"},
            {"key": "asked_about_us", "label": "Asked about us first"}
        ],
        "sort_order": 4
    },
    {
        "id": 5,
        "name": "Their need",
        "purpose": "Hear their need in their own words, and write down exactly what they said.",
        "prospect_says": [
            "It has been constant for the last three years.",
            "Hum log outsource nahi kar rahe kuch bhi.",
            "We have an internal business model, and we are following it."
        ],
        "tap_options": [
            {"key": "described_situation", "label": "Described their situation"},
            {"key": "fine_as_is", "label": "Said things are fine"},
            {"key": "handled_internally", "label": "Said it is handled internally"},
            {"key": "asked_how_we_help", "label": "Asked how we can help"}
        ],
        "sort_order": 5
    },
    {
        "id": 6,
        "name": "Objection",
        "purpose": "Hear the reason for the no and understand it before you answer.",
        "prospect_says": [
            "What are the charges for that?",
            "I am not the right person, my CFO takes care of all those things.",
            "No, I don't have time for such work. You should call somebody else."
        ],
        "tap_options": [
            {"key": "not_right_person", "label": "Not the right person"},
            {"key": "asked_cost", "label": "Asked about cost or what is in it for us"},
            {"key": "not_interested", "label": "Not interested or no time"},
            {"key": "not_relevant", "label": "Not relevant to them"}
        ],
        "sort_order": 6
    },
    {
        "id": 7,
        "name": "Next step",
        "purpose": "Agree one concrete next step, with a time or a channel.",
        "prospect_says": [
            "Send me the details, let's have a look.",
            "Both work for me. You can send it over WhatsApp.",
            "Can you send the mail, please?"
        ],
        "tap_options": [
            {"key": "send_on_whatsapp", "label": "Agreed to WhatsApp"},
            {"key": "send_by_email", "label": "Agreed to email"},
            {"key": "named_a_time", "label": "Named a time themselves"},
            {"key": "referred_colleague", "label": "Referred us to someone"}
        ],
        "sort_order": 7
    },
    {
        "id": 8,
        "name": "Close",
        "purpose": "End clearly and record the outcome, the next step and their words from stage 5.",
        "prospect_says": [
            "Done.",
            "Okay. Thank you.",
            "Okay, thank you for your time."
        ],
        "tap_options": [
            {"key": "meeting_booked", "label": "Meeting or call booked"},
            {"key": "follow_up_agreed", "label": "Report or follow-up agreed"},
            {"key": "not_interested", "label": "Not interested"},
            {"key": "no_conversation", "label": "Wrong person or no real conversation"}
        ],
        "sort_order": 8
    }
]

STAGE_NAME_MAP: Dict[int, str] = {s["id"]: s["name"] for s in SEED_STAGES}

STAGE_TAPS_MAP: Dict[int, Set[str]] = {
    s["id"]: {opt["key"] for opt in s["tap_options"]}
    for s in SEED_STAGES
}

STAGE_8_OUTCOMES: Set[str] = {
    "meeting_booked",
    "follow_up_agreed",
    "not_interested",
    "no_conversation"
}

# In-memory storage fallback for local testing without Supabase
_local_calls: Dict[str, Dict[str, Any]] = {}
_local_stage_results: Dict[str, List[Dict[str, Any]]] = {}


def get_supabase() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        return _supabase_client
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client: {e}")
        return None


def fetch_all_stages() -> List[Dict[str, Any]]:
    client = get_supabase()
    if client is not None:
        try:
            res = client.table("stages").select("*").order("sort_order").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception as e:
            print(f"Notice: Supabase stages query failed, using seed data: {e}")
    return SEED_STAGES


def is_valid_tap(stage_id: int, tap_key: str) -> bool:
    if stage_id not in STAGE_TAPS_MAP:
        return False
    return tap_key in STAGE_TAPS_MAP[stage_id]


def create_call(prospect_name: str, prospect_role: str, company: str) -> Dict[str, Any]:
    call_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    record = {
        "id": call_id,
        "prospect_name": prospect_name,
        "prospect_role": prospect_role,
        "company": company,
        "status": "in_progress",
        "current_stage": 1,
        "furthest_stage": 1,
        "outcome": None,
        "summary": None,
        "summary_status": "pending",
        "started_at": started_at,
        "ended_at": None,
    }

    client = get_supabase()
    if client is not None:
        try:
            res = client.table("calls").insert(record).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Notice: Supabase insert failed ({e}), falling back to memory store")

    _local_calls[call_id] = record
    _local_stage_results[call_id] = []
    return record


def get_call(call_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase()
    if client is not None:
        try:
            res = client.table("calls").select("*").eq("id", call_id).execute()
            if res.data:
                return res.data[0]
            return None
        except Exception as e:
            print(f"Notice: Supabase get_call failed ({e}), falling back to memory store")

    return _local_calls.get(call_id)


def upsert_stage_result(
    call_id: str,
    stage_id: int,
    tap_key: str,
    prospect_words: Optional[str]
) -> Dict[str, Any]:
    call = get_call(call_id)
    if not call:
        raise ValueError("Call not found")

    new_furthest = max(int(call.get("furthest_stage", 1)), stage_id)
    new_current = min(stage_id + 1, 8)
    saved_at = datetime.now(timezone.utc).isoformat()

    client = get_supabase()
    if client is not None:
        try:
            # Upsert stage_result
            sr_record = {
                "call_id": call_id,
                "stage_id": stage_id,
                "tap_key": tap_key,
                "prospect_words": prospect_words,
                "saved_at": saved_at,
            }
            sr_res = client.table("stage_results").upsert(
                sr_record, on_conflict="call_id,stage_id"
            ).execute()
            saved_result = sr_res.data[0] if sr_res.data else sr_record

            # Update call
            call_update = {
                "furthest_stage": new_furthest,
                "current_stage": new_current,
            }
            c_res = client.table("calls").update(call_update).eq("id", call_id).execute()
            updated_call = c_res.data[0] if c_res.data else {**call, **call_update}

            return {
                "call": updated_call,
                "stage_result": saved_result,
            }
        except Exception as e:
            print(f"Notice: Supabase upsert_stage_result failed ({e}), using memory store")

    # Local memory fallback
    call["furthest_stage"] = new_furthest
    call["current_stage"] = new_current

    results = _local_stage_results.setdefault(call_id, [])
    existing = next((r for r in results if r["stage_id"] == stage_id), None)
    if existing:
        existing["tap_key"] = tap_key
        existing["prospect_words"] = prospect_words
        existing["saved_at"] = saved_at
        saved_result = existing
    else:
        saved_result = {
            "id": str(uuid.uuid4()),
            "call_id": call_id,
            "stage_id": stage_id,
            "tap_key": tap_key,
            "prospect_words": prospect_words,
            "saved_at": saved_at,
        }
        results.append(saved_result)

    return {
        "call": call,
        "stage_result": saved_result,
    }


def close_call(
    call_id: str,
    outcome: str,
    summary: Optional[str] = None,
    summary_status: str = "skipped",
    general_notes: Optional[str] = None,
) -> Dict[str, Any]:
    call = get_call(call_id)
    if not call:
        raise ValueError("Call not found")

    ended_at = datetime.now(timezone.utc).isoformat()
    updates: Dict[str, Any] = {
        "status": "closed",
        "outcome": outcome,
        "ended_at": ended_at,
        "summary": summary,
        "summary_status": summary_status,
    }
    if general_notes is not None:
        updates["general_notes"] = general_notes

    client = get_supabase()
    if client is not None:
        try:
            res = client.table("calls").update(updates).eq("id", call_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"Notice: Supabase close_call failed ({e}), using memory store")

    call.update(updates)
    return call


def list_calls() -> List[Dict[str, Any]]:
    client = get_supabase()
    if client is not None:
        try:
            res = client.table("calls").select("*").order("started_at", desc=True).execute()
            calls = res.data if res.data else []
            # Enrich with furthest_stage_name
            for c in calls:
                f_stage = c.get("furthest_stage", 1)
                c["furthest_stage_name"] = STAGE_NAME_MAP.get(f_stage, "")
            return calls
        except Exception as e:
            print(f"Notice: Supabase list_calls failed ({e}), using memory store")

    calls = list(_local_calls.values())
    calls.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    enriched = []
    for c in calls:
        item = dict(c)
        f_stage = item.get("furthest_stage", 1)
        item["furthest_stage_name"] = STAGE_NAME_MAP.get(f_stage, "")
        enriched.append(item)
    return enriched


def get_call_with_results(call_id: str) -> Optional[Dict[str, Any]]:
    call = get_call(call_id)
    if not call:
        return None

    stage_results: List[Dict[str, Any]] = []
    client = get_supabase()
    if client is not None:
        try:
            res = client.table("stage_results").select("*").eq("call_id", call_id).order("stage_id").execute()
            stage_results = res.data if res.data else []
        except Exception as e:
            print(f"Notice: Supabase get stage_results failed ({e}), using memory store")
            stage_results = _local_stage_results.get(call_id, [])
    else:
        stage_results = _local_stage_results.get(call_id, [])

    result_call = dict(call)
    f_stage = result_call.get("furthest_stage", 1)
    result_call["furthest_stage_name"] = STAGE_NAME_MAP.get(f_stage, "")
    result_call["stage_results"] = stage_results
    return result_call


def delete_call(call_id: str) -> bool:
    """
    Deletes a call and its associated stage results.
    Returns True if deleted, False if call not found.
    """
    call = get_call(call_id)
    if not call:
        return False

    client = get_supabase()
    if client is not None:
        try:
            # Delete associated stage_results first
            client.table("stage_results").delete().eq("call_id", call_id).execute()
            client.table("calls").delete().eq("id", call_id).execute()
        except Exception as e:
            print(f"Notice: Supabase delete_call failed ({e}), using memory store")

    if call_id in _local_calls:
        del _local_calls[call_id]
    if call_id in _local_stage_results:
        del _local_stage_results[call_id]

    return True

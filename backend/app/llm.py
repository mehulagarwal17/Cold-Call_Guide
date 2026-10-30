import logging
import re
from typing import Optional, List, Dict, Any
import httpx
from app.config import LLM_PROVIDER, LLM_API_KEY, LLM_MODEL

logger = logging.getLogger("call_guide.llm")

SYSTEM_PROMPT = (
    "You summarize cold calls into one line of at most 80 characters.\n"
    "Format: <pain or business context>; <next step or why it ended>\n"
    "Write in telegraphic style, no fluff. No quotes, no markdown, no trailing period.\n"
    "If there is no pain or need recorded, use the business type instead.\n"
    "Never exceed 80 characters."
)

PROVIDER_URLS = {
    "mistral": "https://api.mistral.ai/v1/chat/completions",
    "cerebras": "https://api.cerebras.ai/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "groq": "https://api.groq.com/openai/v1/chat/completions",
}

DEFAULT_MODELS = {
    "gemini": "gemini-2.5-flash",
    "mistral": "mistral-small-latest",
    "cerebras": "llama3.1-8b",
    "openai": "gpt-4o-mini",
    "groq": "llama-3.1-8b-instant",
}


def build_user_prompt(
    call: Dict[str, Any],
    stage_results: List[Dict[str, Any]],
    stage_name_map: Dict[int, str],
) -> str:
    """
    Builds user prompt matching Section 9.
    """
    name = call.get("prospect_name", "Prospect")
    role = call.get("prospect_role", "")
    company = call.get("company", "")
    furthest_stage_num = call.get("furthest_stage", 1)
    furthest_stage_name = call.get("furthest_stage_name") or stage_name_map.get(furthest_stage_num, "")
    outcome = call.get("outcome", "ended_early")

    lines = [
        f"Prospect: {name}, {role} at {company}",
        f"Stage reached: {furthest_stage_name} (Stage {furthest_stage_num})",
        f"Outcome: {outcome}",
    ]
    if call.get("general_notes"):
        lines.append(f"General Call Notes: {call['general_notes']}")
    lines.append("Stage taps and notes:")

    for sr in sorted(stage_results, key=lambda x: x.get("stage_id", 0)):
        sid = sr.get("stage_id", 0)
        sname = stage_name_map.get(sid, f"Stage {sid}")
        tap = sr.get("tap_key", "")
        words = sr.get("prospect_words")

        if sid == 5 and words:
            lines.append(
                f"- Stage 5 ({sname}): {tap}. Verbatim need stated by prospect: {words}"
            )
        elif words:
            lines.append(f"- Stage {sid} ({sname}): {tap}. Notes: {words}")
        else:
            lines.append(f"- Stage {sid} ({sname}): {tap}")

    return "\n".join(lines)


def clean_summary(text: str) -> str:
    """
    Cleans telegraphic summary:
    - Removes quotes and markdown
    - Strips trailing period
    - Strictly limits to max 80 characters
    """
    t = text.strip()
    # Remove enclosing quotes
    t = re.sub(r'^["\'`]+|["\'`]+$', '', t)
    # Remove markdown formatting like bold/italics
    t = re.sub(r'[*_#]', '', t)
    # Remove trailing period
    t = t.rstrip('.')
    t = t.strip()
    # Cap at 80 characters
    if len(t) > 80:
        t = t[:80].strip()
        t = t.rstrip('.')
    return t


def generate_summary(
    call: Dict[str, Any],
    stage_results: List[Dict[str, Any]],
    stage_name_map: Dict[int, str],
) -> Optional[str]:
    """
    Calls the configured LLM with a 10-second timeout.
    Returns cleaned summary string (<= 80 chars) or None on any failure.
    Security: Never logs the API key.
    """
    if not LLM_API_KEY:
        logger.warning("LLM generation skipped: LLM_API_KEY is not set.")
        return None

    provider = (LLM_PROVIDER or "gemini").lower().strip()
    model = (LLM_MODEL or DEFAULT_MODELS.get(provider, "gemini-2.5-flash")).strip()
    if model.startswith("models/"):
        model = model[7:]
    if provider == "gemini" and (not model or model in ("gemini-1.5-flash", "gemini-1.5-pro", "gemini")):
        model = "gemini-2.5-flash"
    user_prompt = build_user_prompt(call, stage_results, stage_name_map)

    try:
        if provider == "gemini":
            # Direct Gemini REST call with 10s timeout
            # Note: API key is passed in URL query param key=...
            # We never log this URL!
            gemini_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            payload = {
                "system_instruction": {
                    "parts": [{"text": SYSTEM_PROMPT}]
                },
                "contents": [
                    {"parts": [{"text": user_prompt}]}
                ],
                "generationConfig": {
                    "maxOutputTokens": 150,
                    "temperature": 0.2,
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            }

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    gemini_endpoint,
                    params={"key": LLM_API_KEY},
                    json=payload,
                )
                if resp.status_code != 200:
                    logger.error("Gemini returned non-200 status code %d: %s", resp.status_code, resp.text)
                    return None

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    return None
                raw_text = parts[0].get("text", "")
                return clean_summary(raw_text)

        elif provider in PROVIDER_URLS:
            endpoint = PROVIDER_URLS[provider]
            headers = {
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 60,
                "temperature": 0.2,
            }

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(endpoint, headers=headers, json=payload)
                if resp.status_code != 200:
                    logger.error("%s returned non-200 status code: %s", provider, resp.status_code)
                    return None

                data = resp.json()
                choices = data.get("choices", [])
                if not choices:
                    return None
                raw_text = choices[0].get("message", {}).get("content", "")
                return clean_summary(raw_text)

        else:
            logger.error("Unsupported LLM_PROVIDER: %s", provider)
            return None

    except httpx.TimeoutException:
        logger.error("LLM request timed out after 10 seconds.")
        return None
    except Exception as exc:
        # Never log API key or sensitive request headers
        logger.error("LLM generation failed: %s (%s)", type(exc).__name__, str(exc))
        return None


COPILOT_SYSTEM_PROMPT = (
    "You are Balto AI, an expert real-time sales coach and cold-call copilot.\n"
    "The user is on a live B2B cold call at a specific stage.\n"
    "When given what the prospect said and the current call context, provide a short, razor-sharp, actionable tactical suggestion and exact words the salesperson should say next.\n"
    "Keep your response under 150 characters, punchy, and direct."
)


def generate_copilot_response(
    call: Dict[str, Any],
    current_stage_id: int,
    stage_name: str,
    prospect_utterance: str,
) -> str:
    if not LLM_API_KEY:
        return f"Acknowledge \"{prospect_utterance}\", validate their concern, and pivot to uncovering their core pain point."

    provider = (LLM_PROVIDER or "gemini").lower().strip()
    model = (LLM_MODEL or DEFAULT_MODELS.get(provider, "gemini-2.5-flash")).strip()
    if model.startswith("models/"):
        model = model[7:]
    if provider == "gemini" and (not model or model in ("gemini-1.5-flash", "gemini-1.5-pro", "gemini")):
        model = "gemini-2.5-flash"

    prompt = (
        f"Prospect: {call.get('prospect_name')}, {call.get('prospect_role')} at {call.get('company')}\n"
        f"Current Stage: Stage {current_stage_id} ({stage_name})\n"
        f"Prospect said: \"{prospect_utterance}\"\n"
        f"Provide the best tactical coaching advice and exact reply script."
    )

    try:
        if provider == "gemini":
            gemini_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            payload = {
                "system_instruction": {"parts": [{"text": COPILOT_SYSTEM_PROMPT}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": 100,
                    "temperature": 0.3,
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            }
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(
                    gemini_endpoint,
                    params={"key": LLM_API_KEY},
                    json=payload,
                )
                if resp.status_code != 200:
                    return f"Acknowledge \"{prospect_utterance}\" and guide the conversation forward."
                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return f"Address \"{prospect_utterance}\" directly and ask an open question."
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    return f"Acknowledge \"{prospect_utterance}\" and proceed."
                return parts[0].get("text", "").strip()
    except Exception:
        pass

    return f"Acknowledge \"{prospect_utterance}\" and ask an open-ended follow-up question."

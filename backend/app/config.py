import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current working dir, backend root, or project root
env_paths = [
    Path.cwd() / ".env",
    Path.cwd() / "backend" / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
]

for p in env_paths:
    if p.exists():
        load_dotenv(p)
        break
else:
    load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini").strip()
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL: str = os.getenv("LLM_MODEL", "").strip()
FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "").strip()

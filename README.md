<div align="center">

# 📞 Meridian — AI-Powered Cold-Call Guide & Sales Copilot

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Gemini API](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

  <p><b>An intelligent, real-time B2B cold-call assistant and sales enablement platform powered by Google Gemini and FastAPI.</b></p>
  <p>Empower sales reps with live 8-stage methodology tracking, speech-to-text AI copilot suggestions, and automated post-call intelligence.</p>

</div>

---

## 🌐 Live Deployment Links

- **Frontend Application (Vercel)**: [https://cold-call-guide-kohl.vercel.app](https://cold-call-guide-kohl.vercel.app)
- **Backend API Server (Render)**: [https://cold-call-guide-s90e.onrender.com](https://cold-call-guide-s90e.onrender.com)

---

## 🤖 LLM Implementation & Usage

This project leverages **Google Gemini (`gemini-2.5-flash`)** across three core intelligent pillars:

1. **Real-Time Balto AI Copilot**:
   - **Purpose**: Listens to live call utterances (via speech-to-text / voice simulation) and analyzes current stage context.
   - **Function**: Instantly provides razor-sharp tactical coaching suggestions and exact reply scripts to overcome objections in real time.

2. **Automated Post-Call Intelligence**:
   - **Purpose**: Automatically processes closed calls.
   - **Function**: Generates concise one-line summaries (`<pain point>; <next step>`) capped at 80 characters for instant CRM logging.

3. **Conversational AI Follow-Up Email Generator**:
   - **Purpose**: Post-call client outreach.
   - **Function**: Analyzes the complete call flow, stage results, tap options, and final outcomes to draft a natural, human-like, bespoke B2B follow-up email without rigid templates.

## Supabase SQL Schema (schema.sql)
```
   create extension if not exists pgcrypto;

create table stages (
  id smallint primary key,
  name text not null,
  purpose text not null,
  prospect_says jsonb not null default '[]',
  tap_options jsonb not null default '[]',
  sort_order smallint not null
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  prospect_name text not null,
  prospect_role text not null,
  company text not null,
  status text not null default 'in_progress' check (status in ('in_progress','closed')),
  current_stage smallint not null default 1,
  furthest_stage smallint not null default 1,
  outcome text check (outcome in ('meeting_booked','follow_up_agreed','not_interested','no_conversation','ended_early')),
  summary text,
  summary_status text not null default 'pending' check (summary_status in ('summary_status','pending','done','failed','skipped')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table stage_results (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls(id) on delete cascade,
  stage_id smallint not null references stages(id),
  tap_key text,
  prospect_words text,
  saved_at timestamptz not null default now(),
  unique (call_id, stage_id)
);

create index on calls (started_at desc);
create index on stage_results (call_id);

alter table stages enable row level security;
alter table calls enable row level security;
alter table stage_results enable row level security;
```

## ✨ Key Features

- **🎯 8-Stage Cold-Call Methodology**: Guided framework covering *Opening, Purpose, Permission, Their Business, Their Need, Objection, Next Step, and Close*.
- **🎙️ Balto-Style Live AI Copilot**: Real-time microphone speech capture and AI-powered objection handling and tactical coaching suggestions.
- **⚡ Dynamic Gemini LLM Integration**: Generates context-aware sales rebuttals and post-call one-line summaries (`<pain point>; <next step>`) in seconds.
- **🗂️ Past Calls & History**: Complete call logging, outcome tracking, and record management with Supabase persistence.
- **🎨 Aesthetic Design System**: Crafted with a warm editorial color palette (*Light Cream, Warm Coral, Deep Slate Navy, Dark Espresso*) and sharp typography (*Manrope* + *JetBrains Mono*).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Custom CSS & Tailwind principles
- **Icons & UI**: Modern minimalist component architecture

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn & FX
- **HTTP Client**: HTTPX for asynchronous LLM proxy calls

### Database & AI
- **Database**: Supabase PostgreSQL / In-Memory Fallback
- **AI Engine**: Google GenAI SDK (`gemini-2.5-flash`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Google Gemini API Key (`GOOGLE_API_KEY` or `GEMINI_API_KEY`)

### Installation & Running

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/meridian-cold-call-guide.git
   cd meridian-cold-call-guide

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```Bash
cd backend
pip install -r requirements.txt
cd ..
```

Run the Development Server:

```Bash
npm run dev
```

📄 License

Distributed under the MIT License. See LICENSE for more information.
<div align="center">
<p>Built with ❤️ for high-performing sales teams.</p>
</div>

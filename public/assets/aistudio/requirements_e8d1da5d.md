# Cold-Call Guide Screen: Final Project Requirements

Project: DeepThought Forward Deployed Engineer 48-hour build. Audience: you and your AI coding tool (Claude Code, Codex, Gemini, Cursor).

Attach this file together with `seed.sql`. `seed.sql` is the source of truth for the 8 stages, their quotes and their taps. If this document and the DeepThought task page disagree, the task page wins.

## 1. Goal

Build a small web product that a salesperson keeps open beside their phone during a cold call. It keeps them on the structure of the call (8 stages), records what happened at each stage, saves the call, and lists past calls with the stage each one reached. It must be live on free tiers and include at least one LLM feature.

Success means: a stranger can open the Vercel URL, start a call, walk through the stages, finish or end the call, and then see that call in Past Calls with the stage it reached and a one-line summary.

## 2. Background (from the task page and the 100 transcripts)

- The caller works for Meridian Growth Partners (fictional, Hyderabad) and calls owners and directors of Indian companies to offer a free growth report or company profile, usually sent on WhatsApp or email.
- Calls are short: the median is about 93 seconds. Most calls end before the final stages.
- Many calls are in Hindi or Hinglish, so the text fields must accept any Unicode text.
- The reference screen shows one stage: header with timer, prospect card, 8 numbered squares, stage label and name, purpose line, three things the prospect may say, four taps (one pressed), one box for the prospect's words, a "Next: <stage>" button and "End call". Past Calls is a list showing the stage each call reached.

## 3. Scope

In scope:
- Screen 1: Live Call (all 8 stages)
- Screen 2: Past Calls list with a read-only detail view
- Backend endpoints in section 7
- Supabase database in section 6
- One LLM feature (section 9)
- Deployment on Vercel, Render and Supabase

Out of scope (do not build): login or user accounts, real calling or dialing, call recording or transcription, editing or deleting past calls, analytics dashboards, anything paid.

## 4. Tech stack (fixed)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite, plain CSS | Vercel |
| Backend | Python 3.11, FastAPI, Uvicorn | Render free web service. Node/Express is an acceptable swap |
| Database | Supabase Postgres | Backend uses the service role key |
| LLM | Gemini (or Cerebras or Mistral) over REST | Key only in the backend |

Rules:
- The browser talks only to the backend. It never talks to Supabase and never sees any key.
- All secrets come from environment variables. Never put the Supabase service role key or the LLM key in the frontend, the repo or logs.

## 5. Core flow

1. The caller opens the app and sees the Start call form: prospect name, prospect role, company.
2. The caller clicks Start. The backend creates the call, a timer starts, and Stage 1 is shown.
3. At each stage the caller reads the purpose and the three things prospects tend to say, taps one of four buttons for what happened, optionally types the prospect's own words, and clicks the Next button.
4. At any stage the caller can click End call. The call is saved at once with the stage it reached.
5. At Stage 8 (Close) the four taps are the call outcomes. Choosing one and clicking Finish call closes the call.
6. The backend saves the outcome, generates a one-line summary with the LLM, and returns the finished call. It appears in Past Calls.

## 6. Database (run in the Supabase SQL editor, then run seed.sql)

```sql
create extension if not exists pgcrypto;

create table stages (
  id smallint primary key,            -- 1 to 8
  name text not null,
  purpose text not null,
  prospect_says jsonb not null default '[]',   -- exactly 3 strings
  tap_options jsonb not null default '[]',     -- exactly 4 objects: key and label
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
  summary_status text not null default 'pending' check (summary_status in ('pending','done','failed','skipped')),
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
-- No policies: only the backend (service role) can read or write.
```

Outcomes: the Stage 8 tap keys are the outcomes and are saved as `calls.outcome`: `meeting_booked`, `follow_up_agreed`, `not_interested`, `no_conversation`. A call ended with End call before Stage 8 gets `ended_early`. The backend accepts only these five values.

## 7. Backend API

All requests and responses are JSON. Use these exact paths.

| Method and path | Purpose | Request body | Success response |
|---|---|---|---|
| GET /health | Liveness check | none | 200 with status 'ok' and server time |
| GET /stages | All 8 stages ordered by sort_order | none | 200 with array of stages |
| POST /calls | Start a call | prospect_name, prospect_role, company | 201 with the call object |
| PUT /calls/{call_id}/stages/{stage_id} | Save a stage result (upsert) and advance | tap_key (required), prospect_words (optional) | 200 with the updated call and saved result |
| POST /calls/{call_id}/close | Close the call (Finish call at Stage 8, or End call at any stage) | outcome (optional; omitted means ended_early) | 200 with the closed call including summary and summary_status |
| GET /calls | List calls, newest first | none | 200 with array of calls |
| GET /calls/{call_id} | One call with all its stage results | none | 200 with call plus stage_results |

`GET /stages` and `GET /calls/{call_id}` are two read endpoints added to the five the task page lists.

### 7.1 Rules

- POST /calls: trim whitespace. prospect_name, prospect_role and company are required, 1 to 120 characters each. 422 on invalid input.
- PUT stage: 404 if the call does not exist, 409 if it is already closed, 422 if stage_id is not 1 to 8 or tap_key is missing or not one of that stage's 4 taps. Upsert on (call_id, stage_id). Set `furthest_stage = max(furthest_stage, stage_id)` and `current_stage = min(stage_id + 1, 8)`. prospect_words is capped at 1000 characters.
- POST close: 404 if missing, 409 if already closed. If outcome is omitted, use `ended_early`. If outcome is given, it must be one of the four Stage 8 outcomes and `furthest_stage` must be 8, otherwise 422. Set status closed and ended_at, then run the LLM summary (section 9). The call must be saved as closed even if the LLM fails.
- Stage reached for display equals `furthest_stage`.

### 7.2 List item fields

id, prospect_name, prospect_role, company, started_at, ended_at, furthest_stage, furthest_stage_name (joined from stages), outcome, summary, summary_status, status.

### 7.3 Errors and security

- Error format: a status code plus a JSON body with a single 'detail' message. Never return stack traces.
- CORS: allow only the Vercel production URL (env var `FRONTEND_ORIGIN`) and `http://localhost:5173`.
- Validate all input with Pydantic. Use the Supabase client or parameterised queries only.
- Do not log secrets or full prospect_words.

## 8. Frontend

### 8.1 Screen 1: Live Call (route `/`)

Before a call starts: a form with Prospect name, Prospect role and Company, and a Start call button disabled until all three are filled.

During a call, top to bottom:
1. Header: product name on the left, a running call timer (mm:ss from started_at) on the right.
2. Prospect card: name in bold, then role, company and 'first call' on one line.
3. Progress: eight numbered squares. The current one is highlighted, completed ones are filled. Clicking a completed square goes back to edit that stage.
4. Stage label ('Stage 2 of 8'), the stage name in large type, and the purpose line.
5. 'They may say': exactly 3 prospect quotes in a stacked list.
6. 'What happened': exactly 4 tap buttons in a 2x2 grid. One can be selected at a time and is visibly highlighted. A stage already saved shows its tap pre-selected.
7. 'Their words': one textarea with a 1000 character counter. It is the only free text on the screen. On Stage 5 it is taller and prompts the caller to write exactly what was said.
8. Buttons: a primary 'Next: <next stage name>' (on Stage 8: 'Finish call') and a secondary 'End call', visible on every stage.

At Stage 8 (Close): the four taps are the call outcomes. Choosing one and clicking Finish call saves Stage 8 and closes the call with that outcome. There is no separate outcome screen and no outcome note box.

After closing: show the one-line summary, a 'Call saved' confirmation, a Start new call button and a link to Past Calls. End call does the same with no extra questions.

Used during a live call, so: a narrow centered card about 360 to 420px wide, tap targets at least 44px, typing limited to the one words box, and the stage name, quotes, taps and buttons visible without scrolling at 1366x768.

### 8.2 Screen 2: Past Calls (route `/calls`)

One row per call, newest first. Left: prospect name and company in bold, with the one-line summary underneath. Right: the stage reached in capitals (the stage name, for example OBJECTION), with date and time under it. Clicking a row opens a read-only detail view with each stage's tap and the prospect's words. A header link switches between Live Call and Past Calls.

### 8.3 States every screen needs

- Loading: a visible spinner or text.
- Server waking up: Render's free tier sleeps when idle and the first request can take 30 to 60 seconds. On app load, call `/health` and show 'Waking the server, this can take up to a minute' until it answers.
- Error: a clear message with a Retry button. A failed save must never lose the caller's typed input.
- Empty: 'No calls yet' on Past Calls.

### 8.4 Config

Backend URL comes from `VITE_API_BASE_URL`. No secrets in the frontend.

## 9. The LLM feature

Chosen feature: a one-line summary of each finished call, in the style 'Has an accountant, not interested' or 'Sent the one-pager on WhatsApp'. It runs after the call, so latency does not disturb the caller, and it shows at a glance why each call ended.

Mechanics:
1. On `POST /calls/{id}/close`, after saving the outcome, gather the stage results (stage name, tap label, prospect words) and the outcome.
2. Call the LLM from the backend with a 10 second timeout.
3. System prompt: 'You write one-line summaries of cold calls for a sales log. Use only the facts provided. One short sentence, maximum 10 words, like: Has an accountant, not interested. Give the reason and the next step if there is one. No invention.'
4. User prompt: the structured stage results and outcome as plain text.
5. On success: save to `calls.summary` and set `summary_status = 'done'`.
6. On timeout, error, rate limit or empty output: set `summary_status = 'failed'`, leave summary null, and still return 200 with the closed call. The UI shows 'Summary unavailable'.
7. Truncate the summary to 80 characters and strip any markdown.

Config: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` (take the model name from the free-tier list in your provider console, do not hardcode it). Call the LLM at most once per closed call, with no retry loop.

## 10. Environment variables

Render (backend): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `FRONTEND_ORIGIN`.

Vercel (frontend): `VITE_API_BASE_URL`.

Provide `.env.example` files with names only. `.env` must be in `.gitignore`.

## 11. Repository layout

```
cold-call-guide/
  README.md
  DEPLOY.md
  backend/
    app/main.py, models.py, db.py, llm.py, routes_calls.py, routes_stages.py
    tests/
    requirements.txt
    .env.example
  frontend/
    src/ (App.jsx, LiveCall.jsx, PastCalls.jsx, api.js, styles.css)
    package.json
    .env.example
  db/
    schema.sql
    seed.sql
```

## 12. Deployment

1. Supabase: run `schema.sql`, then `seed.sql`. Confirm 8 rows in `stages`.
2. Render: new Web Service from GitHub, root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check path `/health`, add the env vars.
3. Vercel: import the repo, root directory `frontend`, framework Vite, set `VITE_API_BASE_URL` to the Render URL.
4. Set `FRONTEND_ORIGIN` on Render to the Vercel URL and redeploy.
5. Test from a phone and from a private browser window.

## 13. Acceptance criteria (done when all pass)

- [ ] `GET /health` returns 200 on the live Render URL.
- [ ] `GET /stages` returns exactly 8 stages, each with exactly 3 prospect quotes and exactly 4 taps.
- [ ] I can start a call (name, role, company), complete all 8 stages, finish with an outcome tap, and see 'Call saved'.
- [ ] End call at Stage 3 saves immediately with `furthest_stage = 3` and outcome `ended_early`.
- [ ] Going back and re-saving a stage updates it and does not create a duplicate.
- [ ] Past Calls shows the call with name, company, summary, stage reached and time.
- [ ] With an invalid LLM key, closing a call still succeeds and shows 'Summary unavailable'.
- [ ] Closed calls reject further stage saves with 409.
- [ ] Invalid input returns 422 with a readable message, not a crash.
- [ ] No secret appears in the frontend bundle, the repo, or the network tab.
- [ ] The app works on a fresh browser after Render has gone to sleep (waking message shown).
- [ ] The prospect's words box is the only free-text field on the live screen, the timer runs, and no placeholder text remains anywhere.

## 14. Deliverables

Links: the task page asks for four links. Confirm the exact four after registering. Likely candidates are the live Vercel URL, the Render API URL, the GitHub repo and the video.

Six-minute video, in your own voice:
1. (0:00 to 0:45) Who the caller is and the problem the screen solves.
2. (0:45 to 2:30) Live demo: start a call, go through the stages, close it.
3. (2:30 to 3:30) What you found in the 100 transcripts and how it shaped each stage, with one or two real examples and where calls end.
4. (3:30 to 4:30) The LLM feature: what it does, why you chose it, and what you chose not to use it for.
5. (4:30 to 5:30) Past Calls and the architecture in one sentence each.
6. (5:30 to 6:00) What you would build next and what you cut.

WhatsApp message to the CEO: sent from the button on your task page, which pre-fills the links and questions.

## 15. What the transcripts showed (use in your video)

These come from keyword counts across all 100 calls plus about 16 calls read in full. Counts are approximate.

- 25 of 100 calls ended with a document agreed (14) or a fixed next step (11). 17 ended on wrong person, left the company or a bad line. 13 were not logged.
- Stage 2 is the main hurdle: about 31 calls start with 'who is this / calling from where?' and about 35 ask 'what is this about / what do you do?'. Only about 5 ask where the number came from.
- Stage 6: 'not the right person' (about 15), 'what are the charges?' (about 12) and 'not interested' (about 12) are common. 'We already have an agency' is rare.
- Stages 4 and 5 are thin: callers often go straight to the pitch and few prospects describe their need in their own words.
- Logged outcomes often disagree with the call: in T084 the prospect agrees to a WhatsApp report and a call next Thursday but the caller logged `do_not_call`. In T019 and T023 the prospect asks for WhatsApp or email but nothing was logged.

## 16. Build order (give to the coding tool)

Build in this order and stop after each step so it can be tested: (1) schema, seed, health and stages endpoints; (2) the call endpoints; (3) tests for every rule in 7.1; (4) deploy the backend; (5) Live Call screen; (6) Past Calls screen; (7) states and error handling; (8) deploy the frontend; (9) LLM summary with the failure fallback; (10) run the acceptance checklist and a secrets check; (11) README. Do not add features outside section 3. Ask me instead of inventing anything the documents do not specify.

# Deployment Guide: Cold-Call Guide Screen

This guide details the deployment steps for Supabase, Render (Backend API), and Vercel (Frontend).

---

## 1. Database Setup (Supabase)

1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Paste and run the contents of `db/schema.sql`.
4. Paste and run the contents of `db/seed.sql`.
5. Verify in the **Table Editor** that `stages` contains exactly 8 rows (ordered 1 to 8).
6. Go to **Project Settings -> API** and copy:
   - **Project URL** (used as `SUPABASE_URL`)
   - **service_role secret key** (used as `SUPABASE_SERVICE_ROLE_KEY`)

---

## 2. Backend Deployment (Render)

1. Log into [Render](https://render.com) and click **New + -> Web Service**.
2. Connect your GitHub repository.
3. Configure the service with the following exact settings:
   - **Name**: `cold-call-guide-backend` (or your preferred name)
   - **Region**: Closest to your users (e.g. Singapore or Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Expand **Advanced** and set:
   - **Health Check Path**: `/health`
5. In the **Environment Variables** section, add:
   | Key | Value | Description |
   |---|---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `ey...` | Your Supabase service role secret key |
   | `LLM_PROVIDER` | `gemini` | LLM provider name |
   | `LLM_API_KEY` | `AIza...` | Gemini API key |
   | `LLM_MODEL` | `gemini-2.5-flash` | Free-tier model identifier |
   | `FRONTEND_ORIGIN` | `http://localhost:5173` | Set to your Vercel URL once deployed; use localhost for testing |
6. Click **Create Web Service**.
7. Once deployed, verify the health check endpoint:
   ```bash
   curl -i https://<your-render-service>.onrender.com/health
   ```
   Must return HTTP `200` with `{"status": "ok", "time": "..."}`.

---

## 3. Frontend Deployment (Vercel)

1. Log into your [Vercel](https://vercel.com) account.
2. Click **Add New... -> Project** and import your `Cold-Call_Guide` GitHub repository.
3. In the **Root Directory** selection:
   - Select **`Cold-Call_Guide (root)`** (notice Vercel already detects it with the purple **Vite** icon!).
   - Click **Continue**.
4. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://cold-call-guide-s90e.onrender.com` | Your live Render backend URL (no trailing slash) |
6. Click **Deploy**.
7. When the build finishes, copy your live production Vercel URL (e.g. `https://cold-call-guide-xxxx.vercel.app`).

---

## 4. Connect Render & Vercel (CORS Update)

To ensure the browser allows API requests from your Vercel domain to Render without CORS blocking:

1. Open your [Render Dashboard](https://dashboard.render.com).
2. Select your backend Web Service (`cold-call-guide-backend`).
3. Click the **Environment** tab on the left menu.
4. Locate the **`FRONTEND_ORIGIN`** environment variable.
5. Update its value to your Vercel URL:
   ```text
   FRONTEND_ORIGIN=https://<your-project>.vercel.app
   ```
   *(Note: You can also specify comma-separated origins, e.g. `https://<your-project>.vercel.app,http://localhost:5173`, or `*` to permit all origins).*
6. Click **Save Changes**. Render will automatically trigger a re-deploy with the new CORS origin active.

---

## 5. End-to-End Verification

1. Open your live Vercel URL in a private/incognito browser window.
2. If Render was idle, observe the banner: *"Waking the server, this can take up to a minute"* until it answers with 200 OK.
3. Start a call: enter name, role, and company.
4. Walk through the stages: select a tap on each stage, enter notes in the Stage 5 verbatim box, and either:
   - Click **Finish call** at Stage 8, or
   - Click **End call** at any stage.
5. Verify you see the **Call saved** screen.
6. Click **Past Calls** in the top navigation and confirm the call appears with name, company, stage reached in capitals, and date/time.
7. Click the call row to inspect its read-only detail view.


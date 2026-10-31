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
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   cd .
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

---

## 📸 Screenshots & UI Preview

| Live Call 8-Stage Guide | Balto AI Live Copilot | Past Calls History |
| :---: | :---: | :---: |
| *Structured stage flow & taps* | *Real-time Gemini voice suggestions* | *Call logs & AI summaries* |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <p>Built with ❤️ for high-performing sales teams.</p>
</div>

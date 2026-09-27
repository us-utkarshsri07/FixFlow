# FixFlow — Backend

FastAPI backend for the AI GitHub Bug-Fixing Agent.

## Quick Start

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env and add your GITHUB_TOKEN (optional but recommended)

# Start the server
uvicorn app.main:app --reload
```

Server runs at: **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Health check |
| POST | `/api/github/repository` | Fetch GitHub repository info |
| POST | `/api/analysis` | Analyse a bug report |
| POST | `/api/fixes` | Generate a proposed fix |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | GitHub PAT — raises rate limit to 5000/hr |
| `AI_API_KEY` | No | OpenAI key — enables LLM analysis (falls back to heuristics if blank) |
| `FRONTEND_ORIGIN` | No | Frontend URL for CORS (default: `http://localhost:5173`) |

## Architecture

```
React Frontend
     ↓  HTTP (fetch)
FastAPI Backend  (/api/github, /api/analysis, /api/fixes)
     ↓  httpx async
GitHub REST API  (api.github.com)
     ↓
  [optional] OpenAI API
```

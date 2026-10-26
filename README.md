# UDAAN ✈️

> **Give Every Idea Wings** — An AI-assisted product execution platform featuring **Flight Plan**, **Market Radar**, **Mind Map DAG**, and verified milestone tracking. Built with React 19, Tailwind CSS, Framer Motion, and Django REST Framework.

---

## 📋 Requirements

- **Frontend**: [Bun](https://bun.sh/) (recommended) or Node.js (20.19+ / 22.12+)
- **Backend**: Python 3.10+ (with `py` or `python` command)

---

## 🚀 Quick Start Guide

### Step 1: Start the Backend (Django)

In your terminal / PowerShell:

```powershell
cd backend

# 1. Create and activate a Python virtual environment
py -m venv .venv
.venv\Scripts\Activate.ps1

# 2. Copy the example environment file
Copy-Item example.env .env
# (or Copy-Item .env.example .env)

# 3. Install backend dependencies
py -m pip install -r requirements.txt

# 4. Run database migrations
py manage.py migrate

# 5. Start the backend server (listening on all interfaces so mobile devices can connect)
py manage.py runserver 0.0.0.0:8000
```

> **Backend Health Check**: Open `http://127.0.0.1:8000/api/health/` in your browser to verify it responds with `{"status": "healthy"}`.

### Market Intelligence setup

Market Intelligence is the third tab inside Marketing Studio. Google Maps supplies only
the geographic search and map layer; UDAAN does not treat Google Maps as a source of
sales, demand, or customer data.

Create `frontend/.env` from `frontend/.env.example` and set:

```env
VITE_GOOGLE_MAPS_API_KEY=your-browser-restricted-key
```

In Google Cloud Console, enable **Maps JavaScript API** and **Places API**, enable
billing as required by Google Maps Platform, and restrict the browser key to your
development/production referrers and only those APIs. Never put a server-side key in
the Vite environment.

To supply observed regional metrics, select a project in Market Intelligence and import
a UTF-8 CSV (maximum 5 MB / 5,000 rows). Supported columns are:

```text
location_name,country,state,city,latitude,longitude,period_start,period_end,enquiries,sales,website_visits,conversions,campaign_engagement,source_label
```

Imported values are labelled as observed business data. Without imported records, the
tab shows an honest insufficient-data state and does not calculate an opportunity
score. A selected map location can still be used to prefill a campaign brief, but its
geography is not treated as demand evidence.

Place search and administrative boundaries use OpenStreetMap Nominatim through the
Django backend. Results are cached for one hour and requests identify UDAAN with a
User-Agent. The map uses Google Maps only for rendering and viewport interaction;
Nominatim is not used as a source of sales or demand statistics. Review the
Nominatim usage policy and configure a suitable proxy/provider for production volume.

---

### Step 2: Start the Frontend (Vite)

In a **second terminal / PowerShell** window:

#### Using Bun (Fastest):
```powershell
cd frontend

# 1. Copy the example environment file
Copy-Item example.env .env
# (or Copy-Item .env.example .env)

# 2. Install dependencies
bun install

# 3. Start development server
bun run dev
```

#### Or Using npm:
```powershell
cd frontend
Copy-Item example.env .env
npm install
npm run dev
```

---

## 📱 The 2 Access URLs (Localhost & Mobile WiFi)

When Vite starts, it binds to `0.0.0.0:5173` and displays two access URLs:

```text
  VITE v7.3.7  ready in 1200 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://<YOUR_WIFI_IP>:5173/   (e.g., http://10.139.50.66:5173/)
```

1. **Local URL (`http://localhost:5173/`)**: Open in your desktop/laptop browser.
2. **Network URL (`http://<YOUR_WIFI_IP>:5173/`)**: Open in any **mobile phone browser connected to the same WiFi**.
   - The frontend automatically routes all API requests through the Vite dev proxy to Django, so your mobile phone works out-of-the-box with **zero mobile configuration and zero CORS issues**!

---

## 🛠️ Troubleshooting: "Port 5173 is already in use"

If you see:
```text
error when starting dev server:
Error: Port 5173 is already in use
error: script "dev" exited with code 1
```

This means an existing background process (Node or Bun) is already holding port `5173`.

### Fix in PowerShell (Windows):

Run this one-liner in PowerShell to instantly free port 5173:
```powershell
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Or step-by-step:
```powershell
# 1. Check which process ID is using port 5173:
Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess

# 2. Kill that process (replace <PID> with the number from step 1):
Stop-Process -Id <PID> -Force
```

Then re-run:
```powershell
bun run dev
# or npm run dev
```

*(Same applies for port 8000: `Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`)*

---

## ⚙️ Environment Variables Overview

Both directories include fully documented [`example.env`](file:///c:/Users/User/Desktop/learning/projects/UDAAN/backend/example.env) and [`.env.example`](file:///c:/Users/User/Desktop/learning/projects/UDAAN/backend/.env.example) files:

### Backend (`backend/.env`):
| Variable | Description | Default / Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Secret key for Django sessions and security | Dev fallback string |
| `DJANGO_DEBUG` | Development debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Hosts allowed to connect (`*` enables mobile WiFi access) | `*` in dev |
| `CORS_ALLOW_ALL_ORIGINS` | Enables mobile access from any device on WiFi | `True` in dev |
| `GEMINI_API_KEY` | Google Gemini API key for roadmap & mind map synthesis | Get from Google AI Studio |
| `GEMINI_MODEL` | Primary Gemini model | `gemini-2.5-flash` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID for marketing image generation | Required for campaign creatives |
| `CLOUDFLARE_API_TOKEN` | Server-only Cloudflare API token with Workers AI access | Required for campaign creatives |
| `CLOUDFLARE_AI_IMAGE_MODEL` | Workers AI image model | `@cf/black-forest-labs/flux-1-schnell` |
| `BRAVE_API_KEY` | Real web discovery for competitor pricing & complaints | Optional (Brave Search API) |
| `TAVILY_API_KEY` | Deep competitor content extraction | Optional (Tavily AI) |
| `DB_ENGINE` | Database engine (`sqlite` or `postgresql`) | `sqlite` |

Marketing captions continue to use the configured Gemini/Groq text provider. Marketing campaign images use Cloudflare Workers AI through Django; the Cloudflare token is never sent to the frontend. Add the Cloudflare values to `backend/.env`, restart Django, and grant the token permission to run Workers AI models. The campaign workflow accepts one to three image concepts, stores successful JPEGs in Django media storage, preserves partial failures, and supports per-image retry.

### Frontend (`frontend/.env`):
| Variable | Description | Recommended Setting |
|---|---|---|
| `VITE_API_BASE_URL` | Backend URL override | Leave **blank** in development (`VITE_API_BASE_URL=`) so Vite's proxy automatically bridges calls from both localhost and mobile devices on WiFi. |

---

## 🧪 Testing and Production Builds

### Frontend Tests (Node.js Test Runner):
```powershell
cd frontend
npm test
# (27 unit & integration tests)
```

### Production Frontend Build:
```powershell
cd frontend
npm run build
# (Compiles optimized assets to frontend/dist/)
```

### Backend Tests (Django):
```powershell
cd backend
py manage.py test apps.core
# (102 tests covering all API endpoints)
```

---

## 🌟 Key Platform Features

1. **Flight Plan 4-Mode Switcher**:
   - **Flow Map (Milestones)**: 4-milestone execution plan with deadline badges, overdue alerts, and schedule feasibility.
   - **Mind Map & Idea Tree**: Interactive 2D DAG canvas with animated SVG flow pipes, zoom/pan controls, and node spacing tools.
   - **Market Radar**: Real competitor matrix with public pricing models, verified customer pain points, and live web citations.
   - **Gantt & Timeline**: Chronological progress visualizer tracking milestone targets against sprint deadlines.
2. **Task Workbench & Multi-Track Verification**:
   - Progressive disclosure drawer linking tasks directly to Market Radar context and repository file signatures.
   - Independent tracking for **Manual User Completion**, **Repository Evidence**, and **Verification Checks**.
   - Awards XP and level progression with cryptographic receipts.
3. **AI Roadmap Replanning Diff**:
   - Interactive Before vs. After visual diff with color-coded additions/modifications.
   - Includes **"Accept Selected"**, **"Reject"**, and **1-Click Undo**.

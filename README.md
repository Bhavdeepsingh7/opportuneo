# OutreachAI — Full-Stack AI Job Outreach Platform

A production-ready full-stack app: React frontend + FastAPI backend + Supabase auth + Gmail OAuth.

## Architecture

```
outreach-ai/
├── frontend/          # React + Vite (deploy to Vercel)
│   └── src/
│       ├── context/   # AuthContext, AppContext (wizard state)
│       ├── lib/       # Supabase client, API client
│       └── pages/
│           ├── AuthPage.jsx          # Login / Signup / Google OAuth
│           ├── AppShell.jsx          # Sidebar layout (auth-protected)
│           └── app/
│               ├── Dashboard.jsx     # Wizard entry + progress
│               ├── ResumePage.jsx    # Step 1: Upload/parse resume
│               ├── ContactsPage.jsx  # Step 2: Upload CSV/PDF contacts
│               ├── ConfigurePage.jsx # Step 3: Job context + tone + generate
│               ├── ReviewPage.jsx    # Step 4: Edit emails, regenerate
│               ├── SendPage.jsx      # Step 5: Connect Gmail + send
│               └── SettingsPage.jsx  # API URL + Gmail connection
│
├── backend/           # FastAPI (deploy to Railway)
│   ├── main.py        # App entry + CORS
│   ├── app/
│   │   ├── config.py
│   │   ├── models/schemas.py
│   │   ├── routers/
│   │   │   ├── resume.py    # POST /api/resume/parse
│   │   │   ├── contacts.py  # POST /api/contacts/parse
│   │   │   ├── emails.py    # POST /api/emails/generate|regenerate|send
│   │   │   └── gmail.py     # GET /api/gmail/auth-url, /callback, /verify
│   │   └── services/
│   │       ├── resume_service.py   # PDF/DOCX/text → Claude AI parse
│   │       ├── contact_service.py  # CSV/PDF → contacts list
│   │       ├── email_generator.py  # Claude email generation
│   │       └── gmail_service.py    # Google OAuth + Gmail API send
│   ├── requirements.txt
│   └── Procfile       # Railway deploy command
│
└── supabase_schema.sql  # Run in Supabase SQL editor
```

---

## Setup Guide (30 minutes)

### 1. Supabase (Auth + Database)

1. Go to [supabase.com](https://supabase.com) → New project
2. In **SQL Editor**, paste and run `supabase_schema.sql`
3. In **Authentication > Providers**, enable **Google** (add OAuth credentials)
4. Copy your **Project URL** and **anon key** from Settings > API

### 2. Google Cloud (OAuth for Supabase login + Gmail sending)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Gmail API** + **Google+ API**
3. OAuth consent screen → add scopes: `gmail.send`, `userinfo.email`
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback` (for Supabase login)
   - `https://your-backend.up.railway.app/api/gmail/callback` (for Gmail sending)
6. Note your **Client ID** and **Client Secret**

### 3. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create key
3. Note it for backend `.env`

### 4. Backend — Deploy to Railway

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
```

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo → set root directory to `backend`
4. Add all environment variables from `.env.example`
5. Railway auto-detects `Procfile` and deploys

Your backend URL will be: `https://your-app.up.railway.app`

### 5. Frontend — Deploy to Vercel

```bash
cd frontend
cp .env.example .env
# Fill in .env:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGci...
# VITE_API_URL=https://your-backend.up.railway.app
```

```bash
npm install
npm run dev    # local dev
```

**Deploy:**
```bash
npx vercel     # follow prompts, add env vars in Vercel dashboard
```

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

Start RabbitMQ and the campaign workers in separate terminals:

```bash
docker run -d --name outreach-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

cd backend
python -m workers.email_worker
python -m workers.dead_letter_worker
```

RabbitMQ management UI: `http://localhost:15672` (`guest` / `guest`).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in values
npm run dev
# App: http://localhost:5173
```

---

## User Flow

```
Sign up / Google login (Supabase)
    ↓
Dashboard — wizard overview
    ↓
Step 1: Upload resume (PDF/DOCX/paste) → Claude parses it
    ↓
Step 2: Upload contacts CSV or PDF → extract name/email/company/title
    ↓
Step 3: Add job context (optional) + pick tone → Generate emails
    ↓
Step 4: Review all emails — edit inline or regenerate with feedback
    ↓
Step 5: Connect Gmail (OAuth) → Send all emails from your account
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resume/parse` | Parse PDF/DOCX/text resume |
| POST | `/api/contacts/parse` | Parse CSV/PDF contact list |
| POST | `/api/emails/generate` | Generate personalized emails via Claude |
| POST | `/api/emails/regenerate` | Regenerate one email with feedback |
| POST | `/api/emails/send` | Queue asynchronous Gmail delivery |
| GET | `/api/gmail/auth-url` | Get Google OAuth URL |
| GET | `/api/gmail/callback` | Handle OAuth redirect |
| POST | `/api/gmail/verify` | Verify stored token |
| POST | `/api/payments/orders` | Create an authenticated Razorpay order |
| POST | `/api/payments/verify` | Verify checkout payment and activate subscription |
| GET | `/api/payments/subscription` | Load the authenticated user's subscription and credits |
| POST | `/api/payments/webhook` | Process signed Razorpay `payment.captured` webhooks |

---

## CSV Format

Your contacts CSV should have these columns (names are flexible — we detect them):

```csv
name,email,company,title
Sarah Chen,sarah@stripe.com,Stripe,Engineering Manager
James Park,jpark@airbnb.com,Airbnb,HR Director
```

---

## Environment Variables

### Backend `.env`
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-backend.up.railway.app/api/gmail/callback
FRONTEND_URL=https://your-frontend.vercel.app
SECRET_KEY=random-32-char-string
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=campaign_queue
RABBITMQ_DEAD_QUEUE=dead_letter_queue
```

### Frontend `.env`
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://your-backend.up.railway.app
```

### Razorpay Test Mode

1. Create Test Mode API keys in Razorpay and add them to the backend environment.
2. Run the `profiles` migration statements in `supabase_schema.sql`.
3. In Razorpay, create a webhook for `payment.captured` pointing to:
   `https://your-backend.example.com/api/payments/webhook`
4. Set the same webhook secret as `RAZORPAY_WEBHOOK_SECRET` in the backend.
5. Use Razorpay test cards or test UPI IDs from the existing checkout page.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Auth | Supabase Auth (email + Google OAuth) |
| Styling | CSS custom properties (Cabinet Grotesk + Instrument Sans) |
| Backend | FastAPI + Uvicorn |
| AI | Anthropic Claude Sonnet (resume parse + email generation) |
| Email sending | Gmail API via Google OAuth |
| File parsing | PyPDF2, python-docx, pandas |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## License
MIT — ship it, sell it, make money.

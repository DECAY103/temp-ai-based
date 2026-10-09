# Deployment Guide

See the full guide at [deployment_guide.md](../../../.gemini/antigravity-ide/brain/33375919-4cb3-492b-a165-e03beca61e49/deployment_guide.md) or read below.

## What is deployed

The system has a Next.js frontend, a FastAPI worker/API, and PostgreSQL.

**2FA:** Email OTP is the default (`OTP_MODE=email`). A 6-digit code is emailed after each successful password check. Set `OTP_MODE=totp` to revert to authenticator-app QR codes.

**LLM:** `LLM_PROVIDER=heuristic` is free: deterministic rubric-keyword scoring with no external API. Set `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` for Gemini Flash quality scoring.

## Low-cost production deployment

| Component | Service | Key setting |
|-----------|---------|-------------|
| PostgreSQL | Supabase free project | `DATABASE_URL` = direct connection string |
| API/worker | Render | deploy `backend/Dockerfile`; port 8000 |
| Frontend | Vercel | root dir `frontend`; set `NEXT_PUBLIC_API_URL` |

## Backend environment variables (Render)

```text
DATABASE_URL=postgresql://...
JWT_SECRET=<long random secret>
COOKIE_SECURE=true
CORS_ORIGINS=https://your-vercel-site.vercel.app
FRONTEND_URL=https://your-vercel-site.vercel.app

# Email Delivery (Resend HTTPS API — Recommended)
RESEND_API_KEY=re_123456789...
RESEND_FROM_EMAIL=Resume Screening <onboarding@resend.dev>

# (Optional) Legacy SMTP fallback — only used if RESEND_API_KEY is not set
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-gmail-app-password
# SMTP_FROM_EMAIL=your-email@gmail.com

# 2FA OTP Expiration (minutes)
OTP_MODE=email
SMTP_OTP_EXPIRE_MINUTES=10

# LLM (optional — heuristic is free)
LLM_PROVIDER=heuristic
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=<from aistudio.google.com>
STAGE1_TOP_N=10
```

## Frontend — Vercel

1. Add `NEXT_PUBLIC_API_URL=https://your-api.onrender.com` in Vercel env vars.
2. Update `frontend/next.config.js`:

```js
const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` }];
  },
};
module.exports = nextConfig;
```

## Local dev

```bash
cd backend && cp .env.example .env   # set DATABASE_URL + JWT_SECRET
uvicorn main:app --reload

cd frontend && npm install && npm run dev
```

Leave `SMTP_HOST=` blank locally — OTP codes print to the backend console log.


## What is deployed

The system has a Next.js frontend, a FastAPI worker/API, and PostgreSQL. The
default `LLM_PROVIDER=heuristic` is free: it produces a transparent rubric-keyword
score and skill-gap explanation. It lets the complete workflow run without any
generative-AI account. Set `LLM_PROVIDER=gemini` and a `GEMINI_API_KEY` only when
you want Gemini scoring for the top-N semantic matches.

## Local demo with Docker

1. Install Docker Desktop or Docker Engine.
2. From this repository root, run `docker compose up --build`.
3. Open `http://localhost:3000`.
4. Create a recruiter account. Copy the displayed `otpauth://` setup URI into a
   TOTP app such as Google Authenticator, Authy, or 1Password. Sign in with its
   six-digit code.
5. Upload a ZIP of text-based PDF resumes and a JSON rubric. When processing is
   complete, open the leaderboard link. To submit a candidate PDF later, create
   a candidate account and use the recruiter batch ID as the job ID.

The database schema is applied automatically when FastAPI starts. `docker
compose down -v` removes the local database volume when you want a fresh demo.

## Low-cost production deployment

Use these three managed services:

| Component | Recommended service | Required setting |
| --- | --- | --- |
| PostgreSQL | Supabase free project | use the direct PostgreSQL connection string as `DATABASE_URL` |
| API/worker | Render, Railway, or Fly.io | deploy `backend/Dockerfile`; expose port 8000 |
| Frontend | Vercel | project root `frontend`; set `NEXT_PUBLIC_API_URL` to your API URL |

Backend environment variables:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=<long random secret>
JWT_ALGORITHM=HS256
COOKIE_SECURE=true
CORS_ORIGINS=https://your-vercel-site.vercel.app
FRONTEND_URL=https://your-vercel-site.vercel.app
LLM_PROVIDER=heuristic
STAGE1_TOP_N=10
MIN_SIMILARITY_SCORE=-1
MAX_PDF_SIZE_MB=5
MAX_ZIP_SIZE_MB=50
MAX_ZIP_UNCOMPRESSED_MB=250
PASSWORD_RESET_EXPIRE_MINUTES=30
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

For Gemini, change only the following after creating an API key in Google AI
Studio:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=<server-side secret>
GEMINI_MODEL=gemini-2.5-flash
```

Never put the Gemini key or database URL in `NEXT_PUBLIC_*` variables. Configure
the backend CORS/reverse proxy so the Vercel site can reach it over HTTPS. Set
`NEXT_PUBLIC_API_URL=https://your-api.example.com` in Vercel, then redeploy the
frontend. The frontend proxy keeps browser API requests same-origin.

## Cost and model choices

- **Free default (included):** `heuristic`. No external LLM calls; appropriate
  for a class demonstration and predictable grading.
- **Gemini Flash:** optional top-N evaluator. Keep `STAGE1_TOP_N` low (for
  example 5-10), process only anonymised text, and set a monthly provider quota.
- **Local model option:** add an OpenAI-compatible local endpoint such as Ollama
  only if you control a host with enough RAM/CPU. This avoids per-request fees
  but is usually harder to host than the heuristic default.

Automated ranks are decision support only. A recruiter must review the extracted
skills, missing skills, and résumé before making any employment decision.

# RingTask Deployment Guide

## Quick Demo (Local)

**Backend:**
```bash
npm install
cp .env.example .env
# Edit .env with your Twilio/Retell/Stripe keys
npm run dev
```

**Frontend:**
```bash
cd web
npm install
npm run dev
```

Visit http://localhost:5173

---

## Free Hosting Options

### Option 1: Vercel (Frontend Only Demo)

Deploy the React frontend as a static demo:

```bash
cd web
npm run build
# Deploy dist/ to Vercel
```

**Pros:** Free, instant, auto-SSL
**Cons:** No backend = no actual functionality, just UI preview

### Option 2: Railway (Full Stack)

Railway free tier includes:
- Backend hosting
- PostgreSQL database (or stick with SQLite)
- $5/month credit (enough for low traffic)

**Setup:**
1. Push repo to GitHub (✅ done)
2. Connect Railway to GitHub
3. Create new project from repo
4. Add environment variables (TWILIO_*, RETELL_*, STRIPE_*)
5. Railway auto-detects Node.js and runs `npm start`

**Frontend:**
- Build: `cd web && npm run build`
- Deploy `web/dist/` separately to Vercel/Netlify

### Option 3: Render (Free Tier)

Similar to Railway but more restrictive free tier (spins down after inactivity).

---

## Production Considerations

**Database:**
- SQLite works for demo but switch to PostgreSQL for production
- Railway/Render both offer managed Postgres

**Costs:**
- Twilio: $1/month per number + usage
- Retell AI: Pay per minute (voice calls)
- Stripe: 2.9% + 30¢ per transaction
- Hosting: Railway free tier or $5-10/month

**Secrets:**
- Never commit .env
- Use Railway/Vercel environment variables

---

## Quick Start (No Deploy)

Just want to show the UI? Run locally:

```bash
git clone https://github.com/mikecavallo/ringtask.git
cd ringtask/web
npm install
npm run dev
```

Visit http://localhost:5173 - frontend works standalone (API calls will fail but UI is visible).

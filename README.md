# Bloodate_1 — React + Express + MongoDB

This folder contains a minimal React frontend (Vite) and an Express backend (Node + Prisma + PostgreSQL).

Quick start (Windows, PowerShell):

1. Backend

```powershell
cd bloodate_1/backend
npm install
# create `.env` (copy from `.env.example`) and set `DATABASE_URL` for Neon/Postgres
npm run dev
```

2. Frontend

```powershell
cd bloodate_1/frontend
npm install
# create `.env` (copy from `.env.example`) if you need a custom API base URL
npm run dev
```

Backend runs on port 5000 by default. Frontend Vite runs on port 5173 — the frontend is configured to proxy `/api` to the backend.

You asked to keep the original project intact; everything is placed under `bloodate_1`.

The backend seed script reads `SEED_DEFAULT_PASSWORD` from `backend/.env` when creating the test users.

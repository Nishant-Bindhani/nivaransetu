

# 🧭 NivaranSetu

**AI-Powered Omnichannel Complaint & Ticket Management System**

![Status](https://img.shields.io/badge/status-In%20Progress-red)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)



---

A production-grade, enterprise complaint and ticket management platform where citizens submit complaints via **Web, WhatsApp, or Email**. Departments manage the complete resolution workflow, and AI enhances the system without ever blocking it. The platform remains fully functional even if AI is disabled.

## 🎯 What Problem This Solves

Government and organizational complaint handling is typically fragmented. Complaints arrive through disconnected channels (a call center, a paper form, an email inbox), get manually routed with no SLA tracking, and citizens have no way to verify a complaint was actually resolved rather than just marked closed. NivaranSetu unifies this into one system:

- 📥 **Omnichannel intake.** A citizen can file the same kind of complaint from a web form, a WhatsApp message, or a plain email, and it lands as one consistent ticket.

- ✅ **Structured resolution, not just status flags.** An officer must submit proof (before/after images, GPS, work summary) before a ticket can close, and the citizen can accept or reject that resolution.

- 🏢 **Department-aware routing.** Tickets carry category, priority, and department/team assignment, with SLA deadlines and escalation.

- 🤖 **AI as an enhancement, not a dependency.** Classification, summarization, duplicate detection, and a RAG-based assistant all degrade gracefully. If AI is disabled (`AI_ENABLED=false`), tickets, search, and manual workflows continue working exactly as before: search falls back from hybrid (FTS + TF-IDF + semantic) to plain FTS + TF-IDF, categories are assigned manually, and replies are written by hand.

## ✨ Core Features

- 🔐 **Identity & Access**: registration/login, JWT with refresh token rotation, Google OAuth, email verification, forgot/reset password, session & device management, login history

- 🛡️ **Authorization (RBAC)**: Citizen, Officer, Manager, Admin, each inheriting the tier below

- 🎫 **Ticket Lifecycle**: draft, submission, assignment, in-progress, resolution, user verification, close/reopen, with full timeline and audit trail

- 📸 **Resolution Verification**: officers submit proof (images, GPS, summary) before closing; citizens accept, reject, or reopen
- 🗺️ **GIS & Maps**: GPS-tagged filing, reverse geocoding, officer location tracking, department heatmaps
- 🧠 **AI Intelligence Engine**: classification, summarization, duplicate detection, and a role-specific RAG assistant, fully optional and toggleable
- 💬 **Communication**: Web, WhatsApp, and Email intake with real-time notifications via Socket.IO
- 📈 **Analytics**: role-specific dashboards for citizens, officers, managers, and admins

## 🧰 Tech Stack

<details open>
<summary><strong>Frontend</strong></summary>

- React 19 + TypeScript, Vite
- Tailwind CSS v4 + shadcn/ui
- React Router DOM
- TanStack Query (server state) + Redux Toolkit (client state)
- React Hook Form + Zod
- Axios
- React Leaflet + Leaflet (interactive maps)
- Recharts (analytics charts)
- Framer Motion (animations)
- Socket.IO Client (real-time notifications)
- Sonner (toasts)

</details>

<details open>
<summary><strong>Backend</strong></summary>

- Node.js + Express, TypeScript (ESM/NodeNext)
- Prisma ORM (driver-adapter based, `@prisma/adapter-pg`) + raw SQL (`$queryRaw`) for FTS/pgvector/PostGIS queries
- PostgreSQL + PostGIS + pgvector via [Neon](https://neon.tech) (serverless)
- Redis via [Upstash](https://upstash.com) (`ioredis` client) + BullMQ for background jobs
- JWT (`jsonwebtoken`) for auth, access + refresh token rotation
- Passport.js (Google OAuth)
- Argon2 (password hashing)
- Multer + Sharp (file upload + image compression)
- Cloudinary SDK (cloud file storage)
- Resend SDK (transactional email) + `mailparser` (inbound email MIME parsing)
- Socket.IO (real-time WebSocket)
- `natural` (TF-IDF tokenization), `h3-js` (hexagonal binning for heatmaps)
- Pino (structured logging)
- Helmet + CORS + express-rate-limit (security)
- Zod (input/env validation)
- node-cron (scheduled jobs)
- `lru-cache` (in-memory RBAC cache)

</details>

<details open>
<summary><strong>AI / Search</strong> (all free-tier)</summary>

- Gemini 2.0 Flash (primary LLM) + Gemini text-embedding-004 (primary embeddings, 256-dim)
- Groq Llama 3.x (fallback LLM)
- Ollama (local dev LLM + embeddings, optional)
- Tesseract.js (OCR), Whisper tiny model (speech-to-text)
- Custom-built RAG pipeline and custom RRF ranker, no LangChain
- PostgreSQL FTS (tsvector/tsquery, GIN indexes) + pgvector IVFFlat (vector similarity)

</details>

<details open>
<summary><strong>Maps</strong></summary>

- React Leaflet, Leaflet, OpenStreetMap, Nominatim, PostGIS, Turf.js

</details>

<details open>
<summary><strong>DevOps & Deployment</strong></summary>

- Docker + Docker Compose *(planned, Module 8)*
- GitHub Actions: CI on every push (typecheck, lint, build, security audit)
- Vercel (frontend deploy) + Render (backend deploy) *(planned)*

</details>

## 📁 Project Structure

```
nivaransetu/
├── backend/     Express API, Prisma schema, background jobs
├── frontend/    React SPA
└── .github/     CI workflows
```


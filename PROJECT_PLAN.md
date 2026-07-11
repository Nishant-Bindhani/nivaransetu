# NivaranSetu — Master Project Plan
## AI-Powered Omnichannel Complaint & Ticket Management System

---

## Table of Contents
1. [Project Summary](#project-summary)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Hotspot Resolutions](#hotspot-resolutions)
5. [Database Design Summary](#database-design-summary)
6. [Milestone Roadmap](#milestone-roadmap)
7. [Phase Breakdown with Dependencies](#phase-breakdown-with-dependencies)
8. [Free Tier Budget Allocation](#free-tier-budget-allocation)
9. [Folder Structure](#folder-structure)

---

## Project Summary

NivaranSetu is a production-grade complaint and ticket management platform. Citizens submit complaints via Web, WhatsApp, or Email. Departments manage the full lifecycle. AI enhances but never blocks the system.

- **Cost:** $0/month — entirely free tier
- **Architecture:** Modular Monolith → designed to evolve into microservices
- **AI:** Optional, feature-toggled, gracefully degraded at every layer
- **Philosophy:** Build from scratch only where it is lightweight and explainable. Use battle-tested libraries where they are faster or safer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│  React 19 + TypeScript + Vite + Tailwind + shadcn/ui    │
│  React Leaflet + HTML5 Canvas  │  Socket.IO Client      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                    BACKEND (Render)                      │
│  Node.js LTS + Express.js + TypeScript                  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Auth   │ │ Tickets  │ │  AI/RAG  │ │   GIS    │  │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           BullMQ Workers (Background Jobs)        │  │
│  │  AI Analysis │ OCR │ Email │ WhatsApp │ Cleanup   │  │
│  └──────────────────────────────────────────────────┘  │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌───▼───────────────────┐
│    Neon     │ │  Upstash   │ │      Cloudinary        │
│ PostgreSQL  │ │   Redis    │ │   (File Storage CDN)   │
│ PostGIS     │ │ BullMQ     │ └───────────────────────┘
│ pgvector    │ │ RBAC cache │
│ FTS (GIN)   │ │ Tokens     │
└─────────────┘ └────────────┘
```

### AI Provider Chain (graceful degradation)
```
Request
  ↓
GeminiProvider (primary, free tier)
  ↓ [if rate-limited or unavailable]
GroqProvider (fallback, fast Llama 3.x)
  ↓ [if rate-limited or unavailable]
OllamaProvider (local dev only, optional)
  ↓ [if offline or OLLAMA_ENABLED=false]
NullProvider (no-op, system continues normally)
```

### Embedding Provider Chain
```
GeminiEmbeddingProvider (text-embedding-004, free tier)
  ↓ [if unavailable]
OllamaEmbeddingProvider (nomic-embed-text, local only)
  ↓ [if both unavailable]
Skip vector search → FTS + TF-IDF still run → RRF works with 2 sources
```

---

## Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React 19 + TypeScript + Vite | Core framework |
| Tailwind CSS + shadcn/ui | Styling and components |
| React Router DOM | Client-side routing |
| TanStack Query | Server state and caching |
| React Hook Form + Zod | Form validation |
| Axios | HTTP client |
| React Leaflet + Leaflet | Interactive maps |
| HTML5 Canvas | KDE heatmap rendering (custom) |
| Recharts | Analytics charts |
| Framer Motion | Animations |
| Socket.IO Client | Real-time notifications |
| Sonner | Toast notifications |

### Backend
| Tool | Purpose |
|------|---------|
| Node.js LTS + Express.js + TypeScript | Core server |
| Prisma ORM | Standard CRUD queries |
| Raw SQL via Prisma `$queryRaw` | FTS, pgvector, PostGIS queries |
| PostgreSQL + PostGIS + pgvector (Neon) | Database |
| Upstash Redis + BullMQ | Job queue |
| Socket.IO | Real-time WebSocket |
| jsonwebtoken | JWT signing/verification |
| Passport.js | Google OAuth |
| Argon2 | Password hashing |
| Multer + Sharp | File upload + compression |
| Cloudinary SDK | Cloud storage |
| Resend SDK | Transactional email |
| mailparser | Inbound email MIME parsing |
| natural | TF-IDF tokenization |
| h3-js | Hexagonal binning for heatmaps |
| Tesseract.js | OCR |
| Pino | Structured logging |
| Helmet + CORS + express-rate-limit | Security headers |
| Zod | Input validation |
| node-cron | Scheduled jobs |
| lru-cache | In-memory RBAC cache |

### AI / Search (All Free)
| Tool | Purpose |
|------|---------|
| Gemini 2.0 Flash | Primary LLM (free tier) |
| Gemini text-embedding-004 | Primary embeddings (256-dim) |
| Groq Llama 3.x | Fallback LLM (free tier) |
| Ollama | Local dev LLM + embeddings (optional) |
| Tesseract.js | OCR (open source) |
| Whisper (tiny model) | Speech-to-text (open source) |
| Custom RAG pipeline | No LangChain — built from scratch |
| Custom RRF ranker | From scratch, works with 2-3 sources |
| PostgreSQL FTS | tsvector/tsquery, GIN indexes |
| pgvector IVFFlat | Vector similarity (not HNSW on free tier) |

### DevOps
| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Local dev environment |
| GitHub Actions | CI/CD (2,000 min/month free) |
| Vercel | Frontend deployment |
| Render | Backend deployment |

---

## Hotspot Resolutions

All 12 critical hotspots have concrete solutions that stay within free tier limits.

---

### Hotspot 1: Refresh Token Rotation Race Condition

**Problem:** Two concurrent requests arrive with the same refresh token. Without atomic locking, both succeed or the second silently fails, logging out the user.

**Solution: Redis Lua Script with 10-Second Reuse Window**

```
On refresh request:
  1. Run atomic Lua script on Redis
  2. Script checks: does token:consumed:{id} exist?
     → If NO:  mark consumed, store newly issued token (10s TTL), return new token
     → If YES, and issued token key still exists (within 10s): return that same new token
     → If YES, and issued token key expired (>10s): return 403
  3. Token stored in DB as hashed value (never raw JWT in Redis)
```

**Why Lua:** GET + SET is not atomic in Redis. Lua scripts execute atomically — no race window.

**Redis cost:** ~4 commands per rotation. At 100 daily users with 8 refreshes each = 3,200 commands.

---

### Hotspot 2: RRF Aggregation + TF-IDF at Scale

**Problem:** RRF breaks when one source returns zero results. In-memory TF-IDF won't scale to thousands of tickets.

**Solution A: RRF Zero-Result Handling**

When a source returns no results for a document, assign rank = (max_rank_of_that_source + 1). This gives the minimum possible RRF contribution without breaking the formula. RRF is additive — documents appearing in more sources naturally score higher.

```
RRF score = Σ  1 / (60 + rank_i)   for each source i that returned the document
```

**Solution B: Persisted TF-IDF in PostgreSQL**

- Store IDF scores in a `idf_scores` table (token → idf_value)
- Recompute nightly via BullMQ scheduled job (Sunday 2 AM)
- At query time: tokenize query, look up IDF scores, compute TF×IDF per document in SQL
- Documents not in IDF table get a default IDF of 3.0 (reasonable for unseen tokens)
- Cost: one BullMQ job per week — negligible

---

### Hotspot 3: pgvector + PostGIS on 0.5GB Neon

**Problem:** HNSW indexes + PostGIS GIST indexes + GIN FTS indexes all compete on 0.5GB.

**Solution: Use IVFFlat instead of HNSW + Reduce Embedding Dimensions to 256**

| Index Type | Storage (10K vectors/rows) |
|------------|---------------------------|
| HNSW 768-dim | ~40-50 MB |
| HNSW 256-dim | ~15-18 MB |
| **IVFFlat 256-dim** | **~5-7 MB** ← use this |
| PostGIS GIST | ~5 MB |
| FTS GIN | ~10-12 MB |
| **Total** | **~22-24 MB** for indexes |

**IVFFlat config:**
```sql
CREATE INDEX idx_kb_embedding ON knowledge_base_articles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 30);   -- sqrt(row_count) rule; start low, adjust
```

**Storage discipline:**
- Cleanup job (weekly): delete audit logs > 90 days, AI logs > 30 days, notification records > 60 days
- Embedding dimensions: 256 (not 768 or 1536)
- Attachments: Cloudinary only, never BYTEA in DB
- EmbeddingCache table: deduplicates re-embedding of unchanged content

---

### Hotspot 4: WhatsApp Conversation State Machine

**Problem:** Multi-turn flows (OTP → complaint filing) need state across messages. Users drop off mid-flow. Timeouts must clean up abandoned sessions.

**Solution: Redis-Backed State Machine with 30-Minute TTL**

```
States:
  IDLE → AWAITING_OTP → OTP_VERIFIED → SELECTING_CATEGORY
       → ENTERING_DETAILS → CONFIRMING_LOCATION → SUBMITTED

State key: whatsapp:session:{phoneNumber}
Value:      JSON { state, data, lastMessageAt }
TTL:        1800 seconds (30 minutes, reset on each message)
```

- State lives in Redis (fast, ephemeral) — not PostgreSQL
- When flow completes → write final Ticket to PostgreSQL (durable)
- Abandoned sessions expire automatically via Redis TTL (no cleanup job needed)
- Webhook verification: check `X-Hub-Signature-256` header using HMAC-SHA256 against WHATSAPP_APP_SECRET
- Webhook must return HTTP 200 immediately; enqueue processing in BullMQ
- Redis cost: ~2 commands per message (GET state + SET state) = ~500 commands/day

---

### Hotspot 5: Render Cold Start (Backend Spins Down After 15 Minutes)

**Problem:** Render free tier spins down after 15 minutes of inactivity. Cold start = 30-60 seconds. This breaks: Meta webhook delivery, BullMQ workers, Socket.IO clients.

**Solution: GitHub Actions Keep-Alive Ping (Free)**

```yaml
# .github/workflows/keep-alive.yml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/14 * * * *'   # every 14 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sf ${{ secrets.RENDER_BACKEND_URL }}/health || true
```

**Cost:** 14-minute pings × 24h × 30 days = ~30 minutes of GitHub Actions CPU/month (well within 2,000 min limit)

**Additional mitigations:**
- BullMQ jobs survive spin-down: stored in Upstash Redis, not Node.js memory. Jobs execute when backend wakes.
- WhatsApp webhooks: Meta retries 3× with exponential backoff (5s, 25s, 125s). Always return 200 immediately and enqueue asynchronously.
- Socket.IO clients: implement reconnection with exponential backoff in frontend.
- Neon DB also has cold-start: first query after inactivity is slow. Implement a health check that warms both server and DB on startup.

---

### Hotspot 6: Upstash Redis 10,000 Commands/Day Budget

**Problem:** BullMQ uses 8-15 commands per job. RBAC cache + tokens + job queue compete for 10K daily commands.

**Solution: Move RBAC Cache to In-Memory (lru-cache)**

```
Feature                         Commands/Day    Notes
────────────────────────────────────────────────────────
Token refresh + rotation           800          ~100 users × 8 cmds/refresh
WhatsApp session state             500          ~10 active sessions × 50 cmds
BullMQ (500 jobs/day)            4,500          9 cmds per job lifecycle
In-memory RBAC (lru-cache)           0          Moved out of Redis entirely
Session/socket tracking          1,000          50 concurrent sessions
Notification idempotency           300          Dedup keys
Search caching                   1,000          ~500 queries with result cache
Reserve/headroom                 1,900          ~19% buffer
────────────────────────────────────────────────────────
TOTAL                           10,000
```

**RBAC in-memory cache config:**
```
LRU cache: max 1,000 entries, TTL 5 minutes
On permission change: invalidate specific entry (not full flush)
Cache miss: hit PostgreSQL, populate cache
Result: 0 Redis commands for RBAC on ~80% of requests
```

---

### Hotspot 7: Email-to-Ticket Parsing

**Problem:** Inbound emails arrive in wildly inconsistent formats — HTML, plaintext, forwarded threads, auto-replies, spam, nested MIME.

**Solution: mailparser + Rule-Based Pre-Processing**

**Step 1 — Auto-reply detection (before parsing ticket):**
```
Check headers first:
  Auto-Submitted: not 'no'  → discard
  X-Autoreply present       → discard
  X-Autoresponder present   → discard

Check subject (regex):
  /^(auto|automatic)\s?reply/i     → discard
  /out of office/i                 → discard
  /^delivery.*(failure|status)/i   → discard (bounces)
```

**Step 2 — Extract latest reply from threads:**
```
Split on common thread separators:
  /^----+\s*original message/im
  /^on .+ wrote:/im
  /^-{10,}/m

Take text BEFORE the first separator (latest message only)
Strip lines starting with '>' (quoted text)
```

**Step 3 — Parse MIME with mailparser:**
```
simpleParser(rawEmailRFC2822) → {
  from, subject, text, html, attachments[]
}
```

**Step 4 — Create ticket:**
- Title = email subject (truncated to 200 chars)
- Description = extracted text body
- Source = 'email'
- Attachments = upload to Cloudinary via BullMQ job
- If AI enabled: run classification in background job

---

### Hotspot 8: OCR + Whisper CPU Contention on Render 512MB RAM

**Problem:** Tesseract.js (~150MB peak) and Whisper tiny model (~40MB) on Render's 512MB shared RAM. Running concurrently risks OOM.

**Solution: Single-Threaded BullMQ Queue + Image Pre-Compression**

```
BullMQ OCR/Whisper queue concurrency = 1 (never parallel)
Job timeout = 60 seconds (Render kills long processes)

Pre-processing pipeline:
  Image → Sharp resize to max 1200×1200 → JPEG quality 70
  Audio → ffmpeg convert to 16kHz mono WAV → libopus 32kbps
```

**Memory footprint after optimization:**
```
Node.js base:          ~100MB
Tesseract (compressed image): ~80MB peak (was 150MB)
Whisper tiny + 30s audio:     ~40MB peak
Never run both at once:       max 180MB for processing
Total safe ceiling:           280MB (well under 512MB)
```

**If memory is still tight:** offload OCR to Cloudinary's free-tier OCR addon (included in 25 credits/month). OCR_ENABLED flag makes this optional.

---

### Hotspot 9: KDE Heatmap Scaling

**Problem:** Client-side Gaussian KDE on Canvas starts lagging at ~300+ points. India-wide deployment could have thousands of complaints per city.

**Solution: Server-Side H3 Hexagonal Binning + GeoJSON Rendering**

Instead of sending raw coordinates to the browser and computing KDE:

```
Server:
  1. Query PostGIS for complaint coordinates within map viewport bbox
  2. Aggregate into H3 hexagonal bins (resolution 8 = ~220m hexagons)
  3. Return GeoJSON FeatureCollection with hex polygons + complaint count

Client:
  1. Render hexagons as filled GeoJSON polygons on Leaflet
  2. Color by density (blue → yellow → red)
  3. On pan/zoom: fetch new H3 bins for new viewport
```

**H3 resolution guide:**
```
Resolution 7 = ~1.2km hexagons   (city overview)
Resolution 8 = ~0.5km hexagons   (district view)   ← default
Resolution 9 = ~0.2km hexagons   (street view zoom)
```

**PostgreSQL pre-aggregation (materialized view, refreshed hourly):**
```sql
CREATE MATERIALIZED VIEW heatmap_h3 AS
SELECT
  h3_geo_to_h3index(ST_Y(location_geom), ST_X(location_geom), 8) as hex_id,
  COUNT(*) as complaint_count
FROM tickets
WHERE location_geom IS NOT NULL
  AND created_at > now() - interval '1 year'
GROUP BY hex_id;

CREATE INDEX idx_heatmap_hex ON heatmap_h3 (hex_id);
```

**Fallback for small datasets (<500 points):** keep the original Canvas KDE as-is. Switch to H3 automatically when point count exceeds threshold.

---

### Hotspot 10: Multi-Channel Notification Reliability

**Problem:** A single event triggers in-app (Socket.IO), email (Resend 100/day cap), and WhatsApp (Meta 1,000/month). Partial failures must not cause double-delivery or silent drops.

**Solution: Idempotent Fan-Out via BullMQ with Per-Channel Queues**

```
Event fires (e.g., ticket assigned)
  ↓
Generate idempotency key = SHA256(ticketId + event + timestamp)
  ↓
Check Redis: processed:{key} exists?
  → Yes: skip (already delivered)
  → No:  proceed
  ↓
Enqueue 3 separate BullMQ jobs with jobId = idempotency key:
  - job: socket:notify:{key}     → in-app via Socket.IO
  - job: email:notify:{key}      → Resend (with daily counter check)
  - job: whatsapp:notify:{key}   → Meta Cloud API
  ↓
Each job runs independently with retries:
  - socket: 1 attempt (fire and forget, user reconnects anyway)
  - email:  3 attempts with exponential backoff
  - whatsapp: 3 attempts with exponential backoff
  ↓
On all 3 complete: mark processed:{key} in Redis (24h TTL)
```

**Resend daily cap handling:**
```
Redis counter: resend:count:{YYYY-MM-DD}
Increment on each send. If > 95 (buffer for critical emails):
  → Queue email for next day (BullMQ delayed job)
  → Priority tiers:
      Critical (security alert, password reset): always send
      High (ticket assigned, resolved):          send if under cap
      Low (weekly digest, status update):        delay if near cap
```

---

### Hotspot 11: RAG Permission Filtering

**Problem:** Vector search must only return documents the requesting user can see. HNSW does not support efficient WHERE clause filtering.

**Solution: IVFFlat with WHERE Clause (works natively in pgvector)**

```sql
-- IVFFlat supports filtered queries efficiently
SELECT id, title,
       1 - (embedding <=> $1::vector) as similarity
FROM knowledge_base_articles
WHERE department_id = $2          -- pre-filter by permission
  OR is_public = true             -- OR public content always included
ORDER BY similarity DESC
LIMIT 10;
```

**Why IVFFlat over HNSW here:** IVFFlat searches specific "lists" (clusters). With a WHERE clause, only relevant clusters are probed — the filter is partially respected during search, not purely post-retrieval.

**Permission matrix for RAG:**
```
Citizen:   public FAQs + own ticket history
Officer:   public + department SOPs + all tickets in their dept
Manager:   officer access + cross-department analytics docs
Admin:     everything
```

**Post-retrieval safety check:** even after SQL WHERE filtering, verify each returned document's `department_id` and `visibility` in application code before including in context. Defense in depth.

---

### Hotspot 12: Nominatim Rate Limiting (1 req/sec)

**Problem:** Nominatim's public instance limits to 1 request/second and prohibits bulk geocoding.

**Solution: Multi-Strategy Approach**

**Strategy 1 — Client-side geocoding for officer field updates (0 server calls):**
Browser Leaflet map click → browser fetches Nominatim directly (each browser = separate User-Agent, not counted against server quota).

**Strategy 2 — Photon API for user address search (no rate limit):**
```
Photon (photon.komoot.io) is a Nominatim fork with no documented rate limit for reasonable usage.
Same query format, slightly different response structure.
Used for address autocomplete in complaint submission form.
```

**Strategy 3 — BullMQ queue for any server-side geocoding (1 req/sec):**
```
geocode-queue: concurrency = 1, job delay = 1100ms
Cache results in PostgreSQL address_cache table (keyed by query string)
TTL: 7 days (addresses don't change)
Cache hit = 0 API calls, 0 rate limit impact
```

**Strategy 4 — Never bulk geocode:**
Only geocode on explicit user action (address search, pin drop). Never batch-geocode historical complaint records.

---

## Database Design Summary

### Extensions Required
```sql
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector
CREATE EXTENSION IF NOT EXISTS postgis;     -- PostGIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- UUID generation
```

### Core Tables (27 entities)

**Identity**
- `users` — id, email, password_hash, name, avatar_url, role, is_verified, is_active, org_id, dept_id
- `refresh_tokens` — id, token_hash, user_id, expires_at, used_at, device_info, ip_address
- `login_history` — id, user_id, ip_address, user_agent, status, created_at
- `sessions` — id, user_id, device_id, device_name, last_seen, is_active

**Organization**
- `organizations` — id, name, slug, settings (JSONB)
- `departments` — id, name, org_id, parent_dept_id, description
- `teams` — id, name, dept_id, manager_id
- `user_teams` — user_id, team_id, role, joined_at

**Tickets**
- `tickets` — id, ticket_number, title, description, category_id, dept_id, officer_id, priority (ENUM), status (ENUM), source (ENUM: web/whatsapp/email), user_id, location_geom (GEOMETRY POINT 4326), address, sla_deadline, ai_processed, created_at
- `ticket_comments` — id, ticket_id, author_id, content, is_internal, created_at
- `ticket_attachments` — id, ticket_id, uploader_id, cloudinary_url, file_type, file_name, file_size
- `ticket_timeline` — id, ticket_id, actor_id, action, from_status, to_status, metadata (JSONB), created_at

**Resolution**
- `resolutions` — id, ticket_id, officer_id, summary, work_performed, before_images, after_images, gps_location (GEOMETRY POINT), timestamp
- `resolution_verifications` — id, resolution_id, user_id, decision, rejection_reason, rating, feedback

**Config**
- `categories` — id, name, org_id, parent_category_id, default_priority, default_dept_id
- `sla_rules` — id, org_id, category_id, priority, response_hours, resolution_hours, escalation_hours
- `notifications` — id, user_id, type, title, body, metadata (JSONB), read_at, channel, created_at

**AI / Knowledge**
- `knowledge_base_articles` — id, org_id, title, content, type (FAQ/SOP/Policy), dept_id, embedding (vector(256)), created_at
- `embedding_cache` — id, content_hash, embedding (vector(256)), model, created_at
- `ai_logs` — id, feature, provider, input_tokens, output_tokens, latency_ms, success, ticket_id
- `idf_scores` — token, idf (FLOAT), computed_at

**Audit / Security**
- `audit_logs` — id, actor_id, action, resource, resource_id, metadata (JSONB), ip_address, created_at
- `security_events` — id, type, user_id, ip_address, metadata (JSONB), severity

**Communication**
- `whatsapp_sessions` — id, phone_number, user_id (nullable), conversation_state (JSONB), last_message_at
- `email_inbound` — id, from_email, from_name, subject, body, attachment_urls, processed_ticket_id
- `file_uploads` — id, uploader_id, cloudinary_public_id, url, resource_type, original_name, size, mime_type
- `officer_locations` — id, officer_id, location_geom (GEOMETRY POINT), recorded_at
- `address_cache` — query (PK), lat, lng, address (JSONB), cached_at

### Critical Indexes
```sql
-- Full-Text Search
CREATE INDEX idx_tickets_fts ON tickets
USING GIN (to_tsvector('english', title || ' ' || description));

-- Vector Search (IVFFlat, 256-dim)
CREATE INDEX idx_kb_embedding ON knowledge_base_articles
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 30);

-- PostGIS Spatial
CREATE INDEX idx_tickets_location ON tickets USING GIST (location_geom);
CREATE INDEX idx_officer_location ON officer_locations USING GIST (location_geom);

-- Standard B-Tree
CREATE INDEX idx_tickets_status ON tickets (status, dept_id, created_at DESC);
CREATE INDEX idx_tickets_user ON tickets (user_id, created_at DESC);
CREATE INDEX idx_tickets_officer ON tickets (officer_id, status);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);
```

---

## Milestone Roadmap

```
WEEK 1-2    M0: Foundation
WEEK 3-4    M1: Authentication & RBAC
WEEK 5-6    M2: Core Ticket System
WEEK 7-8    M3: GIS & Maps
WEEK 9-10   M4: Communication Channels & Notifications
WEEK 11-12  M5: File Management & Resolution Verification
WEEK 13-14  M6: Analytics & SLA
WEEK 15-18  M7: AI Layer & RAG Pipeline
WEEK 19-20  M8: Production Hardening & Deployment
```

---

## Phase Breakdown with Dependencies

---

### M0: Foundation (Week 1-2)
**No dependencies — pure setup**

**Goals:** Project scaffolding, local dev environment, DB schema, CI skeleton.

**Tasks:**
- [ ] Initialize monorepo: `backend/` and `frontend/` directories
- [ ] Backend: `npm init`, TypeScript config, ESLint, Prettier
- [ ] Frontend: Vite + React 19 + TypeScript + Tailwind + shadcn/ui init
- [ ] Docker Compose: PostgreSQL (with PostGIS + pgvector), Redis, backend, frontend
- [ ] Neon DB: create project, enable `vector` and `postgis` extensions
- [ ] Upstash Redis: create database, note connection string
- [ ] Prisma init: connect to Neon, write complete schema (all 27 entities)
- [ ] Run migrations, seed categories, default SLA rules, super admin user
- [ ] Pino logger setup, global error handler middleware
- [ ] Zod validation middleware wrapper
- [ ] Environment config: `dotenv`, `zod` schema for all env vars
- [ ] GitHub repo init, branch strategy (`main` → `develop` → feature branches)
- [ ] GitHub Actions: basic CI pipeline (lint + type-check on every push)
- [ ] `/health` endpoint on backend

**Deliverable:** `docker-compose up` runs all services locally. DB migrated. CI passes.

---

### M1: Authentication & RBAC (Week 3-4)
**Depends on: M0**

**Goals:** Full auth system, RBAC middleware, session management.

**Tasks:**

*Auth:*
- [ ] `POST /auth/register` — email + password, Argon2 hash, send verification email (Resend)
- [ ] `POST /auth/login` — compare Argon2 hash, issue JWT access token + refresh token
- [ ] `POST /auth/refresh-token` — **Lua script atomic rotation** (Hotspot 1 solution)
- [ ] `POST /auth/logout` — invalidate refresh token in Redis
- [ ] `POST /auth/verify-email` — verify email token, mark user as verified
- [ ] `POST /auth/forgot-password` — generate reset token, send via Resend
- [ ] `POST /auth/reset-password` — validate token, update password with Argon2
- [ ] Google OAuth: Passport.js strategy, `/auth/google` → `/auth/google/callback`
- [ ] Login history: log every login attempt (success/fail) to `login_history`
- [ ] Session management: `GET /auth/sessions`, `DELETE /auth/sessions/:id`

*RBAC:*
- [ ] Permission matrix: seed `roles` and `permissions` to DB
- [ ] `lru-cache` in-memory RBAC cache (max 1,000 entries, 5-min TTL) — **Hotspot 6 solution**
- [ ] RBAC middleware: JWT verify → role extract → cache lookup → DB fallback → ownership check → 403 or next
- [ ] Resource ownership validator utility

*Profile:*
- [ ] `GET /users/me`, `PATCH /users/me`

**Deliverable:** JWT-based auth with rotation, Google OAuth, RBAC gates on all routes.

---

### M2: Core Ticket System (Week 5-6)
**Depends on: M1**

**Goals:** Full ticket lifecycle via web, audit trail, basic admin APIs.

**Tasks:**

*Organization:*
- [ ] CRUD for organizations, departments (with parent hierarchy), teams
- [ ] Officer assignment to departments/teams
- [ ] `GET /departments/:id/officers` with workload stats

*Tickets:*
- [ ] `POST /tickets` — web submission, GPS location (PostGIS POINT), Zod validation
- [ ] `GET /tickets` — paginated, filterable (status, dept, priority, date range, source)
- [ ] `GET /tickets/:id` — full detail with timeline, comments
- [ ] Status workflow endpoints: assign, accept, in-progress, waiting, resolve, close, reopen, escalate
- [ ] Internal notes (`is_internal = true`, officer-only)
- [ ] Public comments (visible to complainant)
- [ ] Audit trail: middleware that writes to `ticket_timeline` on every status change
- [ ] SLA deadline computation on ticket creation (based on category + priority + SLA rules)

*Admin:*
- [ ] Categories CRUD (`/categories`)
- [ ] SLA Rules CRUD (`/sla-rules`)
- [ ] Users CRUD (admin: `/users`)
- [ ] Audit logs (`GET /audit-logs`, admin only)

**Deliverable:** Complete ticket lifecycle working end-to-end via web only.

---

### M3: GIS & Maps (Week 7-8)
**Depends on: M2 (tickets must exist to map)**

**Goals:** Location on ticket, map views, heatmap.

**Tasks:**

*Backend:*
- [ ] Store `location_geom` (PostGIS POINT 4326) on ticket creation
- [ ] `GET /gis/tickets` — return tickets with coordinates (bbox filter via PostGIS)
- [ ] `GET /gis/heatmap` — **H3 hex binning** (Hotspot 9 solution): aggregate complaints to H3 resolution-8 hexagons, return GeoJSON
- [ ] Materialized view `heatmap_h3` — refresh hourly via node-cron
- [ ] `POST /gis/geocode` — proxy to Photon API with `address_cache` lookup first (Hotspot 12 solution)
- [ ] `GET /gis/department-coverage` — PostGIS convex hull of dept ticket locations
- [ ] Officer location update: `POST /officers/location` (GPS from field)
- [ ] Nearby complaints: PostGIS `ST_DWithin` query

*Frontend:*
- [ ] React Leaflet map component with OpenStreetMap tiles
- [ ] Complaint submission: location picker (pin drop on map, address search via Photon)
- [ ] Citizen ticket view: show ticket location on map
- [ ] Officer map: all assigned complaints as markers
- [ ] Manager map: H3 hex heatmap rendered as GeoJSON layer (Hotspot 9 solution)
- [ ] Color scale: complaint density → color gradient
- [ ] Auto-refresh heatmap on pan/zoom (fetch new viewport bbox)
- [ ] Turf.js for distance calculations and point-in-polygon checks

**Deliverable:** Interactive maps with location filing, officer map, manager heatmap.

---

### M4: Communication Channels & Notifications (Week 9-10)
**Depends on: M2 (tickets), M3 (location)**

**Goals:** WhatsApp integration, Email inbound/outbound, real-time notifications.

**Tasks:**

*Socket.IO:*
- [ ] Socket.IO server setup with JWT auth on connection
- [ ] Room per user: `user:{userId}`
- [ ] Emit on ticket events: created, assigned, status changed, resolved, closed

*BullMQ Setup:*
- [ ] BullMQ worker file with Upstash Redis connection
- [ ] Queue definitions: `notifications`, `email`, `whatsapp`, `ai`, `ocr`, `cleanup`
- [ ] Custom exponential backoff on job failure
- [ ] Dead-letter logging to `notification_failures` table

*Notifications:*
- [ ] `notification_fan_out` job: idempotency key → 3 child jobs (Hotspot 10 solution)
- [ ] In-app job: Socket.IO emit to user room
- [ ] Email job: Resend SDK with daily counter + priority tier rate limiting
- [ ] WhatsApp job: Meta Cloud API send message
- [ ] `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

*WhatsApp:*
- [ ] Meta Cloud API setup (verify webhook token, signature validation)
- [ ] `POST /webhooks/whatsapp` — return 200 immediately, enqueue in BullMQ
- [ ] State machine (Hotspot 4 solution): IDLE → OTP → VERIFIED → CATEGORY → DETAILS → LOCATION → SUBMITTED
- [ ] Redis session: `whatsapp:session:{phone}` with 30-min TTL
- [ ] OTP login flow (generate OTP, send via WhatsApp, verify)
- [ ] Complaint submission via text + image flow
- [ ] Status tracking: user sends ticket number → get status

*Email Inbound:*
- [ ] `POST /webhooks/email` — Resend inbound webhook, return 200 immediately
- [ ] BullMQ job: parse with `mailparser` (Hotspot 7 solution)
- [ ] Auto-reply detection, thread extraction, latest reply isolation
- [ ] Create ticket from email with source = 'email'

*GitHub Actions Keep-Alive:*
- [ ] Add `keep-alive.yml` workflow pinging `/health` every 14 minutes (Hotspot 5 solution)

**Deliverable:** Real-time notifications, WhatsApp complaint filing, Email complaint filing.

---

### M5: File Management & Resolution Verification (Week 11-12)
**Depends on: M2 (tickets), M4 (BullMQ workers running)**

**Goals:** Secure file uploads, resolution proof submission, citizen accept/reject.

**Tasks:**

*File Management:*
- [ ] Multer middleware: file type validation (images, PDF, audio, video), size limit
- [ ] Sharp: compress images before upload (max 1200×1200, JPEG quality 70) — reduces Cloudinary credit usage
- [ ] Cloudinary SDK: upload compressed file, get secure URL
- [ ] `POST /files/upload` — returns Cloudinary URL + file record
- [ ] `DELETE /files/:id` — officer/admin only
- [ ] Associate files to tickets via `ticket_attachments`

*Resolution Verification:*
- [ ] `POST /tickets/:id/resolution` — officer submits: summary, work_performed, before_images, after_images, gps (optional)
- [ ] Status auto-transitions: Resolved → Pending User Verification
- [ ] `GET /tickets/:id/resolution` — citizen views proof
- [ ] `POST /tickets/:id/resolution/accept` — citizen accepts, status → Closed
- [ ] `POST /tickets/:id/resolution/reject` — citizen rejects, ticket → Reopened, officer notified
- [ ] `POST /tickets/:id/resolution/rating` — 1-5 stars + feedback

*Manager approval:*
- [ ] `POST /tickets/:id/resolution/approve` — manager approval for high-priority tickets

**Deliverable:** End-to-end resolution flow with file proof, citizen verification, rating.

---

### M6: Analytics & SLA Tracking (Week 13-14)
**Depends on: M5 (resolution data), M4 (notifications for SLA alerts)**

**Goals:** All dashboards, SLA monitoring, escalation.

**Tasks:**

*SLA Enforcement:*
- [ ] `sla-monitor` BullMQ job: runs every 30 minutes, checks `sla_deadline < now()` for open tickets
- [ ] Escalation logic: ticket status → Escalated, manager notified, `ticket_timeline` entry
- [ ] `GET /analytics/sla-violations` (manager)

*Analytics Endpoints:*
- [ ] Citizen: `GET /analytics/citizen` — active tickets count, history, satisfaction avg
- [ ] Officer: `GET /analytics/officer` — assigned tickets, avg resolution time, open count
- [ ] Manager: `GET /analytics/manager/sla` — SLA compliance %, breach count, by category
- [ ] Manager: `GET /analytics/manager/team-performance` — officers ranked by resolution time, volume
- [ ] Admin: `GET /analytics/admin/overview` — total users, departments, tickets by status, monthly trend
- [ ] Admin: `GET /analytics/admin/security` — failed logins, security events, by IP

*Dashboards (Frontend):*
- [ ] Citizen dashboard: active tickets list, complaint history, notification feed
- [ ] Officer dashboard: assigned queue, resolution time chart (Recharts), workload bar
- [ ] Manager dashboard: SLA donut chart, team performance table, heatmap link
- [ ] Admin dashboard: user growth line chart, ticket volume by category, security event log

**Deliverable:** All role-specific dashboards with live data.

---

### M7: AI Layer & RAG Pipeline (Week 15-18)
**Depends on: M2 (tickets), M5 (files for OCR), M4 (BullMQ for background AI jobs)**

**This is the longest phase. AI is optional at every step.**

**Goals:** AI provider abstraction, all AI features, full RAG pipeline, hybrid search.

#### M7a: AI & Embedding Provider Abstraction (Week 15)

- [ ] `AIProvider` interface: `{ generate(prompt): Promise<string>, isAvailable(): Promise<bool> }`
- [ ] `GeminiProvider`: direct fetch to `generativelanguage.googleapis.com` (no SDK)
- [ ] `GroqProvider`: direct fetch to `api.groq.com`
- [ ] `OllamaProvider`: fetch to `OLLAMA_BASE_URL/api/generate` — only registered if `OLLAMA_ENABLED=true` AND health check passes
- [ ] `NullProvider`: implements interface, returns empty string, `isAvailable()` always true
- [ ] `AIProviderFactory`: reads `AI_PROVIDER_ORDER` env var, health-checks each at startup, returns first available
- [ ] Ollama health check: `GET /api/tags` on startup → log warning if offline, skip registration
- [ ] `EmbeddingProvider` interface: `{ embed(text): Promise<number[]>, dimensions: number }`
- [ ] `GeminiEmbeddingProvider`: `text-embedding-004`, 256-dim output
- [ ] `OllamaEmbeddingProvider`: `nomic-embed-text` local
- [ ] `EmbeddingProviderFactory`: same pattern as AI provider
- [ ] Feature flag middleware: check `AI_ENABLED`, `RAG_ENABLED`, `OCR_ENABLED`, `VISION_ENABLED` per route

#### M7b: Hybrid Search Engine (Week 16)

- [ ] **FTS**: raw SQL using `tsvector` / `tsquery` with GIN index, via Prisma `$queryRaw`
- [ ] **TF-IDF**: `natural` tokenizer + lookup against `idf_scores` table, compute score in Node.js
- [ ] IDF recompute job: BullMQ weekly job, updates `idf_scores` table from current ticket corpus
- [ ] **Vector search**: IVFFlat cosine similarity raw SQL — only runs if embedding provider available (Hotspot 3 + 11 solutions)
- [ ] Permission-filtered vector query: `WHERE dept_id = $dept AND is_public = true` (Hotspot 11 solution)
- [ ] **RRF aggregator** (from scratch): merge ranked lists from 2 or 3 sources; zero-result source gets rank = max+1 (Hotspot 2 solution)
- [ ] All three search methods run in `Promise.all` — non-blocking parallel
- [ ] `GET /search/tickets` — hybrid search with filters

#### M7c: RAG Pipeline & Knowledge Base (Week 17)

- [ ] Knowledge base CRUD: `GET/POST/PATCH/DELETE /knowledge-base` (admin/manager only)
- [ ] On KB article save: generate embedding via `EmbeddingProviderFactory`, store in `embedding_cache` to avoid re-embedding unchanged content
- [ ] Query processor: lowercase, strip punctuation, expand abbreviations, `natural` tokenize
- [ ] Permission filter: map requesting user role → allowed `dept_id` set → inject into DB queries
- [ ] Context builder: select top-K chunks, truncate to token budget, format with source metadata
- [ ] Prompt builder: construct system prompt + context + user query per role type
- [ ] Response validator: check for empty, check for hallucination signals (future enhancement)
- [ ] Full pipeline: `POST /rag/query` — query → processor → filter → hybrid search → RRF → context → prompt → AI provider → validate → respond
- [ ] Graceful degradation: if all embeddings unavailable → skip vector search; if all LLMs fail → return raw search results without synthesis

#### M7d: AI Ticket Features & OCR/Whisper (Week 18)

*All AI features run as BullMQ jobs — never blocking HTTP request:*

- [ ] **Classification**: `POST /ai/classify` → Gemini prompt with complaint text → category + dept suggestion
- [ ] **Duplicate detection**: embed new ticket, pgvector similarity against existing tickets, threshold 0.92
- [ ] **Summarization**: long complaint → Gemini → 2-3 sentence summary for officer quick-view
- [ ] **Sentiment analysis**: complaint text → Gemini → `{sentiment: 'angry'|'neutral'|'distressed', score: 0-1}`
- [ ] **Auto-tagging**: keyword extraction via Gemini → store as `tags` array on ticket
- [ ] **Priority prediction**: sentiment + category + location → Gemini → suggested priority
- [ ] **Dept prediction**: classify into department (separate from category classification)
- [ ] **Reply suggestions**: officer asks for draft → last 3 messages + similar resolved → Gemini draft
- [ ] **Translation**: detect non-English, translate via Gemini if `TRANSLATION_ENABLED=true`
- [ ] **Resolution time prediction**: ticket features + department avg → Gemini estimate
- [ ] **Escalation recommendation**: SLA remaining + sentiment trend → flag if high risk
- [ ] **OCR** (`OCR_ENABLED=true`): Multer → Sharp compress → Tesseract.js → extracted text saved to ticket
- [ ] **Speech-to-Text** (WhatsApp voice): audio → ffmpeg compress → Whisper tiny → transcription
- [ ] BullMQ concurrency = 1 for OCR/Whisper queue (Hotspot 8 solution)
- [ ] All AI features write to `ai_logs` table for admin monitoring
- [ ] `GET /ai/health` — returns current active provider chain status
- [ ] `GET/PATCH /ai/settings` — admin enable/disable features, reorder providers

*Role-specific RAG Assistants:*
- [ ] User Assistant: `POST /rag/query?role=user` — FAQs, filing guidance, own ticket status
- [ ] Officer Assistant: `POST /rag/query?role=officer` — similar cases, SOP search, draft replies
- [ ] Manager Assistant: `POST /rag/query?role=manager` — SLA insights, team performance summary
- [ ] Admin Assistant: `POST /rag/query?role=admin` — audit log search, system analytics

**Deliverable:** Full AI layer with provider fallback chain, hybrid search, RAG pipeline, all AI ticket features.

---

### M8: Production Hardening & Deployment (Week 19-20)
**Depends on: All previous milestones**

**Goals:** Docker, CI/CD, security audit, performance tuning, Vercel + Render deployment.

**Tasks:**

*Docker:*
- [ ] `backend/Dockerfile`: multi-stage build (build → production), non-root user, health check
- [ ] `frontend/Dockerfile`: Vite build → Nginx static serve
- [ ] `docker-compose.yml`: orchestrate backend + frontend + postgres (dev only, prod uses Neon) + redis (dev only, prod uses Upstash)
- [ ] `.dockerignore` for both

*CI/CD (GitHub Actions):*
- [ ] `ci.yml`: on every push → lint + type-check + unit tests (Vitest) + integration tests (Supertest)
- [ ] `deploy.yml`: on merge to `main` → build Docker image → deploy to Render (backend) + Vercel (frontend)
- [ ] `keep-alive.yml`: every 14 minutes → ping Render `/health` (already added in M4)
- [ ] Cache npm dependencies and Docker layers to stay within 2,000 min/month budget
- [ ] E2E tests (Playwright) on `main` branch only

*Security Audit:*
- [ ] Helmet headers audit: CSP, HSTS, X-Frame-Options
- [ ] CORS: whitelist only Vercel frontend domain
- [ ] Rate limiting: `/auth/*` routes 10 req/min, general API 100 req/min
- [ ] File upload: validate MIME type server-side (not just extension), max file size 10MB
- [ ] SQL injection: Prisma parameterized queries audit, raw SQL `$queryRaw` param audit
- [ ] JWT: short-lived access tokens (15 min), refresh token = 7 days

*Performance:*
- [ ] Explain-analyze all critical queries: ticket list, FTS search, vector search, heatmap
- [ ] Add missing indexes discovered during profiling
- [ ] TanStack Query stale-while-revalidate for dashboard data
- [ ] Gzip compression on backend responses (Express `compression` middleware)

*Resilience Testing:*
- [ ] Test with `AI_ENABLED=false`: verify all flows work manually
- [ ] Test with Upstash Redis down: RBAC falls back to DB, tokens fail gracefully with clear error
- [ ] Test Render cold start: confirm GitHub Actions keep-alive is working
- [ ] Test Neon near storage limit: cleanup job fires, indexes remain functional

*Deployment:*
- [ ] Vercel: connect GitHub repo, set env vars, deploy frontend
- [ ] Render: connect GitHub repo, set env vars, deploy backend
- [ ] Neon: production DB with final migrations applied
- [ ] Upstash: production Redis instance
- [ ] Cloudinary: production account with upload preset
- [ ] Resend: production domain verification
- [ ] Meta WhatsApp Cloud API: production phone number, webhook verified
- [ ] Google OAuth: production client ID + secret, authorized redirect URIs

*API Documentation:*
- [ ] Swagger/OpenAPI spec for all endpoints
- [ ] Postman collection export

**Deliverable:** Fully deployed production system at $0/month.

---

## Free Tier Budget Allocation

### Redis Commands (10,000/day)
| Usage | Commands/Day | Notes |
|-------|-------------|-------|
| Token refresh + rotation | 800 | ~100 users × 8 cmds |
| WhatsApp session state | 500 | ~10 active sessions |
| BullMQ (500 jobs/day) | 4,500 | 9 cmds per job |
| In-memory RBAC (lru-cache) | 0 | Moved to Node.js — saves ~3,000/day |
| Session/socket tracking | 1,000 | 50 concurrent users |
| Notification idempotency | 300 | Dedup keys, 24h TTL |
| Search result caching | 1,000 | 500 queries |
| Reserve / headroom | 900 | ~9% buffer |
| **TOTAL** | **9,000** | Within budget |

### Neon Storage (0.5GB)
| Object | Estimated Size |
|--------|---------------|
| Core tables (10K tickets) | ~50 MB |
| IVFFlat index 256-dim (10K vectors) | ~7 MB |
| PostGIS GIST indexes | ~5 MB |
| FTS GIN indexes | ~12 MB |
| Audit/notification tables (90-day retention) | ~30 MB |
| Heatmap materialized view | ~5 MB |
| **Total** | **~109 MB** — well within 500 MB |

### Resend Emails (100/day hard cap)
| Type | Priority | Volume/Day |
|------|----------|-----------|
| Email verification / password reset | Critical — always send | ~5 |
| Ticket assigned / status changed | High | ~30 |
| Resolution submitted | High | ~15 |
| Weekly digest / low-priority | Low — delay if near cap | ~20 |
| **Reserve for peaks** | | ~30 |

### GitHub Actions Minutes (2,000/month)
| Workflow | Est. Minutes | Frequency |
|----------|-------------|-----------|
| CI (lint + tests) | 3 min | ~30 pushes/month = 90 min |
| Keep-alive ping | 0.1 min | 3,024 runs/month = 302 min |
| Deploy to Render/Vercel | 5 min | ~10 deploys/month = 50 min |
| E2E tests (Playwright) | 10 min | ~5 main merges/month = 50 min |
| **Total** | **~492 min** | Well within 2,000 min |

---

## Folder Structure

```
nivaransetu/
├── backend/
│   ├── src/
│   │   ├── config/              # env validation, constants
│   │   ├── modules/
│   │   │   ├── auth/            # registration, login, OAuth, token rotation
│   │   │   ├── users/           # profile, user management
│   │   │   ├── organization/    # org, department, team
│   │   │   ├── tickets/         # core ticket CRUD + workflow
│   │   │   ├── resolution/      # resolution submission + verification
│   │   │   ├── notifications/   # fan-out, Socket.IO, email, WhatsApp
│   │   │   ├── gis/             # PostGIS queries, H3 heatmap, geocode
│   │   │   ├── analytics/       # role-based dashboard queries
│   │   │   ├── files/           # Multer, Sharp, Cloudinary
│   │   │   ├── webhooks/        # WhatsApp, Email inbound
│   │   │   └── admin/           # categories, SLA rules, audit logs
│   │   ├── ai/
│   │   │   ├── providers/       # GeminiProvider, GroqProvider, OllamaProvider, NullProvider
│   │   │   ├── embeddings/      # GeminiEmbedding, OllamaEmbedding, factory
│   │   │   ├── features/        # classify, summarize, sentiment, OCR, Whisper ...
│   │   │   └── health.ts        # Ollama health check on startup
│   │   ├── rag/
│   │   │   ├── pipeline.ts      # full orchestration (query → response)
│   │   │   ├── queryProcessor.ts
│   │   │   ├── permissionFilter.ts
│   │   │   ├── hybridSearch.ts  # FTS + TF-IDF + pgvector in Promise.all
│   │   │   ├── rrf.ts           # Reciprocal Rank Fusion from scratch
│   │   │   ├── contextBuilder.ts
│   │   │   ├── promptBuilder.ts
│   │   │   └── responseValidator.ts
│   │   ├── search/
│   │   │   ├── fts.ts           # tsvector/tsquery raw SQL
│   │   │   ├── tfidf.ts         # natural tokenizer + idf_scores lookup
│   │   │   └── vector.ts        # IVFFlat cosine similarity raw SQL
│   │   ├── jobs/                # BullMQ worker definitions per queue
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verification
│   │   │   ├── rbac.ts          # RBAC pipeline (uses lru-cache)
│   │   │   ├── validate.ts      # Zod request validation
│   │   │   └── rateLimit.ts     # express-rate-limit configs
│   │   ├── lib/
│   │   │   ├── prisma.ts        # Prisma client singleton
│   │   │   ├── redis.ts         # Upstash Redis client
│   │   │   ├── socket.ts        # Socket.IO instance
│   │   │   ├── cloudinary.ts    # Cloudinary config
│   │   │   └── resend.ts        # Resend client
│   │   ├── utils/               # shared helpers
│   │   └── app.ts               # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma        # complete schema (all 27 entities)
│   │   └── migrations/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register, OAuth callback
│   │   │   ├── citizen/         # Submit complaint, track tickets, map view
│   │   │   ├── officer/         # Ticket queue, assigned map, resolution submit
│   │   │   ├── manager/         # Dashboard, heatmap, SLA view
│   │   │   └── admin/           # Users, departments, AI settings, audit logs
│   │   ├── components/
│   │   │   ├── maps/            # LeafletMap, HeatmapLayer, LocationPicker
│   │   │   ├── tickets/         # TicketCard, Timeline, CommentSection
│   │   │   ├── charts/          # SLADonut, VolumeBar, PerformanceLine
│   │   │   └── ui/              # shadcn/ui re-exports + custom components
│   │   ├── hooks/               # useAuth, useTickets, useMap, useNotifications
│   │   ├── api/                 # Axios instance + TanStack Query hooks per domain
│   │   ├── store/               # Auth state (Zustand or Context)
│   │   └── lib/                 # Zod schemas, constants, utils
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── keep-alive.yml       # Hotspot 5 solution
│
├── docker-compose.yml
└── PROJECT_PLAN.md              # this file
```

---

## Implementation Order Summary

```
M0  Foundation           → DB schema, Docker, CI skeleton
 ↓
M1  Auth & RBAC          → JWT, rotation, Google OAuth, permissions
 ↓
M2  Core Tickets         → Ticket lifecycle, audit trail, SLA setup
 ↓
M3  GIS & Maps           → Location filing, H3 heatmap, geocoding
 ↓
M4  Channels & Notifs    → WhatsApp, Email inbound, Socket.IO, BullMQ
 ↓
M5  Files & Resolution   → Upload, compress, Cloudinary, proof flow
 ↓
M6  Analytics & SLA      → Dashboards, SLA monitoring, escalation
 ↓
M7  AI Layer             → Providers → Search → RAG → Features → OCR
 ↓
M8  Production           → Docker, CI/CD, security, deploy
```

Every milestone is independently deployable and testable. AI (M7) is the only milestone where the preceding platform must be complete — everything else is built layer by layer.

---

*Total estimated build time: 20 weeks (solo developer) | Cost: $0/month*

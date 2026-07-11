# NivaranSetu — Complete Project Structure
## Config-Driven, Scalable, Low Code-Change Architecture

**Core Philosophy:** Change config, not code.
- New ticket status → update `config/statuses.ts`
- New role/permission → update `config/permissions.ts`
- New AI provider → register in `config/providers.ts` + implement interface
- New notification channel → add to `config/notifications.ts`
- New dashboard widget → add to `config/dashboards.ts`
- New complaint category → add to `config/categories.ts`
- New department → DB entry + `config/departments.ts` (auto-reflected everywhere)
- New BullMQ queue → add to `config/queues.ts` (auto-registered on startup)
- New API module → drop folder in `modules/` (auto-discovered and registered)

---

## Root
```
nivaransetu/
├── backend/
├── frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint + type-check + unit + integration tests
│       ├── deploy.yml                # deploy to Render (backend) + Vercel (frontend)
│       └── keep-alive.yml            # ping Render /health every 14 min (Hotspot 5)
├── docker-compose.yml                # local dev: postgres + redis + backend + frontend
├── docker-compose.prod.yml           # production references (Neon, Upstash, Cloudinary)
├── PROJECT_PLAN.md
└── PROJECT_STRUCTURE.md              # this file
```

---

## Backend
```
backend/
├── src/
│   │
│   ├── config/                       # ← THE BRAIN. Change here, not in code.
│   │   ├── index.ts                  # re-exports all configs, validates all at startup
│   │   ├── env.ts                    # Zod schema for ALL env vars — app won't start if invalid
│   │   │
│   │   ├── statuses.ts               # ★ Ticket status state machine (transitions as config)
│   │   │   # export const STATUS_MACHINE = {
│   │   │   #   draft:      { label: 'Draft',      transitions: ['submitted'] },
│   │   │   #   submitted:  { label: 'Submitted',  transitions: ['ai_processing','assigned'] },
│   │   │   #   assigned:   { label: 'Assigned',   transitions: ['accepted','reassigned'] },
│   │   │   #   in_progress:{ label: 'In Progress',transitions: ['waiting','resolved','escalated'] },
│   │   │   #   resolved:   { label: 'Resolved',   transitions: ['pending_verification'] },
│   │   │   #   closed:     { label: 'Closed',     transitions: ['reopened'] },
│   │   │   # }
│   │   │   # Adding new status = add one object here. Middleware reads this at runtime.
│   │   │
│   │   ├── permissions.ts            # ★ Role → Permission matrix (RBAC source of truth)
│   │   │   # export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
│   │   │   #   citizen:  ['create_ticket', 'view_own_tickets', 'comment', 'rate_resolution'],
│   │   │   #   officer:  ['...citizen', 'assign_ticket', 'add_internal_note', 'resolve_ticket'],
│   │   │   #   manager:  ['...officer', 'approve_resolution', 'view_analytics', 'manage_sla'],
│   │   │   #   admin:    ['...manager', 'manage_users', 'manage_departments', 'configure_ai'],
│   │   │   #   super:    ['*'],
│   │   │   # }
│   │   │   # Adding new permission = add string here + use in route decorator. Done.
│   │   │
│   │   ├── roles.ts                  # Role definitions, labels, hierarchy order
│   │   │
│   │   ├── categories.ts             # ★ Complaint categories + default routing rules
│   │   │   # export const CATEGORIES = [
│   │   │   #   {
│   │   │   #     id: 'water_supply', label: 'Water Supply',
│   │   │   #     defaultDeptSlug: 'water-dept',
│   │   │   #     defaultPriority: 'medium',
│   │   │   #     slaHours: { response: 4, resolution: 72 },
│   │   │   #     subcategories: ['no_water', 'dirty_water', 'pipe_burst'],
│   │   │   #     formFields: ['location', 'description', 'image'],    # drives frontend form
│   │   │   #   },
│   │   │   # ]
│   │   │   # New category = new object. Frontend form, backend routing, SLA all auto-update.
│   │   │
│   │   ├── providers.ts              # ★ AI provider registry & feature flags
│   │   │   # export const AI_CONFIG = {
│   │   │   #   providerOrder: ['gemini', 'groq', 'ollama', 'null'],   // from env, overridable
│   │   │   #   embeddingOrder: ['gemini', 'ollama'],
│   │   │   #   features: {
│   │   │   #     classify:       { enabled: true,  provider: 'auto' },
│   │   │   #     summarize:      { enabled: true,  provider: 'auto' },
│   │   │   #     ocr:            { enabled: true,  provider: 'tesseract' },
│   │   │   #     speechToText:   { enabled: true,  provider: 'whisper' },
│   │   │   #     vision:         { enabled: false, provider: 'gemini' },
│   │   │   #     translation:    { enabled: true,  provider: 'auto' },
│   │   │   #     ragSearch:      { enabled: true,  provider: 'auto' },
│   │   │   #   },
│   │   │   #   models: {
│   │   │   #     gemini: 'gemini-2.0-flash',
│   │   │   #     groq:   'llama-3.3-70b-versatile',
│   │   │   #     ollama: 'llama3',
│   │   │   #   },
│   │   │   # }
│   │   │   # Toggle a feature = flip `enabled`. New provider = add to order + implement interface.
│   │   │
│   │   ├── queues.ts                 # ★ BullMQ queue registry (auto-registered on startup)
│   │   │   # export const QUEUE_REGISTRY = {
│   │   │   #   notifications: { concurrency: 5,  retries: 3, backoff: 'exponential', delay: 2000 },
│   │   │   #   email:         { concurrency: 2,  retries: 3, backoff: 'exponential', delay: 5000 },
│   │   │   #   whatsapp:      { concurrency: 2,  retries: 3, backoff: 'fixed',       delay: 3000 },
│   │   │   #   ai:            { concurrency: 3,  retries: 2, backoff: 'exponential', delay: 1000 },
│   │   │   #   ocr:           { concurrency: 1,  retries: 1, backoff: 'fixed',       delay: 0    },
│   │   │   #   whisper:       { concurrency: 1,  retries: 1, backoff: 'fixed',       delay: 0    },
│   │   │   #   geocode:       { concurrency: 1,  retries: 2, backoff: 'fixed',       delay: 1100 },
│   │   │   #   cleanup:       { concurrency: 1,  retries: 1, backoff: 'fixed',       delay: 0    },
│   │   │   #   idfRecompute:  { concurrency: 1,  retries: 1, backoff: 'fixed',       delay: 0    },
│   │   │   # }
│   │   │   # New queue = new entry here. JobManager reads registry and creates all queues.
│   │   │
│   │   ├── notifications.ts          # ★ Event → Channel mapping (fan-out config)
│   │   │   # export const NOTIFICATION_MAP: Record<TicketEvent, NotificationChannel[]> = {
│   │   │   #   ticket_created:          ['in_app'],
│   │   │   #   ticket_assigned:         ['in_app', 'email', 'whatsapp'],
│   │   │   #   status_changed:          ['in_app', 'email'],
│   │   │   #   resolution_submitted:    ['in_app', 'email', 'whatsapp'],
│   │   │   #   resolution_accepted:     ['in_app', 'email'],
│   │   │   #   ticket_closed:           ['in_app', 'email'],
│   │   │   #   sla_breach:              ['in_app', 'email', 'whatsapp'],
│   │   │   #   security_alert:          ['in_app', 'email'],
│   │   │   # }
│   │   │   # New event = add one line. Fan-out logic reads this map, no code change.
│   │   │   # New channel (e.g. SMS) = implement channel interface + add to channel key.
│   │   │
│   │   ├── sla.ts                    # Default SLA rules (overridden per org in DB)
│   │   │   # export const SLA_DEFAULTS = {
│   │   │   #   critical: { responseHours: 1,  resolutionHours: 24,  escalationHours: 12 },
│   │   │   #   high:     { responseHours: 4,  resolutionHours: 48,  escalationHours: 24 },
│   │   │   #   medium:   { responseHours: 8,  resolutionHours: 72,  escalationHours: 48 },
│   │   │   #   low:      { responseHours: 24, resolutionHours: 168, escalationHours: 96 },
│   │   │   # }
│   │   │
│   │   ├── rateLimit.ts              # Rate limit rules per route group
│   │   │   # export const RATE_LIMITS = {
│   │   │   #   auth:    { windowMs: 60_000, max: 10  },
│   │   │   #   api:     { windowMs: 60_000, max: 100 },
│   │   │   #   upload:  { windowMs: 60_000, max: 20  },
│   │   │   #   webhook: { windowMs: 60_000, max: 200 },
│   │   │   # }
│   │   │
│   │   └── cron.ts                   # Scheduled job definitions
│   │       # export const CRON_JOBS = [
│   │       #   { name: 'sla-monitor',    schedule: '*/30 * * * *', queue: 'ai',      job: 'slaMonitor'    },
│   │       #   { name: 'idf-recompute',  schedule: '0 2 * * 0',   queue: 'idfRecompute', job: 'recompute' },
│   │       #   { name: 'cleanup',        schedule: '0 3 * * *',   queue: 'cleanup',  job: 'pruneOldData'  },
│   │       #   { name: 'h3-refresh',     schedule: '0 * * * *',   queue: 'cleanup',  job: 'refreshH3View' },
│   │       # ]
│   │       # New cron job = add one object. Scheduler reads array and registers all.
│   │
│   ├── modules/                      # ★ Self-contained feature modules (auto-discovered)
│   │   │                             # Each module exports router.ts → auto-registered in app.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.router.ts        # Express router — auto-registered at /api/auth
│   │   │   ├── auth.controller.ts    # Request/response handling only
│   │   │   ├── auth.service.ts       # Business logic (JWT, Argon2, token rotation)
│   │   │   ├── auth.repository.ts    # DB access (Prisma queries)
│   │   │   ├── auth.types.ts         # TypeScript interfaces
│   │   │   ├── auth.validation.ts    # Zod schemas for request bodies
│   │   │   └── auth.events.ts        # Events emitted: 'user.registered', 'user.login', etc.
│   │   │
│   │   ├── users/
│   │   │   ├── users.router.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.types.ts
│   │   │   └── users.validation.ts
│   │   │
│   │   ├── organization/
│   │   │   ├── organization.router.ts
│   │   │   ├── organization.controller.ts
│   │   │   ├── organization.service.ts
│   │   │   ├── organization.repository.ts
│   │   │   ├── organization.types.ts
│   │   │   └── organization.validation.ts
│   │   │
│   │   ├── tickets/
│   │   │   ├── tickets.router.ts
│   │   │   ├── tickets.controller.ts
│   │   │   ├── tickets.service.ts       # reads STATUS_MACHINE from config for transitions
│   │   │   ├── tickets.repository.ts
│   │   │   ├── tickets.types.ts
│   │   │   ├── tickets.validation.ts
│   │   │   ├── tickets.events.ts        # emits: 'ticket.created', 'ticket.assigned', etc.
│   │   │   └── tickets.sla.ts           # SLA deadline computation (reads config/sla.ts)
│   │   │
│   │   ├── resolution/
│   │   │   ├── resolution.router.ts
│   │   │   ├── resolution.controller.ts
│   │   │   ├── resolution.service.ts
│   │   │   ├── resolution.repository.ts
│   │   │   ├── resolution.types.ts
│   │   │   └── resolution.validation.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.router.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts  # reads NOTIFICATION_MAP from config for fan-out
│   │   │   ├── notifications.repository.ts
│   │   │   ├── notifications.types.ts
│   │   │   └── channels/                 # ★ Channel registry (add channel = add folder)
│   │   │       ├── channel.interface.ts  # INotificationChannel interface
│   │   │       ├── inApp.channel.ts      # Socket.IO implementation
│   │   │       ├── email.channel.ts      # Resend implementation
│   │   │       ├── whatsapp.channel.ts   # Meta Cloud API implementation
│   │   │       └── channel.registry.ts   # Map<channelKey, INotificationChannel>
│   │   │                                 # New channel = new file + one line in registry
│   │   │
│   │   ├── gis/
│   │   │   ├── gis.router.ts
│   │   │   ├── gis.controller.ts
│   │   │   ├── gis.service.ts
│   │   │   ├── gis.repository.ts        # PostGIS raw SQL queries
│   │   │   ├── gis.types.ts
│   │   │   └── h3.ts                    # H3 hex binning logic (Hotspot 9 solution)
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.router.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.repository.ts  # complex read queries (CQRS-lite)
│   │   │   └── analytics.types.ts
│   │   │
│   │   ├── files/
│   │   │   ├── files.router.ts
│   │   │   ├── files.controller.ts
│   │   │   ├── files.service.ts         # Multer → Sharp → Cloudinary pipeline
│   │   │   ├── files.repository.ts
│   │   │   └── files.types.ts
│   │   │
│   │   ├── search/
│   │   │   ├── search.router.ts
│   │   │   ├── search.controller.ts
│   │   │   ├── search.service.ts        # orchestrates FTS + TF-IDF + vector in Promise.all
│   │   │   ├── search.types.ts
│   │   │   └── strategies/              # ★ Strategy registry (add strategy = add file)
│   │   │       ├── search.strategy.interface.ts  # ISearchStrategy: search(query) → RankedResult[]
│   │   │       ├── fts.strategy.ts               # PostgreSQL tsvector/tsquery
│   │   │       ├── tfidf.strategy.ts             # natural tokenizer + idf_scores table
│   │   │       ├── vector.strategy.ts            # pgvector IVFFlat cosine similarity
│   │   │       └── strategy.registry.ts          # Map<strategyKey, ISearchStrategy>
│   │   │                                         # New search strategy = new file + one line
│   │   │
│   │   ├── webhooks/
│   │   │   ├── webhooks.router.ts
│   │   │   ├── whatsapp.webhook.ts      # Meta signature validation + enqueue
│   │   │   └── email.webhook.ts         # Resend inbound + enqueue
│   │   │
│   │   └── admin/
│   │       ├── admin.router.ts
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts
│   │       ├── admin.repository.ts
│   │       └── admin.validation.ts
│   │
│   ├── ai/
│   │   ├── providers/                   # ★ Provider registry (add provider = add file + config entry)
│   │   │   ├── provider.interface.ts    # IAIProvider: { generate, isAvailable, name }
│   │   │   ├── gemini.provider.ts       # Direct fetch to generativelanguage.googleapis.com
│   │   │   ├── groq.provider.ts         # Direct fetch to api.groq.com
│   │   │   ├── ollama.provider.ts       # Fetch to OLLAMA_BASE_URL (health-checked on startup)
│   │   │   ├── null.provider.ts         # Null Object Pattern — always available, no-op
│   │   │   ├── provider.factory.ts      # Reads providerOrder from config, returns first healthy
│   │   │   └── provider.registry.ts     # Map<providerName, IAIProvider> — new provider = one line
│   │   │
│   │   ├── embeddings/                  # ★ Same pattern as providers
│   │   │   ├── embedding.interface.ts   # IEmbeddingProvider: { embed, dimensions, isAvailable }
│   │   │   ├── gemini.embedding.ts
│   │   │   ├── ollama.embedding.ts
│   │   │   ├── embedding.factory.ts     # Returns first available from embeddingOrder config
│   │   │   └── embedding.registry.ts
│   │   │
│   │   ├── features/                    # ★ Each AI feature is isolated (add feature = add file)
│   │   │   ├── feature.interface.ts     # IAIFeature: { run(input), featureKey }
│   │   │   ├── classify.feature.ts      # reads providers.features.classify config
│   │   │   ├── summarize.feature.ts
│   │   │   ├── sentiment.feature.ts
│   │   │   ├── autoTag.feature.ts
│   │   │   ├── priorityPredict.feature.ts
│   │   │   ├── deptPredict.feature.ts
│   │   │   ├── duplicateDetect.feature.ts
│   │   │   ├── replyDraft.feature.ts
│   │   │   ├── translate.feature.ts
│   │   │   ├── resolutionTimePredict.feature.ts
│   │   │   ├── escalationRecommend.feature.ts
│   │   │   ├── ocr.feature.ts           # Tesseract.js (independent of LLM provider)
│   │   │   ├── speechToText.feature.ts  # Whisper tiny (independent of LLM provider)
│   │   │   ├── vision.feature.ts        # Image analysis via Gemini vision
│   │   │   └── feature.registry.ts      # Map<featureKey, IAIFeature> — one line per feature
│   │   │
│   │   └── health.ts                    # Ollama health check on startup (Hotspot 5 solution)
│   │
│   ├── rag/                             # Custom RAG pipeline (no LangChain)
│   │   ├── pipeline.ts                  # Orchestrator: calls each step in sequence
│   │   ├── queryProcessor.ts            # Tokenize, clean, expand (natural library)
│   │   ├── permissionFilter.ts          # Role → allowed dept_ids (reads permissions config)
│   │   ├── contextBuilder.ts            # Top-K chunk selector, token budget trimmer
│   │   ├── promptBuilder.ts             # System prompt per role (reads role from config)
│   │   ├── rrf.ts                       # Reciprocal Rank Fusion from scratch (Hotspot 2)
│   │   └── responseValidator.ts         # Basic output validation
│   │
│   ├── jobs/
│   │   ├── jobManager.ts                # ★ Reads QUEUE_REGISTRY config, creates all BullMQ queues
│   │   │                                # and workers automatically. New queue = config entry only.
│   │   ├── workers/                     # BullMQ Worker instances (one per queue)
│   │   │   ├── notifications.worker.ts
│   │   │   ├── email.worker.ts
│   │   │   ├── whatsapp.worker.ts
│   │   │   ├── ai.worker.ts
│   │   │   ├── ocr.worker.ts
│   │   │   ├── whisper.worker.ts
│   │   │   ├── geocode.worker.ts
│   │   │   └── cleanup.worker.ts
│   │   │
│   │   ├── processors/                  # Job handler functions (pure logic, no BullMQ coupling)
│   │   │   ├── notificationFanOut.processor.ts  # reads NOTIFICATION_MAP, dispatches to channels
│   │   │   ├── sendEmail.processor.ts
│   │   │   ├── sendWhatsApp.processor.ts
│   │   │   ├── aiAnalysis.processor.ts
│   │   │   ├── ocrProcess.processor.ts
│   │   │   ├── whisperProcess.processor.ts
│   │   │   ├── geocodeAddress.processor.ts
│   │   │   ├── slaMonitor.processor.ts
│   │   │   ├── idfRecompute.processor.ts
│   │   │   ├── pruneOldData.processor.ts
│   │   │   └── refreshH3View.processor.ts
│   │   │
│   │   └── scheduler.ts                 # Reads CRON_JOBS config, registers all cron schedules
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts           # JWT verification
│   │   ├── rbac.middleware.ts           # Reads PERMISSION_MATRIX config (Hotspot 6 — lru-cache)
│   │   ├── validate.middleware.ts       # Zod schema validation wrapper
│   │   ├── rateLimit.middleware.ts      # Reads RATE_LIMITS config, applies per route group
│   │   ├── ownership.middleware.ts      # Resource ownership checks
│   │   ├── audit.middleware.ts          # Auto-writes ticket_timeline on status changes
│   │   └── errorHandler.middleware.ts   # Global error handler (structured Pino logging)
│   │
│   ├── lib/                             # Infrastructure singletons
│   │   ├── prisma.ts                    # Prisma client singleton
│   │   ├── redis.ts                     # Upstash Redis client singleton
│   │   ├── socket.ts                    # Socket.IO instance + room management
│   │   ├── cloudinary.ts                # Cloudinary SDK config
│   │   ├── resend.ts                    # Resend SDK client
│   │   ├── bullmq.ts                    # BullMQ Queue/Worker factory helpers
│   │   └── eventBus.ts                  # In-process EventEmitter (ticket events → notification fan-out)
│   │
│   ├── utils/
│   │   ├── jwt.ts                       # signAccessToken, signRefreshToken, verifyToken
│   │   ├── tokenRotation.ts             # Redis Lua script for atomic rotation (Hotspot 1)
│   │   ├── slugify.ts
│   │   ├── pagination.ts                # Standard paginated response builder
│   │   ├── apiResponse.ts               # Standard success/error response shape
│   │   └── logger.ts                    # Pino logger instance
│   │
│   ├── types/
│   │   ├── express.d.ts                 # Augment req with user, role, permissions
│   │   └── global.d.ts                  # Global type augmentations
│   │
│   ├── app.ts                           # ★ Auto-discovers modules/, registers all routers
│   │                                    # Reads modules/ directory, imports each *.router.ts
│   │                                    # New module = drop folder in modules/. Done.
│   └── server.ts                        # HTTP server, Socket.IO, startup sequence
│
├── prisma/
│   ├── schema.prisma                    # Complete schema (all 27 entities)
│   └── migrations/                      # Auto-generated migration files
│       └── seed.ts                      # Seeds: default org, super admin, categories, SLA rules
│
├── tests/
│   ├── unit/                            # Vitest unit tests (co-located with modules)
│   ├── integration/                     # Supertest API tests
│   └── e2e/                             # Playwright E2E (run on main branch only)
│
├── Dockerfile                           # Multi-stage: build → production (non-root user)
├── .dockerignore
├── .env.example                         # All env vars with descriptions
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

---

## Frontend
```
frontend/
├── src/
│   │
│   ├── config/                          # ← FRONTEND CONFIG BRAIN
│   │   │
│   │   ├── navigation.ts                # ★ Role → Nav items (auto-renders sidebar)
│   │   │   # export const NAV_CONFIG: Record<Role, NavItem[]> = {
│   │   │   #   citizen: [
│   │   │   #     { label: 'My Tickets',  path: '/tickets',   icon: 'ticket'    },
│   │   │   #     { label: 'New Complaint', path: '/submit',  icon: 'plus'      },
│   │   │   #     { label: 'Map View',    path: '/map',       icon: 'map'       },
│   │   │   #   ],
│   │   │   #   officer: [ ...citizen, { label: 'My Queue', path: '/queue', icon: 'inbox' } ],
│   │   │   #   manager: [ ...officer, { label: 'Analytics', path: '/analytics', icon: 'chart' } ],
│   │   │   # }
│   │   │   # New nav item = add one object. Sidebar renders automatically.
│   │   │
│   │   ├── dashboards.ts                # ★ Role → Dashboard widget list
│   │   │   # export const DASHBOARD_CONFIG: Record<Role, Widget[]> = {
│   │   │   #   citizen: [
│   │   │   #     { id: 'active_tickets', component: 'ActiveTicketsCard', span: 1 },
│   │   │   #     { id: 'ticket_history', component: 'TicketHistoryTable', span: 2 },
│   │   │   #     { id: 'notification_feed', component: 'NotificationFeed', span: 1 },
│   │   │   #   ],
│   │   │   #   officer: [
│   │   │   #     { id: 'assigned_queue', component: 'TicketQueue', span: 2 },
│   │   │   #     { id: 'resolution_time', component: 'ResolutionTimeChart', span: 1 },
│   │   │   #     { id: 'workload_bar', component: 'WorkloadBar', span: 1 },
│   │   │   #   ],
│   │   │   #   manager: [
│   │   │   #     { id: 'sla_donut', component: 'SLADonutChart', span: 1 },
│   │   │   #     { id: 'heatmap_link', component: 'HeatmapPreview', span: 2 },
│   │   │   #   ],
│   │   │   # }
│   │   │   # New widget = add component + add to config. Dashboard renders automatically.
│   │   │
│   │   ├── forms.ts                     # ★ Category → dynamic complaint form fields
│   │   │   # export const FORM_CONFIG: Record<CategoryId, FormField[]> = {
│   │   │   #   water_supply: [
│   │   │   #     { name: 'description', type: 'textarea', required: true, label: 'Describe issue' },
│   │   │   #     { name: 'location',    type: 'map_picker', required: true },
│   │   │   #     { name: 'image',       type: 'file', accept: 'image/*', required: false },
│   │   │   #   ],
│   │   │   #   road_damage: [
│   │   │   #     { name: 'description', type: 'textarea', required: true },
│   │   │   #     { name: 'location',    type: 'map_picker', required: true },
│   │   │   #     { name: 'image',       type: 'file', accept: 'image/*', required: true },
│   │   │   #     { name: 'road_type',   type: 'select', options: ['main_road','lane','highway'] },
│   │   │   #   ],
│   │   │   # }
│   │   │   # New category = new form definition. DynamicForm component renders it automatically.
│   │   │
│   │   ├── statuses.ts                  # Mirror of backend status config (labels, colors, icons)
│   │   │   # export const STATUS_CONFIG: Record<TicketStatus, StatusMeta> = {
│   │   │   #   submitted:  { label: 'Submitted',   color: 'blue',   icon: 'clock'   },
│   │   │   #   assigned:   { label: 'Assigned',    color: 'yellow', icon: 'user'    },
│   │   │   #   in_progress:{ label: 'In Progress', color: 'orange', icon: 'wrench'  },
│   │   │   #   resolved:   { label: 'Resolved',    color: 'green',  icon: 'check'   },
│   │   │   #   closed:     { label: 'Closed',      color: 'gray',   icon: 'lock'    },
│   │   │   # }
│   │   │   # New status = new entry. StatusBadge component reads this automatically.
│   │   │
│   │   ├── permissions.ts               # Frontend permission gates (mirrors backend matrix)
│   │   │   # export const CAN_CONFIG: Record<Role, Permission[]> = { ...same as backend... }
│   │   │   # Used by <PermissionGate permission="resolve_ticket"> wrapper component
│   │   │
│   │   └── api.ts                       # API base URLs, endpoint constants
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── OAuthCallbackPage.tsx
│   │   │
│   │   ├── citizen/
│   │   │   ├── DashboardPage.tsx        # Reads DASHBOARD_CONFIG['citizen'], renders widgets
│   │   │   ├── SubmitComplaintPage.tsx  # Reads FORM_CONFIG[selectedCategory], renders dynamic form
│   │   │   ├── TicketListPage.tsx
│   │   │   ├── TicketDetailPage.tsx
│   │   │   └── MapViewPage.tsx
│   │   │
│   │   ├── officer/
│   │   │   ├── DashboardPage.tsx        # Reads DASHBOARD_CONFIG['officer']
│   │   │   ├── TicketQueuePage.tsx
│   │   │   ├── TicketDetailPage.tsx     # Extended view with internal notes, resolve action
│   │   │   ├── AssignedMapPage.tsx
│   │   │   └── SubmitResolutionPage.tsx
│   │   │
│   │   ├── manager/
│   │   │   ├── DashboardPage.tsx        # Reads DASHBOARD_CONFIG['manager']
│   │   │   ├── HeatmapPage.tsx
│   │   │   ├── SLAPage.tsx
│   │   │   └── TeamPerformancePage.tsx
│   │   │
│   │   └── admin/
│   │       ├── DashboardPage.tsx        # Reads DASHBOARD_CONFIG['admin']
│   │       ├── UsersPage.tsx
│   │       ├── DepartmentsPage.tsx
│   │       ├── CategoriesPage.tsx
│   │       ├── SLARulesPage.tsx
│   │       ├── AISettingsPage.tsx       # Toggle features, reorder providers
│   │       ├── KnowledgeBasePage.tsx
│   │       └── AuditLogsPage.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx             # Sidebar + header + content wrapper
│   │   │   ├── Sidebar.tsx              # Reads NAV_CONFIG[currentRole] — auto-renders nav
│   │   │   └── Header.tsx
│   │   │
│   │   ├── core/
│   │   │   ├── DynamicDashboard.tsx     # Reads DASHBOARD_CONFIG[role], renders widget list
│   │   │   ├── DynamicForm.tsx          # Reads FORM_CONFIG[categoryId], renders fields
│   │   │   ├── PermissionGate.tsx       # <PermissionGate permission="x"> renders or hides
│   │   │   ├── RoleGate.tsx             # <RoleGate role="manager"> renders or hides
│   │   │   ├── StatusBadge.tsx          # Reads STATUS_CONFIG — color + icon from config
│   │   │   └── FeatureFlag.tsx          # <FeatureFlag flag="ocr"> renders if enabled
│   │   │
│   │   ├── maps/
│   │   │   ├── LeafletMap.tsx           # Base map wrapper
│   │   │   ├── LocationPicker.tsx       # Pin drop + Photon address search
│   │   │   ├── HeatmapLayer.tsx         # GeoJSON H3 hexagon layer (Hotspot 9 solution)
│   │   │   ├── TicketMarkers.tsx        # Complaint markers with popups
│   │   │   └── OfficerLocationLayer.tsx
│   │   │
│   │   ├── tickets/
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TicketTimeline.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   ├── AttachmentGallery.tsx
│   │   │   └── ResolutionProof.tsx
│   │   │
│   │   ├── charts/
│   │   │   ├── SLADonutChart.tsx        # Recharts
│   │   │   ├── VolumeBarChart.tsx
│   │   │   ├── ResolutionLineChart.tsx
│   │   │   └── WorkloadBar.tsx
│   │   │
│   │   ├── widgets/                     # ★ Dashboard widget registry
│   │   │   ├── widget.registry.ts       # Map<widgetId, React.ComponentType>
│   │   │   │                            # New widget = new component + one line in registry
│   │   │   ├── ActiveTicketsCard.tsx
│   │   │   ├── TicketHistoryTable.tsx
│   │   │   ├── NotificationFeed.tsx
│   │   │   ├── TicketQueue.tsx
│   │   │   ├── ResolutionTimeChart.tsx
│   │   │   ├── SLADonutWidget.tsx
│   │   │   ├── HeatmapPreview.tsx
│   │   │   ├── TeamPerformanceTable.tsx
│   │   │   ├── AIMetricsCard.tsx
│   │   │   └── SecurityEventsCard.tsx
│   │   │
│   │   └── ui/                          # shadcn/ui re-exports + custom primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Table.tsx
│   │       ├── Badge.tsx
│   │       └── Skeleton.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                   # Auth state + token refresh
│   │   ├── usePermission.ts             # hasPermission(perm) — reads config
│   │   ├── useTickets.ts                # TanStack Query hooks
│   │   ├── useNotifications.ts          # Socket.IO real-time + REST fetch
│   │   ├── useMap.ts                    # Geolocation + map state
│   │   ├── useHeatmap.ts                # Fetch H3 hex data + re-fetch on pan/zoom
│   │   └── useFeatureFlag.ts            # isEnabled(flagKey) — reads AI config
│   │
│   ├── api/
│   │   ├── client.ts                    # Axios instance with JWT interceptor + refresh logic
│   │   ├── auth.api.ts
│   │   ├── tickets.api.ts
│   │   ├── users.api.ts
│   │   ├── organization.api.ts
│   │   ├── gis.api.ts
│   │   ├── notifications.api.ts
│   │   ├── analytics.api.ts
│   │   ├── files.api.ts
│   │   ├── search.api.ts
│   │   ├── rag.api.ts
│   │   └── admin.api.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts                # Zustand: user, role, tokens
│   │   ├── notifications.store.ts       # Zustand: unread count, list
│   │   └── ui.store.ts                  # Zustand: sidebar open, theme
│   │
│   ├── lib/
│   │   ├── queryClient.ts               # TanStack Query client config
│   │   ├── socket.ts                    # Socket.IO client instance
│   │   └── validations.ts               # Shared Zod schemas (mirrors backend)
│   │
│   ├── router/
│   │   └── index.tsx                    # React Router — role-based route guards
│   │                                    # <RoleGate> wraps protected routes
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── Dockerfile
├── nginx.conf                           # Nginx config for serving built SPA
├── .env.example
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## GitHub Actions Workflows
```
.github/workflows/
├── ci.yml
│   # Triggers: push to any branch
│   # Steps: checkout → npm ci → lint → type-check → unit tests (Vitest) → integration (Supertest)
│   # Caches: node_modules, ~/.npm
│
├── deploy.yml
│   # Triggers: push/merge to main
│   # Steps: run CI → build Docker images → push to Render (backend) → trigger Vercel deploy (frontend)
│   # E2E tests: run Playwright against deployed preview URL
│
└── keep-alive.yml
    # Triggers: schedule '*/14 * * * *'
    # Steps: curl $RENDER_BACKEND_URL/health
    # Cost: ~30 min GitHub Actions / month (well within 2,000 min limit)
```

---

## Docker
```
docker-compose.yml (local dev)
├── postgres:16-alpine    + PostGIS extension    # port 5432
├── redis:7-alpine                               # port 6379
├── backend               (volume: ./backend/src for hot reload)
└── frontend              (volume: ./frontend/src for HMR)

Dockerfile (backend — multi-stage)
├── Stage 1: builder      node:20-alpine → npm ci → tsc
└── Stage 2: production   node:20-alpine → copy dist → non-root user → EXPOSE 3000

Dockerfile (frontend)
├── Stage 1: builder      node:20-alpine → npm ci → vite build
└── Stage 2: serve        nginx:alpine → copy dist → nginx.conf → EXPOSE 80
```

---

## Key "Change Config, Not Code" Scenarios

| What you want to do | What you change | What automatically updates |
|---|---|---|
| Add ticket status `under_review` | `config/statuses.ts` — one object | Status machine validation, timeline labels, frontend badge |
| Add permission `bulk_close_tickets` | `config/permissions.ts` — one string | RBAC middleware checks it, frontend PermissionGate honors it |
| Add complaint category `electricity` | `config/categories.ts` — one object | Frontend form fields, default dept routing, SLA rules |
| Add new AI provider `anthropic` | Implement `IAIProvider` + add to `provider.registry.ts` + add to `providerOrder` in config | Factory selects it in order, health-checked on startup |
| Add notification channel `sms` | Implement `INotificationChannel` + add to `channel.registry.ts` + add `sms` to any event in `config/notifications.ts` | Fan-out processor delivers to SMS automatically |
| Add dashboard widget `TopComplainants` | Create component + add to `widget.registry.ts` + add to `DASHBOARD_CONFIG['admin']` | Admin dashboard renders it automatically |
| Add new BullMQ queue `reports` | Add entry to `config/queues.ts` | `jobManager.ts` creates queue + worker on startup |
| Add scheduled job | Add entry to `config/cron.ts` | `scheduler.ts` registers cron on startup |
| Add nav item for manager | Add to `config/navigation.ts` under `manager` | Sidebar renders it automatically |
| Add new API module `feedback` | Create `modules/feedback/` with `feedback.router.ts` | `app.ts` auto-discovers and registers it |
| Disable OCR globally | `config/providers.ts` → `ocr.enabled: false` | Feature flag middleware blocks OCR routes, frontend hides OCR UI |
| Change AI provider order | `AI_PROVIDER_ORDER` env var | Provider factory reads at startup, no restart needed with env reload |
| Add search strategy `bm25` | Implement `ISearchStrategy` + add to `strategy.registry.ts` | RRF aggregator includes it automatically in parallel search |

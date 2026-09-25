# STATUS.md

## Project

**ia-business-platform**

Temporary project name.

---

## Current phase

    M6 — Messaging integration

Status:

    READY TO START

M0 through M5 are complete and merged into `main`.

The repository currently has:

- the project/product foundation;
- the executable monorepo and CI quality gate;
- tenant-safe persistence and authenticated tenant resolution;
- the authenticated administrative dashboard;
- CRM and Inbox operational foundations;
- human handoff and AI/human conversation control;
- services and staff management;
- recurring availability management;
- real appointment availability calculation;
- appointment creation and lifecycle management;
- PostgreSQL-level double-booking protection.

The latest scheduling work passed the repository quality gate and was manually
validated through a complete availability-to-booking flow.

---

## Current objective

Begin M6 — Messaging integration without coupling the application domain to a
specific WhatsApp vendor.

Immediate target:

    WhatsApp provider webhook
            ↓
    provider validation
            ↓
    normalized inbound message
            ↓
    deduplication
            ↓
    tenant/contact resolution
            ↓
    conversation persistence
            ↓
    message persistence
            ↓
    asynchronous processing
            ↓
    outbound provider adapter

Before provider-specific implementation begins, ADR-011 must be resolved.

The application must continue to depend on the internal `MessagingProvider`
abstraction rather than directly on Meta, Evolution API, a BSP, or another
vendor.

---

## Completed

### M1 — Technical base

- [x] pnpm workspace initialized.
- [x] `apps/web` initialized with Next.js.
- [x] `apps/api` initialized with NestJS + Fastify.
- [x] `apps/worker` initialized with Node.js + TypeScript.
- [x] Shared workspace packages initialized.
- [x] TypeScript, linting, formatting, unit tests, and E2E tests configured.
- [x] Environment variable template added.
- [x] Redis local development environment added through Docker Compose.
- [x] `/health/live` and `/health/ready` endpoints added.
- [x] Repository-wide quality scripts added.
- [x] GitHub Actions quality gate added and verified successfully.
- [x] M1 exit criterion satisfied.

### Product definition

- [x] General product vision defined.
- [x] First real use case identified: dental office.
- [x] Product designed as multi-industry from the beginning.
- [x] SaaS / multi-tenant direction established.
- [x] Core product value proposition established.
- [x] MVP scope defined.
- [x] Explicit out-of-scope items defined.
- [x] Initial product modules defined.
- [x] Initial development roadmap defined.

---

## Documentation

Current foundational documents:

    docs/
    ├── PROJECT.md
    ├── PRODUCT.md
    ├── MVP.md
    ├── ARCHITECTURE.md
    ├── ROADMAP.md
    ├── STATUS.md
    └── DECISIONS.md

Current state:

| Document          | Status                       |
| ----------------- | ---------------------------- |
| `PROJECT.md`      | Defined                      |
| `PRODUCT.md`      | Defined                      |
| `MVP.md`          | Defined                      |
| `ARCHITECTURE.md` | Initial architecture defined |
| `ROADMAP.md`      | Initial roadmap defined      |
| `STATUS.md`       | Active                       |
| `DECISIONS.md`    | Active                       |

Additional root documentation:

    AGENTS.md
    README.md

Both are defined and active.

---

## Repository

Repository working name:

    ai-business-platform

Primary branch:

    main

Confirmed foundational commit:

    b519e75 docs: define project and initial architecture

The repository now contains the initial executable monorepo foundation for web, API,
worker, shared packages, local Redis infrastructure, and CI validation.

---

## Product scope

The first validated product flow must become:

    WhatsApp
       ↓
    Inbound message
       ↓
    Contact identified/created
       ↓
    Conversation persisted
       ↓
    AI agent
       ↓
    Service intent
       ↓
    Availability lookup
       ↓
    Slot selection
       ↓
    Appointment created
       ↓
    Lead updated
       ↓
    Confirmation
       ↓
    Reminder

The MVP is not considered validated merely because the AI can answer messages.

The MVP is validated when this flow works reliably from a real messaging channel to a real persisted appointment.

---

## Initial modules

Planned core modules:

    Auth
    Business
    Users / Memberships
    Dashboard
    Inbox
    CRM
    Contacts
    Leads
    Pipeline
    Services
    Staff
    Availability
    Appointments
    AI Agent
    Messaging
    Automations
    Analytics
    Integrations
    Audit / Observability

---

## Architecture direction

Current architecture:

    Modular monolith
    +
    asynchronous workers

Candidate/selected technologies:

    Frontend        Next.js + TypeScript
    Backend         NestJS + Fastify
    Worker          Node.js
    Package manager pnpm 12
    Monorepo        pnpm workspaces
    Database        PostgreSQL
    ORM             Drizzle ORM + Drizzle Kit
    DB/Auth infra   Supabase
    Queue           BullMQ
    Queue backend   Redis
    Reverse proxy   Caddy
    Deployment      Docker on VPS

Important principle:

    Frontend
       ↓
    Backend
       ↓
    Domain rules
       ↓
    Database / queues / provider adapters

External providers must not become the core domain.

---

## Multi-tenancy

Multi-tenancy is a first-class architectural requirement.

Primary tenant:

    Business

Operational entities will be associated with:

    business_id

Access must be resolved and validated by the backend through authenticated memberships.

The frontend must never be trusted to freely choose a tenant.

---

## AI direction

The AI layer will be provider-agnostic.

Conceptual abstraction:

    AIProvider

The model will:

- understand conversation;
- interpret intent;
- generate language;
- request tools.

The backend will:

- validate parameters;
- enforce tenant isolation;
- execute tools;
- create appointments;
- update business state;
- persist results.

The LLM will not have direct database access.

---

## Available development models

Available models that may be used during development and review include:

### ChatGPT

    Astra 6
    GPT-5.6 Sol
    GPT-5.6 Terra
    GPT-5.6 Luna
    GPT-5.5

### Google AI Pro environment

    Gemini 3.8
    Gemini 3.7
    Gemini 3.6
    Gemini 3.1 Pro
    Claude Sonnet 4.6
    Claude Opus 4.6
    GPT-OSS 120B

These models are development aids, not automatically the runtime models of the product.

The runtime AI provider/model remains a separate technical decision.

---

## Messaging direction

Initial channel:

    WhatsApp

The final provider is intentionally undecided.

Candidates include:

    Meta Cloud API
    Evolution API
    BSPs
    other viable providers

Selection must consider the needs of SMEs, especially:

- onboarding complexity;
- cost;
- stability;
- number requirements;
- policy/compliance;
- risk of blocking;
- support;
- operation in Colombia;
- scalability.

The application will use a provider abstraction.

Conceptually:

    MessagingProvider

---

## Infrastructure currently available

### Development computer

    AMD Ryzen 5 5600GT
    32 GB RAM
    No dedicated GPU required for initial development

### Secondary laptop

    Intel Core i5 10th Gen
    20 GB RAM

### Test devices

    Android phone
    iPhone

### Current VPS

    4 vCPU
    7.8 GiB usable RAM
    ~96 GB root filesystem
    Linux / KVM

The current VPS can support development and early deployment of the MVP, especially after the planned reinstall/cleanup.

Heavy self-hosted LLM inference is not part of the MVP infrastructure.

---

## VPS observations

Current server inspection showed:

    4 vCPU
    7.8 GiB RAM
    ~4.2 GiB available at inspection time
    ~36 GB disk free
    No swap configured

Docker currently contains significant reclaimable image/build cache data.

Before using the server as a clean base for the project, the plan is to reinstall it and leave Moni properly deployed with a cleaner infrastructure layout.

Recommended post-reinstall considerations:

- swap as safety margin;
- Docker log rotation;
- container resource limits;
- external backups;
- monitoring;
- clean `/opt` application layout.

---

## Current risks / unknowns

### WhatsApp provider

Status:

    OPEN

This is one of the most important product/infrastructure decisions.

---

### ORM / database access layer

Status:

    ACCEPTED

Selected:

    Drizzle ORM + Drizzle Kit

Application schema and migrations will live under the repository database package and remain PostgreSQL-first.

---

### Monorepo tooling

Status:

    ACCEPTED

Selected:

    pnpm 12
    pnpm workspaces

No Turborepo initially. A build orchestrator will be added only if task orchestration or caching becomes a measurable need.

---

### Runtime AI provider

Status:

    OPEN

Development model availability does not define production runtime selection.

The runtime choice must consider:

- tool calling;
- latency;
- quality;
- cost;
- reliability;
- structured outputs;
- provider limits;
- privacy requirements.

---

### Calendar integration

Status:

    DEFERRED / TO VALIDATE

The platform will maintain its own appointments.

Google Calendar may be added depending on pilot needs.

---

## Remaining implementation

Major areas still ahead:

    M6  WhatsApp / messaging provider integration
    M7  AI Agent
    M8  Complete end-to-end business flow
    M9  Automations and reminders
    M10 Observability and hardening
    M11 Dental pilot
    M12 Product validation

Additional operational work still expected includes:

- asynchronous messaging queues and worker execution;
- provider webhook verification and idempotency;
- outbound message delivery and provider error handling;
- deployment and production hardening;
- backup and recovery procedures;
- observability and retry visibility.

Known non-blocking scheduling debt:

    dedicated appointment detail route/page
    dedicated GET /appointments/:appointmentId endpoint

Appointments are already visible with their operational details in the agenda,
and the scheduling exit criterion is satisfied. The dedicated detail route is a
future usability/integration improvement and does not block M6.

---

## Next actions

Recommended immediate order:

    1. Resolve ADR-011 — WhatsApp provider
    2. Define the MessagingProvider contract
    3. Implement the provider adapter boundary
    4. Implement inbound webhook validation
    5. Normalize and deduplicate inbound messages
    6. Persist inbound messaging activity
    7. Add outbound message sending
    8. Move slow provider/AI work to asynchronous processing

Do not introduce M7 AI orchestration until the M6 messaging boundary is stable
enough to receive and persist real messages reliably.

---

## Current milestone completion

### M0 — Foundation

    Status                  DONE
    Product vision          DONE
    Product definition      DONE
    MVP definition          DONE
    Architecture baseline   DONE
    Roadmap                 DONE
    Status tracking         DONE
    Decision log            ACTIVE
    AGENTS.md               DONE
    README.md               DONE

M0 is closed.

### M1 — Technical base

    Status                  DONE
    pnpm workspace          DONE
    apps/web                DONE
    apps/api                DONE
    apps/worker             DONE
    Shared packages         DONE
    Redis development infra DONE
    Health checks           DONE
    Automated tests         DONE
    CI quality gate         DONE

M1 is closed.

### M2 — Domain and persistence

    Status                    DONE
    PostgreSQL / Drizzle       DONE
    Versioned migrations       DONE
    Business tenancy model     DONE
    Auth identity mapping      DONE
    Business memberships       DONE
    Services                   DONE
    Staff                      DONE
    Availability rules         DONE
    Contacts                   DONE
    Leads / pipelines          DONE
    Appointments               DONE
    Conversations              DONE
    Messages                   DONE
    Row-Level Security enabled DONE
    Tenant isolation tests     DONE
    Tenant resolution          DONE

M2 is closed.

### M3 — Administrative dashboard

    Status                    DONE
    Supabase Auth web SSR     DONE
    Login / logout            DONE
    Session handling          DONE
    Route protection          DONE
    API token verification    DONE
    Auth-to-tenant resolution DONE
    Private app shell         DONE
    Navigation                DONE
    Dashboard API             DONE
    Real dashboard metrics    DONE

M3 is closed.

### M4 — CRM + Inbox

    Status                     DONE
    CRM contact list           DONE
    CRM contact detail         DONE
    Tenant-scoped CRM API      DONE
    Conversation list          DONE
    Conversation detail        DONE
    Persisted message history  DONE
    Development messages       DONE
    Human handoff              DONE
    Human takeover             DONE
    Resume AI control          DONE
    Tenant isolation           VERIFIED

M4 is closed.

### M5 — Scheduling

    Status                     DONE
    Service management         DONE
    Optional service pricing   DONE
    Staff management           DONE
    Staff/service assignments  DONE
    Availability rule CRUD     DONE
    Appointment list           DONE
    Appointment creation       DONE
    Cancel lifecycle           DONE
    Complete lifecycle         DONE
    No-show lifecycle          DONE
    Availability engine        DONE
    Business timezone handling DONE
    Existing booking removal   DONE
    Booking revalidation       DONE
    DB overlap protection      DONE
    API E2E coverage           DONE
    Manual functional test     VERIFIED

The availability engine evaluates:

    business timezone
    service duration
    active service state
    active staff state
    staff/service assignment
    recurring availability rules
    existing scheduled appointments
    future-only slots

Appointment creation validates the requested configuration again before writing.

PostgreSQL provides the final concurrency guard through an exclusion constraint
that prevents overlapping scheduled appointments for the same staff member.

Manual validation confirmed:

    availability rule created
            ↓
    matching slots returned
            ↓
    appointment booked
            ↓
    booked interval no longer returned

Known non-blocking debt:

    no dedicated appointment detail page
    no dedicated GET /appointments/:appointmentId endpoint

The agenda already exposes the appointment's operational details, so this does
not block the scheduling exit criterion.

M5 is closed.

### M6 — Messaging integration

    Status                  NEXT
    WhatsApp provider       OPEN
    MessagingProvider       NOT STARTED
    Provider webhook        NOT STARTED
    Payload normalization   NOT STARTED
    Deduplication           FOUNDATION AVAILABLE
    Outbound delivery       NOT STARTED
    Async processing        NOT STARTED

The existing Message persistence model already includes
`provider_message_id`, providing the persistence foundation for provider
delivery deduplication.

ADR-011 must be resolved before provider-specific implementation begins.

---

## Update rule

This file must represent the repository as it actually exists.

Update it whenever:

- a milestone changes;
- an important feature lands;
- an architectural decision changes implementation direction;
- a major blocker appears or is resolved;
- the production/deployment state changes.

`STATUS.md` is not a roadmap.

It answers:

> What is true about the project right now?

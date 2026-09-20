# STATUS.md

## Project

**ia-business-platform**

Temporary project name.

---

## Current phase

    M4 — CRM + Inbox

Status:

    IN PROGRESS

M1 — Technical base is complete.

The repository now has an executable monorepo foundation, local Redis infrastructure,
health checks, shared packages, automated testing, formatting, and a GitHub Actions
quality gate.

M2 is complete, including the operational schema, automated tenant isolation tests,
and authenticated tenant resolution.

M3 is complete. The authenticated administrative application shell, private
navigation, tenant-aware backend integration, and real dashboard metrics are
implemented and manually verified.

---

## Current objective

Begin the CRM + Inbox foundation defined for M4.

Immediate target:

    authenticated tenant
            ↓
    contacts and leads
            ↓
    conversations and messages
            ↓
    human operational workflow
            ↓
    AI/human handoff foundation

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

Major areas still not implemented include:

    Redis queues
    CRM editing
    Inbox application layer
    availability engine
    WhatsApp integration
    AI agent
    deployment pipeline

M0, M1, M2, and M3 are complete.

M4 is in progress. Tenant-scoped CRM contact list/detail and the conversation
inbox foundation are implemented and manually verified against persisted
development data.

---

## Next actions

Recommended immediate order:

    1. Implement conversation detail with persisted messages
    2. Add development message simulation
    3. Establish the human handoff workflow
    4. Connect CRM and Inbox operational flows

---

## Current milestone completion

### M0 — Foundation

    Product vision          DONE
    MVP definition          DONE
    Architecture draft      DONE
    Product definition      DONE
    Roadmap                 DONE
    Status tracking         DONE
    Decision log            ACTIVE
    AGENTS.md                DONE
    README.md                DONE
    Bootstrap ADRs           DONE

The foundational documentation and immediate bootstrap decisions are complete.

M0 is closed.

### M1 — Technical base

    Status                  DONE
    Workspace bootstrap     DONE
    apps/web                DONE
    apps/api                DONE
    apps/worker             DONE
    Shared packages         DONE
    Redis                   DONE
    Health checks           DONE
    CI quality gate         DONE

M1 is closed.

### M2 — Domain and persistence

    Status                  DONE
    ORM/migration decision  DONE
    packages/database       FOUNDATION COMPLETE
    Drizzle foundation      DONE
    Development Supabase    DONE
    Identity/tenancy schema DONE
    Development migrations  APPLIED
    Core schemas            DONE
    Tenant isolation tests  AUTOMATED
    Tenant resolution       DONE

M2 is closed.

### M3 — Administrative dashboard

    Status                    DONE
    Supabase Auth web SSR     DONE
    Login/logout              DONE
    Session                   DONE
    Route protection          DONE
    API token verification    DONE
    API auth-to-tenant        DONE
    Web-to-API auth           DONE
    Development user          PROVISIONED
    Login-to-tenant flow      VERIFIED
    Navigation                DONE
    Private application shell DONE
    Private module routes     DONE
    Dashboard API             DONE
    Real dashboard metrics    VERIFIED

Dashboard metrics currently represent tenant-wide persisted state:

    leads received          total recorded leads
    open conversations      conversations with OPEN status
    scheduled appointments  appointments with SCHEDULED status
    human handoffs          conversations with HUMAN_REQUIRED status

M3 exit criterion is satisfied.

M3 is closed.

### M4 — CRM + Inbox

    Status                    IN PROGRESS
    CRM contact list          DONE
    Tenant-scoped CRM API     DONE
    Contact list DB query     VERIFIED
    Latest lead projection    VERIFIED
    Contact list web UI       VERIFIED
    CRM contact detail        DONE
    Conversation list         DONE
    Conversation detail       NOT STARTED
    Development messages      NOT STARTED
    Human handoff workflow    NOT STARTED

The contact list currently exposes:

    contact identity
    source
    latest lead stage
    latest lead service
    last interaction

The backend derives the business from authenticated tenant context. The web client
does not supply a freely trusted business identifier.

The CRM contact list and contact detail screens have been manually verified
against persisted development data. Contact detail supports contacts with and
without an associated lead.

Contact detail lookup is tenant-scoped by the backend and returns no cross-tenant
contact data.

The conversation inbox foundation is also tenant-scoped and currently exposes:

    contact identity
    channel
    conversation status
    AI/human control state
    latest persisted message
    latest activity time

The Inbox screen has been manually verified with OPEN, HUMAN_REQUIRED, AI-active,
human-control, and no-message conversation states.

M4 remains in progress.

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

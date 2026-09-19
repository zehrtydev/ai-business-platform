# STATUS.md

## Project

**ia-business-platform**

Temporary project name.

---

## Current phase

    M1 — Technical base

Status:

    IN PROGRESS

The foundational documentation and bootstrap architecture decisions are complete.

Implementation is now starting with the monorepo and technical foundation.

No product code has been implemented yet.

---

## Current objective

Bootstrap the technical foundation defined for M1.

Immediate target:

    pnpm workspace
            ↓
    apps/web + apps/api + apps/worker
            ↓
    shared packages
            ↓
    Redis + CI quality gate
            ↓
    M2 — Domain and persistence

---

## Completed

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

The repository currently contains documentation and empty/initial structural directories.

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
    Database        PostgreSQL
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

## Not started

The following have not been implemented yet:

    Next.js app
    NestJS API
    worker
    database schema
    Supabase project
    Redis queues
    authentication
    CRM
    Inbox
    appointments
    availability engine
    WhatsApp integration
    AI agent
    CI
    deployment pipeline
    tests

This is intentional.

M0 is complete.

M1 is now in progress.

---

## Next actions

Recommended immediate order:

    1. Bootstrap pnpm workspace
    2. Bootstrap apps/web
    3. Bootstrap apps/api
    4. Bootstrap apps/worker
    5. Create packages/database with Drizzle
    6. Add Redis development infrastructure
    7. Establish CI quality gate
    8. Begin M2 domain model

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

    Status                  IN PROGRESS
    Workspace bootstrap     NEXT
    apps/web                NOT STARTED
    apps/api                NOT STARTED
    apps/worker             NOT STARTED
    packages/database       NOT STARTED
    Redis                   NOT STARTED
    CI quality gate         NOT STARTED

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

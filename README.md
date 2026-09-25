# ia-business-platform

> Temporary project name.

**ia-business-platform** is a multi-tenant SaaS platform for AI-assisted lead handling, conversations, appointment scheduling, follow-up, and human supervision.

The first real use case is a dental office, but the product is intentionally designed so the core can later serve other service businesses.

---

## Project status

Current milestone state:

    M0 — Project foundation        COMPLETE
    M1 — Technical base           COMPLETE
    M2 — Domain and persistence   COMPLETE
    M3 — Admin dashboard          COMPLETE
    M4 — CRM + Inbox              COMPLETE
    M5 — Scheduling               COMPLETE
    M6 — Messaging integration    IN PROGRESS

M0 through M5 are implemented in `main`.

The current platform foundation includes:

- executable web, API, and worker applications;
- authenticated Supabase sessions;
- backend tenant resolution and isolation;
- CRM contact list and detail;
- persisted conversations and messages;
- Inbox conversation detail;
- AI/human conversation control and human handoff;
- service management;
- staff management and service assignments;
- recurring availability rule management;
- real appointment slot calculation;
- appointment creation and lifecycle management;
- PostgreSQL-level double-booking protection;
- automated database tenant-isolation coverage;
- repository-wide CI quality gates.

M5 was validated automatically and manually through:

    Availability Rule
            ↓
    Available Slots
            ↓
    Appointment Creation
            ↓
    Reserved Slot Removed

The next milestone is:

    M6 — Messaging integration

ADR-011 is accepted.

Development uses Evolution API / Baileys with a dedicated WhatsApp test number
and zero incremental messaging-provider cost.

Meta WhatsApp Cloud API remains the intended production target.

See `docs/STATUS.md` for the detailed current repository state.

---

## Core idea

The target flow is:

    Lead
      ↓
    Messaging channel
      ↓
    Conversation
      ↓
    AI Agent
      ↓
    Intent
      ↓
    Availability
      ↓
    Appointment
      ↓
    Confirmation
      ↓
    Follow-up

The product is not intended to be only a chatbot.

The platform combines:

    Messaging
    CRM
    AI
    Appointments
    Automation
    Analytics
    Human handoff

---

## First use case

The first pilot is expected to be a dental office where a significant amount of time is spent:

- answering WhatsApp messages;
- responding to repetitive questions;
- coordinating appointments;
- following up with leads.

The MVP must prove that a real lead can send a message and complete the journey to a real appointment stored in the platform.

---

## Product principles

### Multi-tenant from day one

The platform is designed around independent businesses.

    Business A
    ├── users
    ├── contacts
    ├── conversations
    ├── services
    └── appointments

    Business B
    ├── users
    ├── contacts
    ├── conversations
    ├── services
    └── appointments

Tenant isolation is a core security requirement.

### Industry-independent core

Core concepts are generic:

    Business
    Contact
    Lead
    Conversation
    Message
    Service
    StaffMember
    Appointment
    Pipeline
    Automation

Dental-specific behavior belongs to configuration or vertical extensions.

### AI is not the source of truth

The model may converse and request actions.

The backend validates and executes those actions.

Example:

    User asks for appointment
            ↓
    AI requests available slots
            ↓
    Backend calculates availability
            ↓
    AI presents valid options
            ↓
    User selects
            ↓
    Backend validates again
            ↓
    Appointment created
            ↓
    AI confirms

### Human control is always available

The business can take over a conversation.

When human control is active, automatic AI replies must stop.

### Providers remain replaceable

Messaging and AI providers are abstracted behind internal interfaces.

The core product must not depend permanently on one vendor.

---

## MVP

The MVP focuses on one critical end-to-end flow:

    WhatsApp
       ↓
    Inbound message
       ↓
    Contact created/identified
       ↓
    Conversation persisted
       ↓
    AI response
       ↓
    Service intent
       ↓
    Availability lookup
       ↓
    Slot selection
       ↓
    Appointment creation
       ↓
    Lead update
       ↓
    Confirmation
       ↓
    Reminder

For the detailed scope and acceptance criteria, see:

    docs/MVP.md

---

## Planned architecture

Initial architecture:

                             Users
                               │
                               ▼
                           Next.js
                               │
                               ▼
                        NestJS + Fastify
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
            PostgreSQL       Redis        AI Providers
             Supabase        BullMQ
                 │             │
                 │             ▼
                 │           Worker
                 │
                 ▼
          Supabase Realtime

External integrations such as WhatsApp, calendar services and n8n connect through adapters.

The backend starts as a **modular monolith**, not microservices.

---

## Candidate stack

    Frontend        Next.js + TypeScript
    Backend         NestJS + Fastify
    Worker          Node.js
    Database        PostgreSQL
    Managed infra   Supabase
    Queue           BullMQ
    Queue backend   Redis
    Reverse proxy   Caddy
    Deployment      Docker + VPS

Some implementation choices remain intentionally open and are tracked in:

    docs/DECISIONS.md

---

## Planned repository structure

    ai-business-platform/
    ├── apps/
    │   ├── web/
    │   ├── api/
    │   └── worker/
    │
    ├── packages/
    │   ├── database/
    │   ├── contracts/
    │   ├── ai/
    │   ├── messaging/
    │   ├── config/
    │   └── shared/
    │
    ├── docs/
    │   ├── PROJECT.md
    │   ├── PRODUCT.md
    │   ├── MVP.md
    │   ├── ARCHITECTURE.md
    │   ├── ROADMAP.md
    │   ├── STATUS.md
    │   └── DECISIONS.md
    │
    ├── infra/
    ├── AGENTS.md
    └── README.md

This structure is still subject to the accepted architecture decisions.

---

## Documentation

Read these documents before substantial implementation work.

| Document               | Purpose                               |
| ---------------------- | ------------------------------------- |
| `docs/PROJECT.md`      | Vision, problem and product direction |
| `docs/PRODUCT.md`      | Functional product definition         |
| `docs/MVP.md`          | MVP scope and acceptance criteria     |
| `docs/ARCHITECTURE.md` | Architecture and component boundaries |
| `docs/ROADMAP.md`      | Development milestones                |
| `docs/STATUS.md`       | Current repository state              |
| `docs/DECISIONS.md`    | Architecture Decision Records         |
| `AGENTS.md`            | Rules for AI coding agents            |

---

## Roadmap

High-level milestones:

    M0  Project foundation
    M1  Technical base
    M2  Domain and persistence
    M3  Admin dashboard
    M4  CRM + Inbox
    M5  Appointments
    M6  Messaging integration
    M7  AI Agent
    M8  End-to-end flow
    M9  Automations and reminders
    M10 Observability and hardening
    M11 Dental pilot
    M12 Product validation

See:

    docs/ROADMAP.md

for details.

---

## Messaging provider

The first channel will be WhatsApp.

The provider is intentionally not selected yet.

Candidates may include:

    Meta Cloud API
    Evolution API
    BSPs
    other viable options

The decision must consider SMEs, costs, onboarding requirements, stability, compliance, support, and operation in Colombia.

The product will use an internal abstraction similar to:

    MessagingProvider

---

## AI provider

The runtime AI provider/model is also intentionally replaceable.

The application will use an abstraction similar to:

    AIProvider

AI models can request application tools, but do not receive direct database control.

---

## Infrastructure

Available initial infrastructure is sufficient for development and early pilots:

    Development PC
    Ryzen 5 5600GT
    32 GB RAM

    Secondary laptop
    Intel Core i5 10th Gen
    20 GB RAM

    VPS
    4 vCPU
    ~8 GB RAM
    ~100 GB disk

Heavy local LLM inference is not required for the MVP.

External AI APIs will be used initially.

---

## Out of scope for the initial MVP

Examples:

    Instagram
    voice agents
    automatic calls
    payments
    billing
    clinical records
    medical diagnosis
    native mobile app
    advanced marketing automation
    Kubernetes
    microservices
    self-hosted production LLMs

These may be evaluated after the core flow is validated.

---

## Development workflow

The primary stable branch is:

    main

Prefer short-lived branches such as:

    feat/bootstrap-monorepo
    feat/business-domain
    feat/appointments
    feat/inbox
    feat/whatsapp-provider
    feat/ai-agent

Commit prefixes:

    feat:
    fix:
    docs:
    refactor:
    test:
    chore:
    perf:
    ci:

---

## Current next steps

The immediate M6 implementation order is:

    1. Define the provider-agnostic MessagingProvider contract
    2. Define normalized inbound/outbound messaging contracts
    3. Add Evolution API as the development adapter
    4. Connect a dedicated WhatsApp test number
    5. Implement inbound webhook/event handling
    6. Normalize and deduplicate inbound messages
    7. Persist inbound conversation activity
    8. Implement outbound message sending
    9. Introduce asynchronous processing where required

Business logic must remain independent from Evolution, Baileys and Meta.

The Evolution adapter is temporary development infrastructure.

The provider integration must build on the existing tenant-safe Contact,
Conversation and Message persistence model rather than introducing a parallel
source of truth.

---

## Guiding principle

> Automate repetitive customer-facing work without removing visibility or control from the business.

The goal is not to build the most complex architecture.

The goal is to build a reliable, maintainable product that converts conversations into measurable business outcomes.

# ARCHITECTURE.md

## Status

Initial draft.

This document describes the candidate architecture for the **ia-business-platform** MVP and establishes the main boundaries between components.

Decisions marked as candidates may change during implementation. Final decisions must be recorded in `docs/DECISIONS.md`.

---

## 1. Architecture goals

The architecture must make it possible to:

- build the MVP quickly;
- maintain a clear separation between frontend, backend, and asynchronous processing;
- support multiple businesses from the start;
- decouple messaging and artificial intelligence providers;
- process webhooks safely and idempotently;
- run background tasks;
- maintain a central source of truth for appointments, contacts, and conversations;
- add new channels and providers without rewriting the core;
- grow progressively without adopting microservices prematurely;
- deploy initially on simple, low-cost infrastructure.

---

## 2. Main principle

The initial architecture will be a:

> **Modular monolith with asynchronous workers.**

Microservices will not be used during the MVP.

This means business logic will remain inside a backend application organized by domains, while work that does not require an immediate response will be executed by one or more workers.

---

## 3. Overview

                              USERS

                        Browser / Dashboard
                                  │
                                  ▼
                           ┌─────────────┐
                           │   Next.js   │
                           │     Web     │
                           └──────┬──────┘
                                  │ HTTPS
                                  ▼
                           ┌─────────────┐
                           │   NestJS    │
                           │   Fastify   │
                           │     API     │
                           └──────┬──────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          ┌───────────┐     ┌───────────┐     ┌────────────┐
          │PostgreSQL │     │   Redis   │     │ AI Layer   │
          │ Supabase  │     │  BullMQ   │     │ Providers  │
          └─────┬─────┘     └─────┬─────┘     └────────────┘
                │                 │
                │                 ▼
                │           ┌───────────┐
                │           │  Worker   │
                │           └─────┬─────┘
                │                 │
                ▼                 ▼
          Supabase Realtime    Integrations
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                  │
               ▼                  ▼                  ▼
           WhatsApp         Google Calendar         n8n
           Provider             future             optional

---

## 4. Main components

### 4.1 `apps/web`

Administrative frontend.

Candidate technology:

    Next.js
    TypeScript

Responsibilities:

- user authentication;
- dashboard;
- inbox;
- CRM;
- scheduling;
- services;
- staff;
- business settings;
- metrics visualization;
- human handoff;
- interaction with the API.

The frontend must not contain critical business logic.

It will not be responsible for determining:

- actual availability;
- effective permissions;
- multi-tenant isolation;
- definitive appointment creation;
- automation execution;
- direct calls to external providers using secrets.

---

### 4.2 `apps/api`

Main backend.

Candidate technology:

    NestJS
    Fastify
    TypeScript

Responsibilities:

- business rules;
- authorization;
- tenant resolution;
- contacts;
- leads;
- conversations;
- messages;
- services;
- staff;
- availability;
- appointments;
- pipelines;
- provider integrations;
- tools available to AI agents;
- webhook reception;
- event generation;
- job creation;
- health/readiness endpoints.

The backend will be the main authority over the operational state of the product.

---

### 4.3 `apps/worker`

Asynchronous processing.

Candidate technology:

    Node.js
    BullMQ
    Redis

Initial responsibilities:

- deferred message processing;
- execution of AI-generated responses;
- message sending;
- reminders;
- retries;
- external synchronization;
- scheduled jobs;
- processing of secondary events.

The worker may share domain packages with `apps/api`, but it must not depend on the frontend.

---

## 5. Database

Primary engine:

    PostgreSQL

Candidate provider for the MVP:

    Supabase

Supabase will be used mainly as managed infrastructure for:

- PostgreSQL;
- authentication;
- storage when needed;
- realtime where useful.

Supabase will not replace the backend business layer.

---

## 6. Source of truth

The ia-business-platform database will be the source of truth for the main entities.

Examples:

    Business
    Contact
    Lead
    Conversation
    Message
    Service
    StaffMember
    Availability
    Appointment
    Pipeline
    PipelineStage
    Integration

External systems such as Google Calendar must not be the only source of truth.

Example:

    Internal Appointment
           ↓
    synchronization
           ↓
    Google Calendar

---

## 7. Multi-tenancy

The application will be multi-tenant from the beginning.

The main isolation unit will be:

    business_id

Every entity belonging to a business must be unambiguously associated with that tenant.

Examples:

    services.business_id
    contacts.business_id
    conversations.business_id
    appointments.business_id
    pipelines.business_id
    integrations.business_id

### Security rule

The backend must never rely solely on a `business_id` sent by the frontend.

The tenant must be resolved from the authenticated identity and its memberships.

Conceptually:

    User
      ↓
    BusinessMembership
      ↓
    Business

---

## 8. Initial domain model

Planned domains:

    auth
    businesses
    users
    memberships
    contacts
    leads
    pipelines
    conversations
    messages
    services
    staff
    availability
    appointments
    integrations
    ai
    automations
    analytics
    audit

These domains will exist as modules inside the monolith.

They do not imply separate microservices.

---

## 9. Synchronous and asynchronous communication

### Synchronous

Used when the user or provider requires an immediate response.

Examples:

    GET /services
    GET /appointments
    POST /appointments
    POST /auth/login

### Asynchronous

Used when an operation:

- may take time;
- depends on an external provider;
- needs retries;
- must execute in the future;
- should not block a webhook.

Examples:

    process received message
    query AI
    send response
    schedule reminder
    synchronize calendar
    generate analytics

---

## 10. Webhooks

Webhooks must be processed under the principle:

> receive → validate → persist/deduplicate → enqueue → respond.

Example:

    WhatsApp Provider
           ↓
    Webhook
           ↓
    API
           ↓
    Validate signature/origin
           ↓
    Check idempotency
           ↓
    Persist minimum event
           ↓
    Create job
           ↓
    HTTP 200
           ↓
    Worker processes

Long chains of AI and integration calls should not be executed before answering the webhook when unnecessary.

---

## 11. Idempotency

External systems may resend events.

The platform must assume that the same event may arrive more than once.

External identifiers and/or idempotency keys will be used to prevent duplicates.

Critical cases:

    messages
    webhooks
    appointments
    jobs
    synchronizations

Example:

    provider_message_id

must be usable to detect previously processed messages.

---

## 12. Redis and queues

Candidate technologies:

    Redis
    BullMQ

Redis will not be the source of truth for critical data.

It will mainly be used for:

- queues;
- locks when appropriate;
- worker coordination;
- delayed jobs;
- retries;
- ephemeral state.

Data whose loss would affect the business must be persisted in PostgreSQL.

---

## 13. Internal events

The system will use domain events to decouple secondary actions.

Examples:

    contact.created
    lead.created
    message.received
    message.sent
    lead.stage_changed
    appointment.created
    appointment.cancelled
    conversation.handoff_requested
    conversation.handoff_resolved

During the MVP, these events may be implemented inside the monolith and the existing queues.

Kafka, RabbitMQ, or a distributed streaming platform is not required.

---

## 14. Messaging

Business logic must not depend on a specific WhatsApp provider.

An abstraction equivalent to the following will be defined:

    interface MessagingProvider {
      sendText(...)
      sendMedia(...)
      markAsRead(...)
      normalizeInboundMessage(...)
      getMedia(...)
    }

Future implementations may include:

    Meta Cloud API
    Evolution API
    BSP
    other providers

The initial selection remains pending research.

---

## 15. Message normalization

Each provider uses different formats.

Adapters must convert external messages into a common internal format.

Conceptual example:

    type NormalizedInboundMessage = {
      externalMessageId: string
      channel: string
      senderExternalId: string
      type: string
      text?: string
      media?: unknown
      receivedAt: Date
    }

The rest of the system must work with the internal format, not the provider-specific payload.

---

## 16. Artificial intelligence

AI will be treated as a capability external to the core domain.

An abstraction equivalent to the following will be defined:

    interface AIProvider {
      generate(...)
      stream(...)
      executeWithTools(...)
    }

The goal is to replace models or providers without changing CRM, conversation, or scheduling logic.

---

## 17. Agent layer

The agent must combine:

    System/Business Context
            +
    Conversation Context
            +
    Available Tools
            +
    Policies
            ↓
           LLM

The model may propose the use of tools, but the backend will execute them.

Example:

    Patient:
    "I want an appointment tomorrow"

            ↓

    LLM requests:
    get_available_slots(...)

            ↓

    Backend validates and executes

            ↓

    Result:
    09:00
    11:30
    15:00

            ↓

    LLM generates response

---

## 18. Tool execution

AI tools will be application-controlled functions.

Examples:

    get_business_information
    get_services
    get_available_slots
    create_appointment
    update_contact
    update_lead
    request_human_handoff

Each execution must:

1. validate the tenant;
2. validate parameters;
3. check authorization;
4. execute business rules;
5. persist changes;
6. generate events where appropriate;
7. return only the information required by the agent.

The AI will never have direct access to SQL or system secrets.

---

## 19. Human handoff

The conversation must know who has control.

Conceptual example:

    AI
    HUMAN

When the mode is human:

    AI responses = disabled

The worker must check this state before producing an automatic response.

This prevents simultaneous replies from the operator and the AI.

---

## 20. Scheduling and concurrency

Availability must be calculated in the backend.

Appointment creation must revalidate that the time slot is still available.

Flow:

    query time slots
          ↓
    show options
          ↓
    user selects
          ↓
    validate again
          ↓
    create appointment

The database must help prevent incompatible bookings.

The exact constraint/locking strategy will be defined when the schema is designed.

---

## 21. Realtime

Candidate use cases:

    new message
    conversation updated
    handoff requested
    appointment created

Candidate technology:

    Supabase Realtime

Realtime will improve dashboard experience.

It will not replace persistence or regular APIs.

---

## 22. n8n

n8n may be used as a complementary integration tool.

Examples:

    ia-business-platform
            ↓
          event
            ↓
           n8n
       ↙     ↓     ↘
    Sheets  Gmail   external CRM

n8n will not be:

- the source of truth;
- the main backend;
- the place where critical appointment logic lives;
- the only storage for business state.

The product must continue to function even if an external n8n automation fails.

---

## 23. Monorepo

Candidate structure:

    ia-business-platform/
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
    ├── README.md
    └── package.json

The monorepo will initially use **pnpm 12 workspaces**.

Turborepo or another build orchestrator will only be added later if task orchestration or caching becomes a measurable need.

---

## 24. Shared contracts

`packages/contracts` may contain types and contracts that need to be shared between web, API, and worker.

It must not become a generic package where code with no clear domain is placed.

Appropriate examples:

    shared DTOs
    event contracts
    public enums
    shared validation schemas

---

## 25. Data access layer

The initial data-access layer will use:

    Drizzle ORM
    Drizzle Kit
    PostgreSQL

Application schemas will be defined in TypeScript and schema evolution will use version-controlled SQL migrations.

The shared database package is expected to live in:

    packages/database

Drizzle will own application-controlled schemas/tables. Supabase-managed internal schemas such as Auth must remain outside Drizzle migration ownership.

Production and staging schema changes must use reviewed migrations rather than direct schema push.

The rationale is recorded in `docs/DECISIONS.md`.

---

## 26. Authentication

Candidate provider:

    Supabase Auth

Authentication identifies the user.

Authorization will remain the backend's responsibility.

Conceptually:

    Supabase Auth
          ↓
    user identity
          ↓
    Backend
          ↓
    membership + permissions + business

Having a valid token will not be enough to access any tenant.

---

## 27. Security

Initial principles:

- secrets only through environment variables or secret management;
- no secrets in Git;
- input validation;
- tenant isolation;
- webhook verification;
- least privilege;
- protection of administrative endpoints;
- rate limiting where necessary;
- auditing of sensitive operations.

Sensitive data for each vertical must be analyzed before being incorporated.

The dental MVP will not include clinical records.

---

## 28. Logs and observability

Each component must produce structured logs.

Useful fields:

    timestamp
    level
    service
    business_id
    request_id
    job_id
    conversation_id
    external_event_id
    message
    error

Logs must not include secrets or unnecessary sensitive data.

Minimum endpoints:

    /health/live
    /health/ready

There must also be visibility into:

- failed jobs;
- provider errors;
- rejected webhooks;
- AI errors;
- exhausted retries.

---

## 29. Correlation IDs

Whenever possible, an operation should be traceable across components.

Example:

    Webhook
      ↓
    request_id
      ↓
    job
      ↓
    AI call
      ↓
    send message

This will make it possible to investigate errors without relying exclusively on timestamps.

---

## 30. External error handling

Every external provider may fail.

Examples:

    WhatsApp
    AI provider
    Supabase
    Google Calendar
    email

The architecture must distinguish between:

- permanent errors;
- temporary errors;
- retryable errors;
- errors requiring human intervention.

Not every failure should be retried automatically.

---

## 31. Initial deployment

Candidate infrastructure:

    VPS
    4 vCPU
    8 GB RAM
    100 GB SSD

The VPS may initially host:

    Caddy
    Next.js
    NestJS API
    Worker
    Redis
    monitoring

Supabase will remain an external managed service.

AI will be consumed through external APIs during the MVP.

Heavy LLM models will not run inside the VPS.

---

## 32. Reverse proxy

Candidate technology:

    Caddy

Responsibilities:

- TLS;
- domain/subdomain routing;
- reverse proxy;
- automatic certificate renewal.

---

## 33. Environments

At minimum, the following must be distinguished:

    development
    production

Ideally, the following will be added:

    staging

before the real pilot.

Each environment should have its own credentials and integrations when feasible.

Real customer data should not be used for routine local testing.

---

## 34. Local development

The local environment should be able to start the required components with a simple experience.

Conceptual target:

    docker compose up -d
    pnpm dev

or equivalent.

Candidate local services:

    Redis
    auxiliary dependencies

The managed database may use a separate development project or a local instance according to a later decision.

---

## 35. CI

Continuous integration must progressively validate:

    lint
    typecheck
    unit tests
    integration tests
    build
    migration validation

No PR should depend solely on manual review.

---

## 36. Testing strategy

Several levels will be used.

### Unit tests

Isolated business rules.

Examples:

    calculate availability
    change pipeline stage
    validate handoff
    normalize messages

### Integration tests

Interaction between modules, database, and adapters.

### E2E

Critical flows.

First priority flow:

    message
    → agent
    → availability
    → appointment
    → confirmation

---

## 37. External adapters

External providers must live behind domain ports/interfaces.

Conceptual example:

    Domain
       │
       ▼
    MessagingPort
       │
       ├── MetaAdapter
       ├── EvolutionAdapter
       └── FutureAdapter

This principle also applies to:

    AI
    Calendar
    Email
    Storage
    Voice

---

## 38. Dependency principle

Core business logic should not directly import provider-specific SDKs when it can be avoided.

Preferred:

    Domain
      ↓
    Interface
      ↓
    Adapter
      ↓
    External SDK/API

Not:

    Domain
      ↓
    External SDK

This makes replacement, testing, and evolution easier.

---

## 39. Scalability

The MVP will not be designed for millions of users from day one.

It must, however, support progressive growth.

Expected path:

    1 API + 1 worker
            ↓
    more workers
            ↓
    separate web/api
            ↓
    dedicated VPS
            ↓
    additional managed services
            ↓
    separate components only when there is a real need

Kubernetes and microservices will not be adopted in anticipation of hypothetical scale.

---

## 40. Backup and recovery

Infrastructure must consider from the beginning:

- database backups;
- configuration recovery;
- environment variables backed up securely;
- backups of critical volumes;
- ability to rebuild servers from documentation and versioned infrastructure.

Code will remain in Git.

Persistent data must not depend solely on the VPS disk.

---

## 41. Pending decisions

Before or during the early phases, the following must be resolved:

    Initial WhatsApp provider
    initial AI model/provider
    exact embedding strategy if needed
    Google Calendar inside or after MVP
    observability provider
    CI/CD deployment strategy
    backup policy

Every significant decision must be documented in `docs/DECISIONS.md`.

---

## 42. Current constraints

During the MVP, the following will be deliberately avoided:

    microservices
    Kubernetes
    Kafka
    multi-region architectures
    self-hosted LLMs in production
    data warehouse
    full event sourcing
    complex CQRS
    service mesh
    unnecessarily distributed infrastructure

They may be evaluated later if a real problem justifies them.

---

## 43. Guiding principle

The architecture must be robust enough to evolve, but simple enough for a small team to understand, deploy, debug, and modify.

> Complexity should be introduced only when it solves a real and measurable problem.

# DECISIONS.md

## Purpose

This document records significant product and engineering decisions for **ia-business-platform**.

Its purpose is to preserve:

    what was decided
    why it was decided
    what alternatives existed
    what remains unresolved

This prevents important context from being lost as the project evolves.

---

# Decision status

Each decision uses one of these states:

    PROPOSED
    ACCEPTED
    SUPERSEDED
    REJECTED
    OPEN

---

# ADR-001 — Build as a multi-tenant SaaS from the beginning

**Status:** ACCEPTED

## Context

The first real use case is a dental office, but the intended product should later serve other businesses with similar lead, conversation and appointment workflows.

Building a single-business application first and retrofitting multi-tenancy later would require significant changes to data ownership, authorization and domain relationships.

## Decision

The application will be designed as multi-tenant from the beginning.

The primary tenant will be:

    Business

Operational entities will carry or derive a relationship to:

    business_id

Access will be validated through authenticated memberships.

Conceptually:

    User
      ↓
    BusinessMembership
      ↓
    Business

## Consequences

Positive:

- supports future SaaS expansion;
- establishes data isolation early;
- avoids a major future migration;
- aligns architecture with product vision.

Cost:

- authorization and testing become slightly more complex from day one.

---

# ADR-002 — Use a modular monolith for the initial backend

**Status:** ACCEPTED

## Context

The platform will contain multiple domains:

    contacts
    leads
    conversations
    appointments
    AI
    messaging
    automations
    analytics

The project needs clear boundaries but is being built by a small team and does not yet have traffic or organizational requirements that justify distributed services.

## Decision

Use a modular monolith for the MVP.

Domains will be separated internally, but will initially run as one backend application.

Asynchronous processing may run in separate worker processes.

## Rejected for now

    microservices
    service mesh
    Kubernetes
    distributed event infrastructure

## Consequences

Positive:

- simpler development;
- simpler deployments;
- easier debugging;
- lower infrastructure cost;
- easier transactions.

Future services may be extracted only when a measurable need exists.

---

# ADR-003 — Separate web, API and worker applications

**Status:** ACCEPTED

## Context

The frontend, synchronous API and background processing have different responsibilities and runtime behavior.

Running all responsibilities inside frontend request handlers would tightly couple the system and make long-running workloads harder to manage.

## Decision

Use separate applications:

    apps/web
    apps/api
    apps/worker

Responsibilities:

    web     user interface
    api     domain/API/webhooks
    worker  asynchronous jobs

## Consequences

The deployment is slightly more complex than a single Next.js application, but the boundaries are clearer and background work can scale independently.

---

# ADR-004 — Use Next.js + TypeScript for the web application

**Status:** ACCEPTED

## Context

The product requires an authenticated web dashboard containing:

- Inbox;
- CRM;
- agenda;
- settings;
- analytics;
- operational tools.

The development environment already has experience with Next.js.

## Decision

Use:

    Next.js
    TypeScript

for `apps/web`.

## Consequences

The frontend remains within the TypeScript ecosystem shared by the backend and packages.

Critical domain logic must not live exclusively in the frontend.

---

# ADR-005 — Use NestJS with Fastify for the API

**Status:** ACCEPTED

## Context

The backend is expected to grow across several domain modules and integrations.

A structured backend framework is desirable to keep module boundaries, dependency injection, testing and infrastructure adapters manageable.

## Decision

Use:

    NestJS
    Fastify adapter
    TypeScript

for `apps/api`.

## Consequences

Positive:

- structured modules;
- dependency injection;
- testability;
- TypeScript across the stack;
- clear fit for adapters and domain services.

Cost:

- more framework structure than a minimal HTTP server.

---

# ADR-006 — PostgreSQL is the primary system of record

**Status:** ACCEPTED

## Context

The product contains strongly related data:

    businesses
    memberships
    contacts
    leads
    conversations
    messages
    services
    staff
    availability
    appointments
    pipelines

Appointments and tenant isolation also benefit from constraints and transactions.

## Decision

Use PostgreSQL as the primary persistent database.

Critical business state will not use Redis, n8n or an external calendar as its source of truth.

## Consequences

The data model can use relational constraints, transactions and indexes to enforce consistency.

---

# ADR-007 — Use Supabase as managed infrastructure, not as the domain backend

**Status:** ACCEPTED

## Context

Supabase can provide managed PostgreSQL, authentication, storage and realtime.

The platform still requires application-specific domain rules, integrations, workers and authorization.

## Decision

Use Supabase primarily for:

    PostgreSQL
    Auth
    Storage when required
    Realtime when useful

The application backend remains the authority for business operations.

## Consequences

The project benefits from managed infrastructure without coupling all business logic to frontend-to-Supabase access patterns.

---

# ADR-008 — Use Redis + BullMQ for asynchronous jobs

**Status:** ACCEPTED

## Context

The application requires tasks such as:

- AI processing;
- outbound messaging;
- retries;
- delayed reminders;
- external synchronization;
- background workflows.

These should not block incoming webhooks or API requests.

## Decision

Use:

    Redis
    BullMQ

for the initial queue/worker architecture.

Redis will not be the source of truth for critical domain data.

## Consequences

The system gains:

- retries;
- delayed jobs;
- worker concurrency;
- background execution.

It introduces Redis as an operational dependency.

---

# ADR-009 — Process inbound webhooks asynchronously

**Status:** ACCEPTED

## Context

Messaging providers may retry requests if webhooks respond slowly.

AI and integration calls can take seconds and can fail transiently.

## Decision

Use the pattern:

    receive
    ↓
    validate
    ↓
    deduplicate
    ↓
    persist minimum required state
    ↓
    enqueue
    ↓
    respond
    ↓
    process asynchronously

## Consequences

Webhook endpoints remain fast and resilient.

The system must implement idempotency and job observability.

---

# ADR-010 — Provider-agnostic messaging layer

**Status:** ACCEPTED

## Context

The target market includes SMEs.

A single WhatsApp provider may not be ideal for every client because of cost, onboarding, operational requirements or provider policy.

## Decision

The core application will depend on a messaging abstraction, conceptually:

    MessagingProvider

Provider-specific payloads will be normalized before reaching the domain.

Potential adapters may include:

    Meta Cloud API
    Evolution API
    BSPs
    other providers

## Consequences

Changing or adding a provider should not require rewriting CRM, appointments, AI or conversation logic.

---

# ADR-011 — WhatsApp provider remains undecided

**Status:** OPEN

## Context

Meta Cloud API is an official option, but the product is intended for SMEs and onboarding/cost requirements need careful evaluation.

Alternative providers and WhatsApp Web based solutions may offer different tradeoffs.

## Decision required

Before M6 implementation, compare viable providers using:

- cost;
- onboarding;
- stability;
- compliance;
- number requirements;
- templates;
- webhooks;
- multimedia;
- support;
- Colombia availability;
- risk of blocking;
- portability;
- scale.

## Current rule

Do not write business logic that depends directly on Meta or any other provider while this decision is open.

---

# ADR-012 — Provider-agnostic AI layer

**Status:** ACCEPTED

## Context

Model quality, pricing and capabilities change frequently.

Different tasks may also benefit from different models.

## Decision

The application will expose an abstraction conceptually similar to:

    AIProvider

The core product will not depend directly on one LLM vendor.

The agent may request tools, but the backend will execute them.

## Consequences

Runtime providers can be changed or specialized by workload.

There is some additional adapter complexity.

---

# ADR-013 — AI does not directly mutate business state

**Status:** ACCEPTED

## Context

LLMs are probabilistic and can generate incorrect arguments or assumptions.

Critical operations such as booking cannot rely on free-form model output alone.

## Decision

The model may request tools such as:

    get_available_slots
    create_appointment
    update_contact
    request_human_handoff

The backend will:

1. validate arguments;
2. resolve the tenant;
3. enforce permissions;
4. execute domain rules;
5. persist state;
6. return the result.

## Consequences

The agent remains powerful without becoming the system of record.

---

# ADR-014 — Human handoff is a core product capability

**Status:** ACCEPTED

## Context

The AI cannot be assumed to correctly resolve every conversation.

Businesses require control over customer communication.

## Decision

Conversations will explicitly track AI/human control.

When human control is active, automated conversational responses must stop.

## Consequences

Worker logic must check conversation control before producing outbound AI responses.

---

# ADR-015 — Internal appointments remain the source of truth

**Status:** ACCEPTED

## Context

The product may later synchronize with Google Calendar or other external calendars.

Relying only on an external calendar would couple domain state to a third-party integration.

## Decision

Appointments will exist in ia-business-platform.

External calendars are integrations/synchronization targets.

## Consequences

The platform can continue operating even if calendar synchronization is unavailable.

Conflict and sync policies will require later definition.

---

# ADR-016 — n8n is an auxiliary integration tool

**Status:** ACCEPTED

## Context

n8n is useful for automation and external integrations.

However, placing critical product state and business rules inside n8n would make the platform harder to test, version and evolve.

## Decision

n8n may be used for:

    external integrations
    non-critical workflows
    customer-specific automation
    prototyping

n8n will not be:

    primary backend
    source of truth
    appointment engine
    tenant authorization layer

## Consequences

The product remains operational even if an auxiliary n8n workflow fails.

---

# ADR-017 — Initial production will use external AI APIs

**Status:** ACCEPTED

## Context

Current hardware is sufficient for application development and deployment but the VPS is not intended for heavy LLM inference.

Running production LLMs locally would add GPU, memory and operational requirements that are unnecessary for MVP validation.

## Decision

Use external AI APIs during the MVP.

Self-hosted inference may be evaluated later if cost, privacy or control justify it.

## Consequences

No dedicated GPU is required for the initial product.

Runtime AI cost becomes an operating cost that must be measured during pilots.

---

# ADR-018 — Initial deployment can use a single VPS plus managed Supabase

**Status:** ACCEPTED

## Context

Available infrastructure includes a VPS with approximately:

    4 vCPU
    8 GB RAM
    100 GB disk

The database/auth layer can remain managed externally through Supabase.

## Decision

For development, demos and early pilot stages, the application may run:

    VPS
    ├── Caddy
    ├── web
    ├── api
    ├── worker
    ├── Redis
    └── monitoring

with Supabase external.

Moni and this project may temporarily coexist if resources remain healthy.

## Future trigger

Separate production infrastructure when:

- either product becomes operationally critical;
- workload isolation is required;
- resource contention appears;
- deployments create unacceptable cross-product risk.

---

# ADR-019 — Avoid premature infrastructure complexity

**Status:** ACCEPTED

## Decision

The MVP will not introduce without demonstrated need:

    Kubernetes
    Kafka
    service mesh
    multi-region architecture
    microservices
    self-hosted production LLM cluster
    data warehouse
    complex CQRS
    full event sourcing

## Rationale

The project needs reliability and clean boundaries, not infrastructure designed for hypothetical scale.

---

# ADR-020 — Monorepo strategy

**Status:** OPEN

## Context

The planned repository contains:

    apps/web
    apps/api
    apps/worker
    packages/*

## Decision required

Choose:

- package manager;
- workspace mechanism;
- whether a build orchestrator such as Turborepo is justified.

## Evaluation criteria

- simplicity;
- workspace support;
- caching;
- CI;
- developer experience;
- compatibility with Next.js/NestJS;
- dependency management.

---

# ADR-021 — Database access layer / ORM

**Status:** OPEN

## Context

The platform needs:

- PostgreSQL;
- migrations;
- transactions;
- strong TypeScript support;
- explicit relational modeling;
- reliable constraints;
- testability;
- good developer ergonomics.

## Decision required

Evaluate suitable ORM/query-builder options before M2.

The tool must not prevent use of PostgreSQL features when necessary.

---

# ADR-022 — Runtime AI model/provider

**Status:** OPEN

## Context

Several AI models are available during development, but development subscriptions are separate from the production runtime architecture.

## Decision required

Choose runtime provider/model based on tests of:

- tool calling;
- structured output;
- instruction following;
- latency;
- pricing;
- availability;
- context requirements;
- reliability;
- privacy;
- failure behavior.

## Important

The runtime model may differ by task.

One model does not need to perform every AI workload.

---

# ADR-023 — Google Calendar integration timing

**Status:** OPEN

## Context

External calendar synchronization may be important for the first dental pilot, but internal appointments are already required.

## Decision required

Determine whether Google Calendar is:

    required for MVP pilot

or:

    post-MVP integration

This should be decided from actual workflow requirements of the first client.

---

# ADR-024 — Observability provider

**Status:** OPEN

## Context

Structured logs and health checks are required, but the external tooling for errors, logs and traces has not been selected.

## Requirements

At minimum the final solution must make visible:

- API errors;
- failed jobs;
- provider failures;
- webhook failures;
- exhausted retries;
- relevant correlation IDs.

---

# ADR-025 — Backup strategy

**Status:** OPEN

## Context

The project will rely on Git, Supabase and VPS-hosted services.

A production pilot requires documented recovery procedures.

## Decision required

Define:

- database backup expectations;
- VPS configuration backup;
- secrets recovery;
- Redis persistence expectations;
- volume backup;
- restore testing;
- provider snapshots if used.

---

# Decision backlog

Current unresolved decisions, roughly in implementation order:

    ADR-020 Monorepo strategy
    ADR-021 Database access layer / ORM
    ADR-022 Runtime AI model/provider
    ADR-011 WhatsApp provider
    ADR-023 Calendar integration timing
    ADR-024 Observability provider
    ADR-025 Backup strategy

Not all must be resolved before coding.

The decisions that directly affect M1 and M2 should be resolved first.

---

# How to add a decision

Use this structure:

    # ADR-XXX — Title

    Status: PROPOSED | ACCEPTED | SUPERSEDED | REJECTED | OPEN

    ## Context

    Why does this decision exist?

    ## Decision

    What are we doing?

    ## Alternatives

    What else was considered?

    ## Consequences

    What do we gain and what does it cost?

When a decision changes, do not erase its history.

Mark the old ADR as:

    SUPERSEDED

and reference the replacement decision.

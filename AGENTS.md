# AGENTS.md

## Project

**ia-business-platform**

Repository folder may currently be named:

    ai-business-platform

The product name is temporary. Do not rename the repository, package names, domains, or product identifiers unless explicitly requested.

---

## Purpose

This file defines the operating rules for AI coding agents working on **ia-business-platform**.

Agents must treat the repository documentation as part of the implementation contract.

Before making meaningful changes, read the relevant files in:

    docs/PROJECT.md
    docs/PRODUCT.md
    docs/MVP.md
    docs/ARCHITECTURE.md
    docs/ROADMAP.md
    docs/STATUS.md
    docs/DECISIONS.md

Do not assume the project is a generic chatbot, a dental-only application, or an n8n workflow collection.

It is a multi-tenant SaaS platform for AI-assisted lead handling, conversations, scheduling, follow-up, and human supervision.

---

# 1. Source of truth

Use the documentation according to these responsibilities:

    PROJECT.md       product vision and problem
    PRODUCT.md       functional product behavior
    MVP.md           current MVP scope and acceptance criteria
    ARCHITECTURE.md  technical architecture and boundaries
    ROADMAP.md       implementation order and milestones
    STATUS.md        what actually exists right now
    DECISIONS.md     architectural/product decisions and rationale
    AGENTS.md        rules for agents working in the repository

When code and documentation disagree:

1. do not silently choose one;
2. determine whether the implementation or documentation is stale;
3. make the smallest correct change;
4. update the relevant documentation when the repository state changes.

`STATUS.md` must describe reality, not intention.

---

# 2. Current phase

Current project phase:

    M2 — Domain and persistence

M1 — Technical base is complete.

The current implementation focus is the minimum persistent domain model,
database foundation, and multi-tenant authorization rules.

Agents must inspect `docs/STATUS.md` before assuming this is still true.

---

# 3. Architecture rules

The initial architecture is:

    Modular monolith
    +
    asynchronous workers

Planned application boundaries:

    apps/web
    apps/api
    apps/worker

Planned shared packages:

    packages/database
    packages/contracts
    packages/ai
    packages/messaging
    packages/config
    packages/shared

Do not introduce microservices unless an accepted ADR explicitly changes this architecture.

Do not introduce Kubernetes, Kafka, service mesh, full event sourcing, complex CQRS, or other distributed infrastructure without a documented and demonstrated need.

---

# 4. Technology direction

Accepted initial technologies include:

    Frontend        Next.js + TypeScript
    Backend         NestJS + Fastify
    Worker          Node.js
    Package manager pnpm 12
    Monorepo        pnpm workspaces
    Database        PostgreSQL
    ORM             Drizzle ORM + Drizzle Kit
    Managed infra   Supabase
    Queue           BullMQ
    Queue backend   Redis
    Reverse proxy   Caddy
    Deployment      Docker on VPS

Some choices are still intentionally open.

Always check `docs/DECISIONS.md` before selecting or changing significant infrastructure.

The following remain intentionally open:

- WhatsApp provider;
- runtime AI model/provider;
- observability provider;
- backup strategy;
- calendar integration timing.

Do not close an OPEN ADR implicitly through implementation.

If a task requires an unresolved decision, surface it explicitly and update the ADR when the decision is made.

---

# 5. Multi-tenancy is mandatory

The platform is multi-tenant from the beginning.

Primary tenant:

    Business

Operational data must belong to, or be safely derivable from, a business context.

Typical entities will include:

    business_id

Never trust an arbitrary `business_id` supplied by the frontend.

The backend must resolve and authorize tenant access through authenticated user membership.

Conceptually:

    Authenticated User
            ↓
    BusinessMembership
            ↓
    Business

Every feature touching tenant data must include isolation tests where appropriate.

A user from Business A must never be able to access Business B data.

---

# 6. Domain before provider

Core domain logic must not depend directly on external provider SDKs when an adapter boundary is appropriate.

Preferred direction:

    Domain
      ↓
    Port / Interface
      ↓
    Adapter
      ↓
    Provider SDK / API

This applies especially to:

    Messaging
    AI
    Calendar
    Email
    Storage
    Voice

Examples:

    MessagingProvider
    AIProvider
    CalendarProvider

Provider-specific payloads should be normalized before they reach the domain layer.

---

# 7. Messaging rules

WhatsApp is the initial channel, but the final provider is not yet decided.

Possible providers may include:

    Meta Cloud API
    Evolution API
    BSPs
    other viable providers

Do not spread provider-specific logic across the application.

Inbound provider payloads must be transformed into an internal message format.

Outbound messaging should go through a provider abstraction.

Assume webhook duplication can occur.

Inbound messages must be idempotent.

---

# 8. AI rules

The LLM is not the source of truth.

The model may:

- understand natural language;
- classify intent;
- generate responses;
- request tools;
- summarize context.

The model must not directly:

- write SQL;
- bypass authorization;
- create appointments without backend validation;
- invent availability;
- invent prices;
- mutate tenant state without tool execution;
- expose secrets.

Tool execution belongs to the application backend.

Conceptual flow:

    LLM requests tool
          ↓
    Backend validates
          ↓
    Tenant resolved
          ↓
    Business rules executed
          ↓
    State persisted
          ↓
    Result returned to LLM

The AI provider must remain replaceable.

Do not hardcode business logic around one specific model.

---

# 9. Human handoff is mandatory

AI automation must never prevent human intervention.

A conversation must support states where:

    AI controls conversation
    Human intervention is required
    Human controls conversation

While human control is active:

    automatic AI replies must stop

Workers must re-check control state before sending automated responses.

Avoid race conditions where AI and human operators respond simultaneously.

---

# 10. Appointment rules

Internal appointments are the platform source of truth.

External calendars are integrations, not the canonical booking store.

Before creating an appointment:

1. validate tenant;
2. validate contact/service/staff;
3. calculate availability;
4. re-check availability immediately before booking;
5. create the appointment transactionally where required;
6. emit the appropriate event;
7. confirm success before telling the end user the booking exists.

The AI may only say that an appointment is confirmed after backend confirmation.

---

# 11. Webhook processing

Prefer:

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
    respond quickly
    ↓
    process asynchronously

Avoid performing long AI or external-provider operations synchronously inside webhook handlers when they can be queued.

Webhook handlers must be safe against retries.

---

# 12. Background jobs

Use background processing for work such as:

    AI processing
    outbound messages
    reminders
    retries
    external synchronization
    delayed follow-up
    secondary event processing

Redis is not the source of truth for critical business state.

Persist critical data in PostgreSQL.

Jobs must be observable and idempotent where necessary.

Retries must not create duplicate messages, appointments, or state changes.

---

# 13. Error handling

Do not swallow errors.

External failures should be classified where practical:

    temporary
    permanent
    retryable
    requires human intervention

Add enough context to logs to diagnose failures.

Avoid logging secrets or unnecessary sensitive user data.

Use correlation identifiers where the architecture provides them.

---

# 14. Security

Minimum expectations:

- no secrets in Git;
- validate input at system boundaries;
- enforce authorization server-side;
- enforce tenant isolation;
- verify external webhook authenticity when supported;
- use least privilege;
- avoid exposing provider credentials to the browser;
- keep sensitive data out of logs;
- add rate limits where justified;
- validate all AI tool parameters.

The MVP is not a clinical record system.

Do not introduce medical histories, diagnoses, prescriptions, or other clinical-record functionality unless scope is explicitly changed.

---

# 15. Data model rules

Prefer general product terminology over vertical-specific terminology.

Use:

    Service
    StaffMember
    Appointment
    Contact
    Lead
    Conversation

Avoid embedding dental-specific names into core entities such as:

    DentalTreatment
    DentistAppointment
    DentalPatientLead

Vertical-specific behavior should be configuration, presets, or dedicated extension modules when justified.

---

# 16. API design

The backend owns business rules.

Frontend validation is useful for UX but never sufficient for correctness.

Endpoints should:

- validate inputs;
- derive authenticated identity;
- resolve tenant;
- enforce authorization;
- call domain/application services;
- return stable contracts.

Avoid leaking database models directly as public API contracts when doing so creates tight coupling.

---

# 17. Shared packages

Shared packages must have a clear purpose.

Do not turn `packages/shared` into a dumping ground.

Prefer:

    packages/contracts  cross-app DTOs/events/schemas
    packages/ai         AI provider abstractions/adapters
    packages/messaging  messaging abstractions/adapters
    packages/database   DB client/schema/migrations if chosen
    packages/config     validated configuration

Put code in `shared` only when no more specific domain/package is appropriate.

---

# 18. Testing expectations

Testing is part of implementation.

Prioritize tests for business rules and failure modes.

Important areas include:

    tenant isolation
    idempotency
    message normalization
    availability calculation
    appointment conflict prevention
    human handoff
    tool execution
    webhook duplication
    job retries
    authorization

Test levels:

### Unit

Pure business logic and transformations.

### Integration

Database, queues, modules, adapters.

### E2E

Critical user flows.

The most important future E2E flow is:

    message
    → conversation
    → AI
    → availability
    → appointment
    → confirmation

---

# 19. Quality gate

Once tooling exists, changes should pass the repository quality checks.

Expected categories:

    lint
    typecheck
    tests
    build
    migration validation

Do not report a change as complete if relevant checks are failing.

If a check cannot be run, state that explicitly.

---

# 20. Migrations

Database schema changes must be versioned.

Do not make undocumented manual production schema changes.

Migration changes should include validation/testing where practical.

Backward compatibility should be considered for migrations that affect active environments.

---

# 21. Documentation updates

Update documentation as part of implementation when the repository state changes.

Examples:

### Update `STATUS.md`

When:

- a milestone begins or ends;
- a major feature is added;
- deployment status changes;
- a blocker appears or is resolved.

### Update `DECISIONS.md`

When:

- an OPEN decision is resolved;
- a previous decision changes;
- a new significant architectural choice is introduced.

### Update `ARCHITECTURE.md`

When:

- component boundaries change;
- infrastructure changes materially;
- runtime responsibilities move.

### Update `ROADMAP.md`

When:

- milestones materially change.

Do not rewrite history in ADRs.

Use `SUPERSEDED` where appropriate.

---

# 22. Scope discipline

Before adding a feature, compare it against `MVP.md`.

A feature should not enter the MVP merely because:

- it is interesting;
- a provider supports it;
- another SaaS has it;
- an AI model suggested it;
- it may be useful someday.

Ask:

    Does it help validate the core flow?
    Does it unblock the current milestone?
    Is there evidence the pilot needs it?
    Can it safely wait?

---

# 23. Git workflow

Primary stable branch:

    main

Prefer short-lived branches for meaningful changes.

Examples:

    feat/bootstrap-monorepo
    feat/business-domain
    feat/appointment-engine
    feat/inbox
    feat/whatsapp-provider
    feat/ai-agent

    fix/message-idempotency
    fix/tenant-isolation

Do not create large unrelated change sets when smaller reviewable changes are possible.

---

# 24. Commit convention

Use concise conventional-style prefixes:

    feat:
    fix:
    docs:
    refactor:
    test:
    chore:
    perf:
    ci:

Examples:

    feat: add business membership model
    fix: prevent duplicate inbound messages
    test: cover appointment conflicts
    docs: record WhatsApp provider decision

---

# 25. Do not perform destructive actions casually

Do not:

- delete production data;
- rewrite Git history;
- force-push shared branches;
- reset databases;
- remove migrations;
- delete external resources;
- rotate production secrets;
- destroy infrastructure;

unless the task explicitly requires it and the impact is understood.

Prefer reversible changes.

---

# 26. Development approach

For substantial work:

1. inspect current documentation;
2. inspect relevant code;
3. identify the milestone and ADRs involved;
4. propose or implement the smallest coherent change;
5. add/update tests;
6. run relevant validation;
7. update documentation;
8. summarize what changed and any remaining risks.

Do not start implementing a large feature from assumptions when the repository contains the answer.

---

# 27. Agent review behavior

When reviewing code:

Prioritize findings by impact.

Focus especially on:

    security
    tenant isolation
    data corruption
    duplicate processing
    appointment consistency
    provider failure handling
    AI tool safety
    race conditions
    missing tests
    architecture boundary violations

Avoid spending most review effort on cosmetic preferences while correctness issues remain.

---

# 28. Development-model usage

Multiple AI models may be used during development for implementation or independent review.

Available development tools/models may change over time.

No agent should treat another model's answer as authoritative.

Repository documentation, code, tests, provider documentation, and verified behavior remain the source of truth.

For important architectural changes, independent review from another model may be useful, but the final decision must still be documented in `DECISIONS.md`.

---

# 29. Current highest-priority unresolved decisions

Check `docs/DECISIONS.md` for current status.

At project foundation, key OPEN decisions include:

    monorepo strategy
    database access layer / ORM
    runtime AI model/provider
    WhatsApp provider
    calendar integration timing
    observability provider
    backup strategy

Do not assume these are still open without checking the file.

---

# 30. Final rule

Optimize for:

    correctness
    clarity
    maintainability
    security
    operational simplicity
    measurable product value

not for novelty.

The system should be understandable and operable by a small team while remaining structurally capable of growing into a larger SaaS product.

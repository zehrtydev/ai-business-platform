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

**Status:** ACCEPTED

## Context

The planned repository contains:

    apps/web
    apps/api
    apps/worker
    packages/*

The project needs shared TypeScript packages and consistent dependency management, but it should avoid adding build-system complexity before it provides measurable value.

## Decision

Use:

    pnpm 12
    +
    pnpm workspaces

as the initial monorepo and package-management strategy.

The workspace will be defined through:

    pnpm-workspace.yaml

Local packages will use the `workspace:` protocol where appropriate.

Turborepo will **not** be introduced initially.

pnpm's native workspace and task-orchestration capabilities are sufficient for the first project stages.

A build orchestrator may be added later if CI duration, task dependency management, or caching becomes a measurable problem.

## Alternatives considered

### npm workspaces

Valid option, but pnpm provides stronger workspace ergonomics and dependency isolation for this repository.

### Turborepo from day one

Useful for task graphs and caching, but adds configuration that is not currently required for three applications and a small set of shared packages.

### Nx

Powerful, but more framework/tooling than the current project requires.

## Consequences

Positive:

- one package manager across the repository;
- native monorepo support;
- single lockfile;
- explicit workspace dependencies;
- minimal orchestration complexity;
- easy to introduce Turborepo later if justified.

Tradeoff:

- advanced remote caching is not available initially.

## Revisit triggers

Reconsider adding Turborepo or another orchestrator when:

- CI build time becomes significant;
- task ordering becomes difficult to manage;
- local/remote caching would provide measurable benefit;
- the number of applications/packages grows substantially.

---

# ADR-021 — Database access layer / ORM

**Status:** ACCEPTED

## Context

The platform requires:

- PostgreSQL;
- versioned migrations;
- transactions;
- strong TypeScript support;
- explicit relational modeling;
- reliable database constraints;
- access to PostgreSQL-specific features when required;
- transparent SQL for debugging and review;
- compatibility with Supabase;
- testability.

Appointment consistency, tenant isolation, idempotency, and concurrency may require database-level constraints and explicit SQL behavior.

## Decision

Use:

    Drizzle ORM
    +
    Drizzle Kit
    +
    PostgreSQL

as the initial application data-access and migration layer.

Application schemas will be defined in TypeScript.

Schema changes will use generated, version-controlled SQL migrations.

For shared application database code, the planned home is:

    packages/database

Drizzle will own migrations for the application-controlled PostgreSQL schemas/tables.

Supabase-managed internal schemas such as Auth must not be modified or treated as Drizzle-owned application schema.

## Migration policy

Development may use tooling for fast local iteration when appropriate, but committed schema evolution must be represented through migration files.

Production/staging schema changes must use reviewed migrations.

Do not use direct schema push as the production deployment mechanism.

Conceptually:

    schema change
       ↓
    drizzle-kit generate
       ↓
    review SQL migration
       ↓
    commit migration
       ↓
    apply migration

## Why Drizzle

Drizzle provides:

- direct PostgreSQL support;
- TypeScript schema definitions;
- SQL migration generation;
- transactions;
- relatively transparent SQL;
- the ability to use lower-level SQL when PostgreSQL-specific behavior is required;
- official PostgreSQL and Supabase setup paths.

This fits a domain where database correctness is more important than hiding SQL completely.

## Alternatives considered

### Prisma

Prisma remains a capable option and supports PostgreSQL, migrations, transactions, and lower-level SQL.

It was not selected initially because the project benefits from a thinner abstraction and direct visibility into SQL/constraints, especially for appointment concurrency and tenant-aware relational design.

The current Prisma major-version transition also introduces unnecessary tooling churn for a greenfield MVP.

### Kysely

Provides strong typed SQL and excellent control, but requires more surrounding migration/schema tooling decisions than Drizzle for the initial project.

### Raw SQL / node-postgres only

Provides maximum control but would require more manual type and migration infrastructure.

## Consequences

Positive:

- schema and queries stay close to PostgreSQL;
- migration SQL is reviewable;
- TypeScript types can derive from schema;
- advanced PostgreSQL features remain accessible;
- no need to make Supabase the application data-access layer.

Tradeoffs:

- developers must understand relational design and SQL;
- Drizzle exposes more database detail than higher-level ORMs;
- complex queries still require deliberate SQL/database knowledge.

## Revisit triggers

Reconsider the choice only if:

- Drizzle blocks a required PostgreSQL capability;
- migration tooling becomes unreliable for the project;
- operational evidence shows significant maintainability problems.

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

# ADR-026 — Authentication identity and business membership model

**Status:** ACCEPTED

## Context

M2 requires a stable relationship between authentication identity, application users, businesses, and tenant membership.

Supabase Auth owns authentication identities in the managed `auth` schema, while application-controlled domain data belongs in application tables.

The platform must support users belonging to one or more businesses without conflating authenticated users with schedulable staff members.

## Decision

Supabase Auth remains the source of truth for authentication identity.

Application user data will be represented by:

    public.app_users

The primary key of `app_users` is the same UUID as `auth.users.id`.

The application table references the Supabase-managed primary key with `ON DELETE CASCADE`, but Drizzle does not own or migrate the `auth` schema.

The root tenant entity is:

    public.businesses

Business access is represented by:

    public.business_memberships

Memberships connect an application user to a business and require one explicit role:

    owner
    admin
    member

Each user may have at most one membership per business.

`StaffMember` remains a separate domain concept. An authenticated application user is not automatically a schedulable staff member.

The backend derives and validates tenant context from the authenticated user and business membership. It must not trust a freely supplied frontend `business_id`.

Initial application tables have Row-Level Security enabled without client policies. Direct client access therefore remains default-deny while NestJS is the application authorization boundary.

## Consequences

Positive:

- authentication data remains owned by Supabase Auth;
- JWT subject UUIDs map directly to application users;
- users can belong to multiple businesses;
- tenant membership is explicit and constrained;
- business roles are database-constrained;
- accidental direct client access to application tables is denied by default;
- staff scheduling remains independent from SaaS account access.

Tradeoffs:

- application user rows must be provisioned for authenticated users that participate in the SaaS;
- role changes require explicit application logic;
- RLS policies will need to be designed later if direct authenticated Supabase data access is introduced.

---

# ADR-027 — Initial scheduling domain model

**Status:** ACCEPTED

## Context

M2 requires a scheduling model that can support services, schedulable staff, recurring availability, and future appointments without allowing relationships to cross tenant boundaries.

Availability also requires an explicit timezone context.

## Decision

Each business stores an IANA timezone identifier.

Initial scheduling entities are:

    Service
    StaffMember
    StaffService
    AvailabilityRule

All scheduling entities belong explicitly to a business.

Services define a positive duration in minutes and may be enabled or disabled.

Staff members are independent from authenticated application users. A staff member represents a schedulable service provider, not necessarily a SaaS account.

StaffService explicitly defines which staff members can provide which services.

AvailabilityRule defines recurring weekly availability for one staff member in the business timezone.

Weekdays use ISO numbering:

    1 = Monday
    2 = Tuesday
    3 = Wednesday
    4 = Thursday
    5 = Friday
    6 = Saturday
    7 = Sunday

Availability intervals require:

    start_time < end_time

Cross-tenant relationships are prevented at the database level with composite foreign keys that include `business_id`.

Row-Level Security remains enabled without direct client policies while NestJS is the authorization boundary.

## Consequences

Positive:

- scheduling data is tenant-scoped at the database level;
- staff/service assignments cannot cross businesses;
- availability cannot reference staff from another tenant;
- recurring weekly schedules are simple enough for the MVP;
- timezone interpretation is explicit;
- staff accounts remain independent from authenticated users.

Tradeoffs:

- overnight availability intervals are not represented by a single rule and must be split into two rules;
- exception dates, holidays, time off, and temporary overrides require later entities;
- service pricing is intentionally deferred from this scheduling-focused schema;
- IANA timezone validity is enforced by application validation rather than a database constraint.

# ADR-028 — Initial CRM and pipeline domain model

**Status:** ACCEPTED

## Context

M2 requires a tenant-safe CRM model for contacts and commercial opportunities.

The product must support multiple opportunities for the same contact and must evolve toward configurable pipelines rather than hardcoded sector-specific lead statuses.

## Decision

The initial CRM entities are:

    Contact
    Lead
    Pipeline
    PipelineStage

All CRM entities are tenant-scoped by `business_id`.

A Contact represents a person known to the business.

Initial contact information includes:

    name
    phone
    email
    source
    last interaction timestamp

At least one of name, phone, or email must be present.

Phone and email are indexed for tenant-scoped lookup but are not database-unique. Shared contact details are valid in some service-business workflows, and deduplication remains application logic.

A Pipeline belongs to one business and contains ordered PipelineStage records.

Pipeline stages use a positive integer position. Position is unique within each pipeline.

At most one pipeline may be marked as the default for a business.

Lead status is represented by the associated PipelineStage rather than a hardcoded status enum.

A Lead belongs to:

    one business
    one contact
    one pipeline stage

and may optionally reference one service of interest.

A contact may have multiple leads over time.

Cross-tenant relationships between leads, contacts, pipeline stages, pipelines, and services are prevented with composite foreign keys containing `business_id`.

Historical lead relationships are not cascade-deleted when contacts, stages, or services are removed. Application flows should normally deactivate referenced configuration instead of deleting it.

Row-Level Security remains enabled without direct client policies while NestJS is the authorization boundary.

## Consequences

Positive:

- CRM data is tenant-scoped at the database level;
- the same contact can have multiple commercial opportunities;
- pipelines are configurable by business;
- lead status is not tied to dentistry or another vertical;
- cross-tenant contact, stage, and service references are rejected by PostgreSQL;
- shared phone numbers or email addresses do not prevent valid contacts.

Tradeoffs:

- phone and email normalization and deduplication remain application responsibilities;
- the schema guarantees at most one default pipeline but not that a default always exists;
- deleting referenced contacts, stages, or services requires resolving their leads first;
- richer acquisition attribution and custom fields remain future work.

---

# ADR-029 — Appointment lifecycle and conflict prevention

**Status:** ACCEPTED

## Context

Appointments are an internal source of truth and must remain tenant-safe while preventing incompatible bookings under concurrent requests.

Application-level availability checks alone are insufficient because two requests may validate the same time slot before either writes its appointment.

## Decision

The initial appointment entity is:

    Appointment

Each appointment belongs to one business and references:

    Contact
    Service
    StaffMember

Appointments store absolute timestamps:

    starts_at
    ends_at

with the invariant:

    starts_at < ends_at

The initial lifecycle is:

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

`SCHEDULED` is the default state.

Cross-tenant contact, service, and staff relationships are prevented with composite foreign keys containing `business_id`.

Contact, service, and staff deletion does not cascade into appointment history. Referenced domain records must normally be retained or deactivated while appointments exist.

Business deletion remains cascading because the business is the tenant root.

PostgreSQL provides the final protection against double booking.

The migration enables the `btree_gist` extension and creates an exclusion constraint for scheduled appointments using:

    business_id WITH =
    staff_member_id WITH =
    tstzrange(starts_at, ends_at, '[)') WITH &&

The exclusion applies only while:

    status = 'SCHEDULED'

The half-open interval `[)` allows one appointment to begin exactly when another ends.

The backend must still calculate availability and revalidate before creating an appointment. The database exclusion constraint is the final concurrency guard, not a replacement for application validation.

The exclusion constraint and `btree_gist` extension are maintained as reviewed custom migration SQL because they are not represented in the current Drizzle schema snapshot. Future migrations that modify appointment scheduling columns must preserve this constraint explicitly.

Row-Level Security remains enabled without direct client policies while NestJS is the authorization boundary.

## Consequences

Positive:

- appointments cannot reference contact, service, or staff from another tenant;
- invalid zero-length or negative appointment ranges are rejected;
- concurrent scheduled appointments cannot overlap for the same staff member;
- cancelled appointments release their reserved interval;
- adjacent appointments are allowed;
- appointment history is protected from accidental cascade deletion.

Tradeoffs:

- the scheduling model currently requires a staff member for every appointment;
- generalized schedulable resources such as rooms or equipment remain future work;
- changing conflict semantics requires coordinated schema and migration changes;
- the exclusion constraint is PostgreSQL-specific;
- historical appointments remain linked to their original contact, service, and staff records.

---

# ADR-030 — Conversation and message persistence model

**Status:** ACCEPTED

## Context

M2 requires persistent conversations and messages that support the Inbox, human handoff, later AI processing, and provider webhook idempotency.

The product must remain independent from a specific messaging provider or channel.

## Decision

The initial messaging entities are:

    Conversation
    Message

Every conversation and message is explicitly tenant-scoped by `business_id`.

A Conversation belongs to one Contact and records:

    channel
    status
    optional assigned user
    ai_enabled

Initial conversation lifecycle states are:

    OPEN
    HUMAN_REQUIRED
    CLOSED

AI control is represented independently with `ai_enabled`.

The initial operational interpretation is:

    OPEN + ai_enabled=true  -> AI controlled
    OPEN + ai_enabled=false -> human controlled
    HUMAN_REQUIRED          -> AI paused
    CLOSED                  -> AI paused

Database constraints require `ai_enabled = false` whenever the conversation is not OPEN.

An optional assigned user must have a BusinessMembership in the same business. Assignment therefore cannot cross tenant boundaries.

`channel` remains text rather than a database enum so future channels can be introduced without coupling persistence to the first WhatsApp integration. Channel normalization is application logic.

A Message belongs to one Conversation and records:

    direction
    sender
    content
    message type
    optional provider message identifier

Initial directions are:

    INBOUND
    OUTBOUND

Initial senders are:

    CONTACT
    AI
    HUMAN

Initial persisted message type is:

    TEXT

The schema can later evolve for image, audio, video, document, and location payloads.

Inbound messages must use CONTACT as sender.

Outbound messages must use AI or HUMAN as sender.

Human-authored messages must reference an application user who has a BusinessMembership in the same business.

`provider_message_id` is nullable for internal or not-yet-sent messages. When present, it is unique within one business and may be used to reject duplicate provider deliveries.

The initial uniqueness scope assumes one provider message namespace per business. If one business later uses multiple providers whose identifiers can collide, idempotency will move to an integration/provider-scoped key.

Messages are durable conversation history. Application flows should not delete conversations during normal operation.

Row-Level Security remains enabled without direct client policies while NestJS is the authorization boundary.

## Consequences

Positive:

- conversations and messages are tenant-scoped at the database level;
- contacts and assigned users cannot cross businesses;
- human-authored messages are attributable to a valid business member;
- provider message identifiers support inbound webhook deduplication;
- human takeover can disable AI without closing the conversation;
- the persistence model is not tied to WhatsApp or a specific provider.

Tradeoffs:

- only TEXT payloads are modeled initially;
- channel normalization remains application logic;
- one active conversation per contact/channel is not enforced by the database;
- provider message uniqueness is business-scoped until integration identity is modeled;
- conversation `updated_at` must be maintained by application logic when activity occurs.

---

# ADR-031 — Database integration and tenant isolation test strategy

**Status:** ACCEPTED

## Context

M2 requires confidence that the complete PostgreSQL schema can be created from versioned migrations and that tenant-scoped relationships cannot cross business boundaries.

Manual validation against the development Supabase project was useful while designing the schema, but it is not sufficient as a repeatable regression test.

Tests must not depend on a shared development or production database.

## Decision

Database integration tests run against an ephemeral PostgreSQL 17.6 instance.

The test environment recreates the minimal external database structures required by repository migrations:

    auth.users
    extensions schema

This mirrors only the Supabase-owned structures required for migration execution. The application does not own the Supabase Auth schema.

Every repository SQL migration is applied from the beginning in filename order.

The integration suite verifies:

- all current application tables have Row-Level Security enabled;
- composite tenant foreign keys reject cross-business relationships;
- scheduling relationships cannot mix staff and services from different businesses;
- availability rules cannot reference staff from another business;
- CRM leads cannot reference contacts, stages, or services from another business;
- appointments cannot reference contacts, services, or staff from another business;
- overlapping scheduled appointments for the same staff member are rejected;
- adjacent half-open appointment ranges remain valid;
- conversations cannot reference contacts or assigned users from another business;
- messages cannot reference conversations or human senders from another business;
- duplicate provider message identifiers are rejected within one business;
- the same provider message identifier may exist in different businesses.

The test database name must contain `test` before the suite is allowed to reset schemas.

The CI quality gate starts a disposable PostgreSQL service and runs the same integration test through:

    pnpm test:db

The integration test validates database-level tenant integrity and schema behavior.

It does not replace authenticated tenant resolution or application authorization tests. Those remain separate backend responsibilities.

RLS is currently verified as enabled on application tables. Direct client RLS policies are intentionally absent while NestJS remains the authorization boundary.

## Consequences

Positive:

- all migrations are continuously tested from an empty PostgreSQL database;
- migration SQL failures are caught in CI rather than only by Drizzle metadata checks;
- tenant isolation constraints receive repeatable regression coverage;
- appointment exclusion behavior is covered automatically;
- CI does not require Supabase development credentials;
- tests cannot accidentally reset a normal database name.

Tradeoffs:

- the test creates a minimal Supabase Auth compatibility structure rather than booting the full Supabase stack;
- database-level isolation tests do not test backend authorization behavior;
- future migrations that depend on additional Supabase-managed structures must extend the test bootstrap intentionally.

---

# ADR-032 — Authenticated tenant resolution boundary

**Status:** ACCEPTED

## Context

M2 requires the backend to derive tenant context from an authenticated identity and its business memberships.

A valid external authentication token identifies a user, but it does not by itself authorize access to any business.

Users may belong to one or multiple businesses.

The client may need to select a business when more than one membership exists, but a client-supplied business identifier must never be treated as authorization.

## Decision

Tenant resolution is implemented as an application boundary in NestJS.

The resolver receives:

    authenticated user identity
    +
    optional requested business
            ↓
    verified BusinessMembership
            ↓
    TenantContext

`TenantContext` contains:

    userId
    membershipId
    businessId
    role

The authenticated user identifier is trusted only when supplied by the authentication layer.

Tenant resolution must never derive the authenticated user from a freely supplied request header or body field.

For a user with exactly one membership, that tenant may be resolved automatically.

For a user with multiple memberships, an explicit tenant selection is required.

A requested business identifier from the client is treated only as a selection candidate. Access is granted only if a matching `BusinessMembership` exists for the authenticated user.

A user with no membership, or a user requesting another business, is denied.

Membership lookup is implemented through the shared database package and queries `business_memberships` by authenticated user ID.

The HTTP tenant guard currently expects a previously verified `authenticatedUserId` on the request and may consume `x-business-id` as the tenant selection.

The guard does not verify Supabase tokens itself.

Supabase Auth token verification, login, logout, session handling, and route authentication belong to M3.

The tenancy module is therefore not registered globally until the authentication layer can populate authenticated identity correctly.

## Consequences

Positive:

- tenant authorization is separated from authentication provider details;
- client-controlled business IDs cannot independently grant access;
- multi-business users are supported explicitly;
- tenant context includes the verified membership role;
- database access remains centralized through the shared database package;
- future Supabase Auth integration can populate identity without changing tenant rules.

Tradeoffs:

- protected HTTP routes cannot use the tenant guard until authentication middleware or guards exist;
- multi-business clients must explicitly select a tenant;
- authorization remains application-controlled rather than delegated to direct Supabase table access.

---


# ADR-033 — Supabase Auth session boundary for the web application

**Status:** ACCEPTED

## Context

M3 requires login, logout, authenticated sessions, and protected private routes.

Supabase Auth is the selected identity provider, while application authorization and tenant access remain backend responsibilities.

The web application uses Next.js App Router and must support server-rendered authentication without exposing privileged Supabase credentials to the browser.

A session stored in browser-accessible cookies must not be trusted without cryptographic verification.

## Decision

The web authentication layer uses:

    Supabase Auth
          +
    @supabase/supabase-js
          +
    @supabase/ssr
          +
    Next.js server-side cookies

Only the project URL and Supabase publishable key are exposed to the web application.

No Supabase secret key or `service_role` credential is used by the browser or committed to the repository.

The web application provides request-specific Supabase clients for:

    browser components
    server components / server actions
    Next.js Proxy

The Next.js Proxy refreshes authentication state and propagates refreshed cookies and Supabase-provided cache headers.

Authenticated identity is established through:

    supabase.auth.getClaims()

`getClaims()` is the trusted identity boundary because it verifies the access token.

Server-side authorization decisions must not trust the user object returned only from:

    getSession()

Login uses email and password through:

    signInWithPassword()

Logout uses:

    signOut()

The initial private route is:

    /dashboard

Private pages independently verify authenticated identity before rendering.

The root route redirects to `/dashboard`, which in turn redirects unauthenticated requests to `/login`.

A small application abstraction converts verified Supabase claims into:

    VerifiedIdentity {
        userId
        optional email
    }

The `sub` claim is the authoritative authenticated user identifier.

Client-editable user metadata is not used for authorization.

The web authentication code must compile in CI without Supabase environment variables. Runtime authentication requires the environment configuration, but build-time compilation must not depend on development credentials.

The web application forwards authenticated requests to the NestJS API from
server-side application code.

Verified page identity continues to come from:

    supabase.auth.getClaims()

After identity verification, the server-side application may use:

    supabase.auth.getSession()

only to retrieve the current access token as an opaque transport credential.

The session user object returned by `getSession()` is not an authorization source.

The access token is forwarded as:

    Authorization: Bearer <access token>

to the server-only `API_BASE_URL`.

The backend remains the authority for tenant resolution:

    verified web identity
            ↓
    opaque access token transport
            ↓
    NestJS SupabaseAuthGuard
            ↓
    authenticatedUserId
            ↓
    TenantResolver
            ↓
    TenantContext

The NestJS authentication layer populates `authenticatedUserId` only after token verification.

Tenant selection and business authorization continue to follow ADR-032.

The NestJS API verifies incoming Supabase access tokens through the Supabase Auth
`/auth/v1/user` endpoint using only:

    SUPABASE_URL
    SUPABASE_PUBLISHABLE_KEY

The backend does not require the Supabase JWT shared secret, `service_role`, or a
Supabase secret API key for user authentication.

The HTTP authentication chain is:

    Authorization: Bearer <access token>
            ↓
    SupabaseAuthGuard
            ↓
    Supabase Auth verification
            ↓
    authenticatedUserId
            ↓
    TenantContextGuard
            ↓
    verified BusinessMembership
            ↓
    TenantContext

The authentication guard is the only HTTP boundary that populates
`authenticatedUserId` from an external access token.

`x-business-id` remains only a tenant-selection candidate. It cannot establish
identity or grant membership.

The initial authenticated API foundation exposes:

    GET /auth/me
    GET /tenant/context

`/auth/me` proves the authenticated identity boundary.

`/tenant/context` proves the complete authentication-to-membership chain and
supports automatic resolution for a single membership or explicit selection for
multi-business users.

Invalid or expired credentials are rejected before tenant resolution. Supabase
Auth connectivity or configuration failures are treated as server-side failures
rather than fabricated authenticated identities.

## Consequences

Positive:

- authentication sessions work with Next.js server rendering;
- identity verification is separated from untrusted cookie contents;
- no privileged Supabase credential is exposed to the frontend;
- login and logout are implemented through server-side application flows;
- private pages verify identity before rendering;
- the authentication boundary maps directly to the existing tenant resolver;
- CI does not require live Supabase credentials to compile the web application.

Tradeoffs:

- Supabase Auth is currently in the request path for backend access-token verification;
- the web-to-API boundary now depends on the NestJS API being reachable from the Next.js server;
- local development requires valid server-side API and PostgreSQL runtime configuration;
- local JWKS verification may later reduce Auth-server verification latency after asymmetric signing is adopted and operationally validated;
- `@supabase/ssr` remains an external integration whose behavior must be checked against current Supabase documentation when upgraded.

---

# Decision backlog

Current unresolved decisions, roughly in implementation order:

    ADR-011 WhatsApp provider
    ADR-022 Runtime AI model/provider
    ADR-023 Calendar integration timing
    ADR-024 Observability provider
    ADR-025 Backup strategy

Not all must be resolved before coding.

Resolve decisions in implementation order, prioritizing ADR-011 for M6 and ADR-022 before M7 AI runtime integration.

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

---

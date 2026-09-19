# ROADMAP.md

## Status

Initial roadmap for **ia-business-platform**.

This document organizes development by phases and milestones. Its purpose is to define the execution order and prevent future functionality from entering the MVP prematurely.

The functional scope of the MVP is defined in `MVP.md`.

The candidate architecture is defined in `ARCHITECTURE.md`.

Final technical decisions must be recorded in `DECISIONS.md`.

---

# 1. Roadmap principle

Development will follow a sequence based on risk and dependency.

The priority will be to validate the core flow first:

    message
    → contact
    → conversation
    → AI
    → availability
    → appointment
    → confirmation
    → follow-up

Features that do not directly help validate this journey must wait.

---

# 2. General objective

Reach a real pilot where a business can:

1. receive a lead through WhatsApp;
2. identify it automatically;
3. register the conversation;
4. respond through AI;
5. check availability;
6. schedule an appointment;
7. confirm the appointment;
8. schedule a reminder;
9. allow human intervention;
10. visualize everything from the panel.

---

# 3. Main milestones

    M0  Project foundation
    M1  Technical base
    M2  Domain and persistence
    M3  Administrative dashboard
    M4  CRM + Inbox
    M5  Scheduling
    M6  Messaging integration
    M7  AI Agent
    M8  End-to-end flow
    M9  Automations and reminders
    M10 Observability and hardening
    M11 Dental pilot
    M12 Product validation

---

# 4. M0 — Project foundation

## Objective

Establish documentation, scope, structure, and rules before developing functionality.

## Deliverables

- `PROJECT.md`
- `PRODUCT.md`
- `MVP.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `STATUS.md`
- `DECISIONS.md`
- `AGENTS.md`
- `README.md`

## Expected state

    Vision defined
    Scope defined
    Candidate architecture defined
    Roadmap defined
    Pending decisions identified

## Exit criterion

The project can begin implementation without major ambiguity about what is being built.

---

# 5. M1 — Technical base

## Objective

Initialize the monorepo and ensure that the basic components can be developed, tested, and executed.

## Tasks

### Monorepo

Create initial structure:

    apps/
    ├── web/
    ├── api/
    └── worker/

    packages/
    ├── database/
    ├── contracts/
    ├── ai/
    ├── messaging/
    ├── config/
    └── shared/

### Tooling

Define:

- package manager;
- monorepo manager;
- TypeScript;
- lint;
- formatter;
- testing;
- environment variables;
- common scripts.

### Applications

Initialize:

    Next.js
    NestJS + Fastify
    Node.js Worker

### Local infrastructure

Initially configure:

    Redis
    Docker Compose

### Health checks

Add:

    /health/live
    /health/ready

## Validation

    install
    lint
    typecheck
    tests
    build

must execute successfully.

## Exit criterion

All three applications can run and a minimum quality gate exists.

---

# 6. M2 — Domain and persistence

## Objective

Create the minimum data model and multi-tenant rules.

## Prior decisions

Resolve:

- ORM/query builder;
- migration strategy;
- development Supabase project;
- authentication scheme;
- initial membership model.

## Initial entities

    Business
    User / AuthUser mapping
    BusinessMembership

    Service
    StaffMember
    StaffService
    AvailabilityRule

    Contact
    Lead

    Pipeline
    PipelineStage

    Conversation
    Message

    Appointment

## Requirements

- all operational entities must belong to a business;
- the backend will resolve the tenant;
- the system will not trust a freely supplied frontend `business_id`;
- versioned migrations;
- basic constraints;
- consistent timestamps;
- support for external identifiers where appropriate.

## Priority testing

- tenant isolation;
- business creation;
- memberships;
- contacts;
- appointments;
- main relationships.

## Exit criterion

The core domain can be persisted consistently and securely.

---

# 7. M3 — Administrative dashboard

## Objective

Create the foundation of the application used by the business.

## Initial screens

    /login

    /dashboard

    /contacts

    /conversations

    /appointments

    /services

    /staff

    /settings

## Functions

### Authentication

- login;
- logout;
- route protection;
- session.

### Navigation

Create the main layout with access to modules.

### Initial dashboard

Show simple metrics, even if they initially come from test data or basic real data.

## Exit criterion

An authorized user can enter and navigate the private application.

---

# 8. M4 — CRM + Inbox

## Objective

Have a functional human operation even before adding AI.

## CRM

Implement:

- contact list;
- contact detail;
- associated lead;
- pipeline stage;
- service of interest;
- last interaction.

## Inbox

Implement:

- conversation list;
- conversation detail;
- messages;
- status;
- channel;
- AI/human control;
- handoff indicator.

## Internal messaging

Before connecting WhatsApp, it must be possible to simulate or create development messages to validate the experience.

## Human handoff

Implement base behavior:

    AI
    ↓
    HUMAN_REQUIRED
    ↓
    HUMAN
    ↓
    AI

## Exit criterion

The dashboard can represent a complete conversation and allow manual intervention.

---

# 9. M5 — Scheduling

## Objective

Build the internal source of truth for availability and appointments.

## Services

Minimum CRUD:

- create;
- edit;
- activate/deactivate;
- duration;
- optional price.

## Staff

Minimum CRUD:

- create;
- edit;
- activate/deactivate;
- assign services.

## Availability

Configure:

- day of week;
- start time;
- end time;
- staff member;
- service when applicable.

## Appointments

Implement:

- create;
- list;
- view;
- cancel;
- mark completed;
- mark no-show.

## Availability engine

Must consider:

    schedules
    +
    duration
    +
    existing appointments
    +
    staff member status

## Concurrency

Before creating an appointment, availability must be checked again.

## Exit criterion

The backend can reliably answer:

    What real time slots exist for this service and staff member?

and can reserve one while preventing basic conflicts.

---

# 10. M6 — WhatsApp research and integration

## Objective

Select and integrate the first messaging provider.

## Research phase

Compare at least:

    Meta Cloud API
    Evolution API
    relevant BSPs
    other viable options

## Comparison criteria

- cost;
- onboarding requirements;
- stability;
- legality and compliance;
- suitability for SMEs;
- ease of connection;
- support for existing numbers;
- webhooks;
- multimedia;
- templates;
- limits;
- blocking risk;
- operation in Colombia;
- scalability;
- support experience.

## Deliverable

Record a formal decision in:

    docs/DECISIONS.md

## Implementation

Create the first `MessagingProvider`.

The adapter must:

- receive webhook;
- normalize message;
- deduplicate;
- create/identify contact;
- create/retrieve conversation;
- persist message;
- enqueue processing;
- send outbound messages.

## Exit criterion

A real phone can send a message and it appears correctly in the Inbox.

---

# 11. M7 — AI Agent

## Objective

Add automatic conversational assistance without giving direct system control to the model.

## Decisions

Initially select:

- provider;
- model;
- prompt strategy;
- tool calling;
- context persistence;
- error policy;
- handoff policy.

The selection must be replaceable later.

## Business context

The agent must know:

- business;
- services;
- prices;
- staff;
- schedules;
- frequently asked questions;
- basic rules.

## Initial tools

    get_business_information
    get_services
    get_available_slots
    create_appointment
    get_contact
    update_contact
    update_lead
    request_human_handoff

## Rules

- do not invent availability;
- do not invent prices;
- do not create appointments without a tool;
- do not respond if control = HUMAN;
- escalate when appropriate.

## Evaluation

Create a set of test conversations.

Minimum cases:

    price question
    schedule question
    unknown service
    scheduling intent
    time-slot selection
    human request
    insufficient information
    ambiguous message

## Exit criterion

The agent can correctly handle basic cases and use controlled tools.

---

# 12. M8 — End-to-end flow

## Objective

Connect all components.

## Target scenario

    Patient
       ↓
    WhatsApp
       ↓
    Webhook
       ↓
    Contact
       ↓
    Conversation
       ↓
    Persisted message
       ↓
    Queue
       ↓
    Worker
       ↓
    AI Agent
       ↓
    get_available_slots
       ↓
    Patient selects
       ↓
    create_appointment
       ↓
    Appointment
       ↓
    Pipeline
       ↓
    WhatsApp confirmation
       ↓
    Dashboard

## Tests

Test using real phones.

Validate:

- single message;
- consecutive messages;
- duplicate webhooks;
- delayed provider response;
- temporary AI provider outage;
- time slot becoming unavailable during conversation;
- human intervention;
- AI resumption.

## Exit criterion

The complete scenario works repeatedly without technical intervention.

This milestone represents the first functional product core.

---

# 13. M9 — Automations and reminders

## Objective

Add minimum follow-up around the appointment.

## Initial automation

    appointment.created
            ↓
    create job
            ↓
    24 hours before
            ↓
    send reminder

## Requirements

- persistent jobs;
- retries;
- cancellation if appointment no longer applies;
- do not send reminders for cancelled appointments;
- traceability;
- idempotency.

## Additional optional MVP automations

Only if they do not delay the pilot:

    immediate confirmation
    additional configurable reminder
    handoff notification

## Exit criterion

An appointment automatically generates at least one valid reminder.

---

# 14. M10 — Observability and hardening

## Objective

Prepare the system for real operation.

## Observability

Implement:

- structured logs;
- request IDs;
- job IDs;
- correlation IDs;
- provider errors;
- failed jobs;
- health checks;
- readiness checks.

## Security

Review:

- auth;
- tenant isolation;
- secrets;
- webhooks;
- rate limiting;
- validation;
- permissions;
- sensitive logs.

## Resilience

Validate:

- timeouts;
- retries;
- backoff;
- idempotency;
- dead-letter strategy or equivalent;
- Redis failures;
- AI failures;
- messaging failures.

## CI

Minimum quality gate:

    lint
    typecheck
    unit tests
    integration tests
    build
    migration validation

## Exit criterion

The system can fail in a controlled way and incidents can be investigated.

---

# 15. M11 — Dental pilot

## Objective

Run ia-business-platform with the first real business.

## Preparation

Configure:

- business;
- services;
- staff;
- availability;
- commercial information;
- frequently asked questions;
- agent rules;
- messaging;
- administrator user.

## Phase 1 — Shadow mode

When appropriate:

    AI generates response
    but a human validates before sending

This may be used temporarily to evaluate behavior.

## Phase 2 — Controlled automation

Allow automatic responses in defined scenarios.

## Phase 3 — Normal operation

Automate the main flow while keeping handoff available.

## Metrics

Measure:

- leads;
- conversations;
- time to first response;
- appointments;
- conversion;
- handoffs;
- errors;
- manual interventions;
- messages corrected by humans.

## Exit criterion

The business uses the system in real operation and enough evidence exists to evaluate its value.

---

# 16. M12 — Product validation

## Objective

Determine what should happen after the pilot.

## Questions

    Did the platform reduce manual work?

    Did response time improve?

    Were fewer leads lost?

    Did the AI correctly handle basic questions?

    What percentage required a human?

    Was scheduling reliable?

    What features did the business actually request?

    Which parts were unnecessary?

    How much does operation cost per conversation/lead/appointment?

    Is the selected channel viable for other SMEs?

    Can the product be replicated in another vertical?

## Outcome

Decide among:

    iterate MVP
    expand dentistry
    add second business
    test second vertical
    change integration
    change model
    improve onboarding

---

# 17. Post-MVP — Candidate priorities

There is no final order yet.

The following features should only be prioritized after the pilot.

## Commercial follow-up

    lead without appointment
    ↓
    wait
    ↓
    follow-up

---

## Google Calendar

Bidirectional or controlled synchronization according to real needs.

---

## Configurable pipelines

Allow businesses to create their own stages.

---

## Custom fields

Adapt information by vertical.

---

## Advanced knowledge base

Sources such as:

    documents
    PDF
    web
    FAQs
    catalogs

---

## Instagram

Add a second channel.

---

## Webchat

Widget for websites.

---

## Campaigns

Segmented and compliant messaging.

---

## Recall

Reactivate customers according to time-based rules.

---

## Birthdays

Scheduled messages and optional promotions.

---

## Voice Agent

    Lead
    ↓
    AI call
    ↓
    conversation
    ↓
    scheduling

---

## Payments

Deposits or reservations where there is a real need.

---

## Self-service onboarding

Allow new businesses to configure the platform without technical assistance.

---

## SaaS billing

Plans, subscriptions, and limits.

---

## Vertical presets

Examples:

    Dentistry
    Aesthetics
    Veterinary
    Real estate
    Academy

---

# 18. Explicitly deferred features

These must not enter the MVP unless there is a formal scope change.

    native mobile app
    microservices
    Kubernetes
    Kafka
    multi-region
    complete white-label
    integration marketplace
    ERP
    billing
    clinical records
    medical diagnosis
    data warehouse
    advanced BI
    self-hosted production LLMs
    universal no-code builder

---

# 19. Branch and change strategy

Initially, the following is recommended:

    main

as the stable branch.

Each meaningful unit of work should be implemented through short-lived branches.

Examples:

    feat/bootstrap-monorepo
    feat/business-domain
    feat/inbox
    feat/appointments
    feat/whatsapp-provider
    feat/ai-agent
    fix/appointment-idempotency

Changes should be small and reviewable.

---

# 20. Commit convention

Candidate convention:

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

    feat: implement appointment availability

    fix: prevent duplicate inbound messages

    docs: document WhatsApp provider decision

    test: add tenant isolation coverage

---

# 21. Documentation during development

Documents must be updated alongside the code.

### `STATUS.md`

What currently exists.

### `DECISIONS.md`

Why technologies or approaches were chosen.

### `ROADMAP.md`

What comes next.

### `ARCHITECTURE.md`

How the system is structured.

### `MVP.md`

What belongs to the first version and what does not.

Outdated documentation must be considered a project defect.

---

# 22. Definition of Done

A task will not be considered complete merely because it works locally.

When applicable, it should include:

    implementation
    tests
    error handling
    typing
    documentation
    migration
    observability
    manual validation

Not every task will require every item, but each should be evaluated.

---

# 23. Immediate execution order

After completing the foundational documentation:

    1. Complete STATUS.md
    2. Create DECISIONS.md
    3. Complete AGENTS.md
    4. Complete README.md
    5. Resolve technical decisions required before bootstrap
    6. Initialize monorepo
    7. Configure CI
    8. Implement multi-tenant domain

---

# 24. Next decisions before coding

The first formal decisions should cover:

    ADR-001 Monorepo and package manager
    ADR-002 Backend framework
    ADR-003 Database access / ORM
    ADR-004 Supabase responsibilities
    ADR-005 Queue system
    ADR-006 Multi-tenancy strategy
    ADR-007 WhatsApp provider evaluation process
    ADR-008 AI provider abstraction

Not all of them need to be resolved on the same day.

Decisions with immediate implementation impact must be closed before implementing the affected component.

---

# 25. Rule for changing the roadmap

A phase may change when new evidence appears.

It must not change merely because an attractive technology or new idea appears.

Every relevant change must answer:

    What problem does it solve?

    Is it needed now?

    What milestone does it unblock?

    What cost does it add?

    Can it wait until after the pilot?

---

# 26. Immediate goal

The current goal is not to build every capability in the vision.

The immediate goal is to move from:

    documented repository

to:

    real message
    → real appointment
    → real dashboard

in the simplest, most maintainable, and most reliable way possible.

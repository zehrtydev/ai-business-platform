# MVP.md

## Status

Initial draft.

This document defines the minimum functional scope of the first usable version of **ia-business-platform**.

The project name is temporary.

---

## MVP objective

The MVP must demonstrate that the platform can manage the following process end to end:

    Lead
      ↓
    Message
      ↓
    Automatic assistance
      ↓
    Need identification
      ↓
    Conversation
      ↓
    Scheduling intent
      ↓
    Availability lookup
      ↓
    Time-slot selection
      ↓
    Appointment creation
      ↓
    Confirmation

The main objective is not to demonstrate that an AI can answer messages.

The objective is to demonstrate that a business can receive a lead through a messaging channel and convert it into an appointment registered inside the platform, with little or no human intervention.

---

## 1. Initial use case

The first real environment will be a dental office.

The main problem identified is:

> The business loses time answering messages and coordinating appointments manually, while some potential patients may remain unanswered or without follow-up.

The MVP must allow a patient to:

1. write to the office;
2. receive an automatic response;
3. ask for basic information;
4. express the intention to schedule;
5. see available time slots;
6. select a time slot;
7. confirm their information;
8. end with a registered appointment.

---

## 2. MVP scope

The MVP will consist of the following modules.

### 2.1 Authentication

The system must allow authorized users to access the administrative panel.

Minimum functions:

- sign in;
- sign out;
- maintain an authenticated session;
- protect private routes.

Public registration is not required for the MVP.

### 2.2 Business

The platform must support at least one organization or business.

Even if the pilot uses a single business, the data model must be prepared for multiple businesses.

Each business must have at least:

- name;
- general information;
- time zone;
- basic configuration;
- active/inactive status.

Operational entities must be associated with the business through an identifier such as:

    business_id

### 2.3 Users

A business may have authorized users who can access the system.

An advanced permission system is not required for the MVP.

Initially, it is sufficient to distinguish between:

    OWNER
    MEMBER

The design must allow roles to be expanded later.

---

## 3. Services

The business must be able to register the services it offers.

Each service must support at least:

    name
    description
    duration
    optional price
    active
    business_id

Initial example:

    Dental evaluation
    Duration: 30 minutes
    Price: $X

The AI may query these services to answer questions and guide the scheduling process.

---

## 4. Staff

The business must be able to register the people who provide services.

Each staff member must have at least:

    name
    active
    business_id

A staff member may be related to one or more services.

Example:

    Dr. Laura Pérez

    Services:
    - Evaluation
    - Cleaning
    - Orthodontics

---

## 5. Availability

The system must know when each staff member can provide service.

For the MVP, it must support:

- working days;
- start time;
- end time;
- staff-service relationship;
- service duration;
- existing appointments.

The backend must be responsible for determining actual availability.

The AI must never invent time slots.

Example:

    Staff member:
    Dr. Laura

    Service:
    Evaluation

    Availability:
    Monday 08:00 - 12:00
    Tuesday 14:00 - 18:00

---

## 6. Contacts

Every person who interacts with the business must be represented as a contact.

A contact must be able to store at least:

    id
    business_id
    name
    phone
    optional email
    source
    created_at
    updated_at

A message from a known number must be associated with the existing contact.

A message from an unknown number must allow a new contact to be created automatically.

---

## 7. Leads

A contact may become a lead when a commercial opportunity exists.

The lead must store at least:

    contact_id
    business_id
    pipeline_stage
    optional service_interest
    source
    status
    created_at
    updated_at

Contact and lead are not equivalent concepts.

    Contact
       ↓
    may become
       ↓
    Lead

This allows a person to exist in the platform even without an active commercial opportunity.

---

## 8. Pipeline

The MVP must make it possible to know the commercial status of each lead.

Initially, a simple pipeline may be used:

    NEW
      ↓
    CONTACTED
      ↓
    INTERESTED
      ↓
    APPOINTMENT_PROPOSED
      ↓
    APPOINTMENT_SCHEDULED
      ↓
    COMPLETED

Stages must belong to the business.

The architecture must later allow configurable pipelines.

A visual pipeline editor is not required in the MVP.

---

## 9. Conversations

Each interaction with a contact must be grouped into a conversation.

A conversation must record at least:

    business_id
    contact_id
    channel
    status
    optional assigned_to
    ai_enabled
    created_at
    updated_at

Possible initial states:

    OPEN
    HUMAN_REQUIRED
    CLOSED

The conversation must preserve its entire history.

---

## 10. Messages

All incoming and outgoing messages must be persisted.

Each message must record at least:

    conversation_id
    direction
    sender
    content
    message_type
    provider_message_id
    created_at

Directions:

    INBOUND
    OUTBOUND

Minimum type:

    TEXT

The architecture must later allow:

    IMAGE
    AUDIO
    VIDEO
    DOCUMENT
    LOCATION

without requiring all of them to be implemented during the MVP.

---

## 11. Inbox

The panel must provide a conversation inbox.

The user must be able to:

- view conversations;
- open a conversation;
- view messages;
- identify the contact;
- see the lead status;
- send messages manually;
- take control of the conversation;
- return control to the AI later.

It is not necessary to replicate the full WhatsApp visual experience.

The goal is to enable human supervision and operation.

---

## 12. Human Handoff

The system must support human intervention.

The AI may request help when:

- it cannot answer;
- it detects a sensitive request;
- the user asks to speak to a person;
- an error occurs;
- a configured rule requires it.

Expected flow:

    AI active
       ↓
    handoff requested
       ↓
    AI paused
       ↓
    conversation marked
       ↓
    human intervenes

Later:

    human finishes
       ↓
    AI may be reactivated

The AI must not continue sending messages while human control is active.

---

## 13. Messaging integration

The MVP must support at least one WhatsApp-based messaging channel.

The final provider remains pending research.

The application must not depend directly on a specific implementation.

A conceptual abstraction similar to the following will be used:

    MessagingProvider

with responsibilities such as:

    sendText
    receiveMessage
    markAsRead
    getMedia

Possible providers may include:

    Meta Cloud API
    Evolution API
    BSP
    other providers

The final choice will be documented in `DECISIONS.md`.

---

## 14. AI Agent

The system must include an agent capable of conversing with the lead.

The agent will have access to business context.

At minimum, it must know:

- business name;
- services;
- configured prices;
- staff members;
- schedules;
- frequently asked questions;
- basic policies;
- relevant commercial information.

The agent must be able to identify:

- intent;
- service interest;
- scheduling intent;
- request for human intervention.

---

## 15. Agent tools

The AI must not directly modify system state.

The platform must expose backend-controlled tools.

Conceptual examples:

    get_business_information()

    get_services()

    get_available_slots()

    create_appointment()

    get_contact()

    update_contact()

    update_lead()

    request_human_handoff()

The LLM may decide to request a tool.

The backend must:

1. validate parameters;
2. check permissions;
3. execute the operation;
4. persist changes;
5. return the result.

---

## 16. AI providers

The MVP must not be tightly coupled to a single model or provider.

An abstraction equivalent to the following will be used:

    AIProvider

The initially selected provider must be replaceable without changing business logic.

The specific model will be selected during implementation and may vary by task.

---

## 17. Scheduling

The system must have an internal representation of appointments.

An appointment must store at least:

    business_id
    contact_id
    service_id
    staff_member_id
    start_at
    end_at
    status
    source
    created_at
    updated_at

Minimum states:

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

The backend must prevent availability conflicts.

---

## 18. Scheduling flow

The minimum flow must work as follows:

    Patient
      ↓
    I want an evaluation
      ↓
    AI identifies service
      ↓
    Backend checks availability
      ↓
    AI presents time slots
      ↓
    Patient selects a time slot
      ↓
    Backend validates again
      ↓
    Backend creates appointment
      ↓
    Pipeline updated
      ↓
    AI confirms the appointment

Availability must be checked again before creating the appointment.

This prevents booking a time slot that became unavailable during the conversation.

---

## 19. Dashboard

The MVP must include an operational dashboard.

Advanced analytics are not required.

At minimum, it must show:

    Leads received
    Open conversations
    Appointments scheduled
    Conversations requiring a human

It may include a basic conversion metric:

    appointments scheduled / leads received

Metrics must be defined consistently before implementation.

---

## 20. Basic CRM

The user must be able to view registered contacts and leads.

At minimum, it must be possible to view:

    name
    phone
    source
    status
    service of interest
    last interaction
    associated appointment

A full CRM comparable to specialized platforms is not required.

The goal is to provide enough information to manage the initial commercial flow.

---

## 21. Reminders

The MVP must support at least basic appointment reminders.

Example:

    appointment.created
            ↓
    schedule reminder
            ↓
    24 hours before
            ↓
    send message

Execution must occur through asynchronous processing.

It must not depend on a user having the application open.

---

## 22. Asynchronous processing

Operations that do not require an immediate HTTP response must be able to run in the background.

Initial cases:

    message processing
    AI response
    message sending
    reminders
    retries
    events

The candidate architecture will use:

    Redis
    BullMQ
    Workers

The final decision will be recorded in `DECISIONS.md`.

---

## 23. Events

The system must be able to generate relevant internal events.

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

A complete event-streaming platform is not required.

The goal is to progressively decouple secondary actions from primary operations.

---

## 24. Realtime

The dashboard must reflect important changes without requiring constant manual reloads.

Priority cases:

    new message
    new conversation
    handoff requested
    appointment created

The implementation may initially use Supabase Realtime.

---

## 25. External integrations

The MVP may integrate an external calendar if needed for the pilot.

Google Calendar will be the first candidate.

However, the appointment must also exist inside the platform.

The external calendar must not be the only source of truth.

Conceptually:

    Internal Appointment
           ↓
    synchronization
           ↓
    Google Calendar

---

## 26. Automation

The MVP does not need a visual automation builder.

The first automations may exist as internal system rules.

Example:

    appointment.created
            ↓
    create reminder

Later, these rules may become configurable automations.

---

## 27. Security and isolation

Even if there is only one initial customer, the MVP must enforce multi-tenant isolation.

A user belonging to:

    Business A

must not be able to access data belonging to:

    Business B

`business_id` must never depend exclusively on information sent by the frontend.

The backend must determine and validate the corresponding tenant.

---

## 28. Basic auditing

Relevant actions must be traceable.

At minimum, it must be possible to determine:

    what happened
    when it happened
    which entity was involved
    which actor originated the action

An advanced user-visible auditing system is not required yet.

---

## 29. Observability

The application must have at least:

- structured logs;
- health check;
- readiness check;
- error logging;
- failed job identification;
- visibility into external integration errors.

Failures in external services must not disappear silently.

---

## 30. Out of scope for the MVP

The following features are explicitly outside the initial MVP:

    Instagram
    Facebook Messenger
    voice agents
    automated phone calls
    payments
    billing
    clinical records
    dental records
    prescriptions
    medical diagnosis
    mass campaigns
    advanced marketing automation
    automatic promotions
    birthdays
    six-month recall
    visual workflow builder
    visual pipeline builder
    native mobile app
    white-label
    integration marketplace
    advanced multilingual support
    advanced analytics
    data warehouse
    BI
    multi-region
    microservices
    Kubernetes
    self-hosted AI models

These features may become part of the future roadmap.

---

## 31. MVP acceptance criteria

The MVP will be considered functional when the following scenario can be completed end to end:

    1. A business is configured.

    2. At least one service exists.

    3. At least one staff member exists.

    4. Availability is configured.

    5. An external user sends a real message through WhatsApp.

    6. The system receives the message.

    7. The contact is created or identified.

    8. The conversation is registered.

    9. The message appears in the Inbox.

    10. The agent responds automatically.

    11. The user requests information about a service.

    12. The AI responds using configured business information.

    13. The user expresses scheduling intent.

    14. The AI checks availability through a tool.

    15. The backend returns valid time slots.

    16. The AI presents the options.

    17. The user selects a time slot.

    18. The backend validates availability again.

    19. The appointment is created.

    20. The lead changes stage.

    21. The confirmation is sent through WhatsApp.

    22. The appointment appears on the dashboard.

    23. The contact appears in the CRM.

    24. The conversation remains available in history.

    25. At least one reminder is scheduled.

    26. A human can take control of the conversation.

    27. The AI stops responding while human control is active.

If this scenario works consistently, the initial product core will be considered validated.

---

## 32. Non-functional criteria

The MVP must prioritize:

### Reliability

Messages and appointments must not depend exclusively on temporary memory.

Relevant data must be persisted.

### Idempotency

Webhooks, messages, and jobs may arrive more than once.

The system must avoid duplicating critical operations.

Especially:

    messages
    contacts
    appointments
    external events

### Retries

Temporary failures from external providers must be retryable when it is safe to do so.

### Security

Secrets and credentials must never be stored in the repository.

### Traceability

It must be possible to investigate why a conversation, message, or scheduling action failed.

### Progressive scalability

The architecture must allow capacity to increase without requiring the entire product to be rewritten.

The MVP does not need infrastructure designed for millions of users.

---

## 33. Initial metrics

During the pilot, at least the following must be observed:

    leads received
    conversations handled
    appointments scheduled
    human handoffs
    messaging errors
    agent errors
    time to first response

These metrics will help determine whether the automation is actually solving the business problem.

---

## 34. Hypotheses to validate

The MVP should help answer the following questions:

    Can the AI correctly handle frequently asked questions?

    Are users willing to schedule through an automated conversation?

    Does the system reduce manual work?

    Does the business trust the AI with basic conversations?

    Does human handoff work properly?

    Can scheduling remain consistent?

    Is the selected WhatsApp channel sufficiently stable and economically viable?

    Can the model be reused for other service businesses?

---

## 35. Pending decisions

The following decisions must be researched before or during implementation:

    WhatsApp provider
    Initial AI provider/model
    ORM or data access layer
    Exact calendar synchronization strategy
    Conversation retention policy
    Email provider
    Observability provider
    Final production infrastructure

Important decisions must be recorded in:

    docs/DECISIONS.md

---

## 36. Scope principle

During MVP development, the following rule will apply:

> A new feature does not automatically enter the MVP merely because it is useful or attractive.

To be included, it must demonstrate that it is necessary to validate the main flow:

    message
    → conversation
    → intent
    → availability
    → appointment
    → follow-up

Everything else may be added to the roadmap.

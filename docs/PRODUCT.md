# PRODUCT.md

## Status

Initial draft.

This document defines the product from a functional perspective: who uses it, what problems it solves, what modules exist, and how they should behave.

Technical decisions belong mainly in `ARCHITECTURE.md`.The minimum scope of the first version belongs in `MVP.md`.

---

## 1. Product

**ia-business-platform** is a multi-tenant SaaS platform for centralizing, automating, and supervising commercial attention for service businesses.

Its main function is to help convert incoming conversations into measurable outcomes, especially:

- appointments;
- opportunities;
- follow-ups;
- human interventions;
- customers.

The product combines:

    Channels
      +
    CRM
      +
    Scheduling
      +
    AI
      +
    Automations
      +
    Analytics

into a single operation.

---

## 2. Problem it solves

Many businesses receive leads through messaging channels but manage them manually and in a fragmented way.

Common problems:

- delayed responses;
- lost conversations;
- leads that go cold;
- appointments coordinated manually;
- information scattered across chats;
- little visibility into commercial status;
- inconsistent follow-up;
- dependence on one person to respond;
- lack of metrics;
- lack of continuity when the person in charge changes.

ia-business-platform aims to reduce these losses through a centralized, AI-assisted operation.

---

## 3. Initial target customer

The first customer will be a dental office.

However, the product will not be designed exclusively for dentistry.

The general target customer is:

> A service business that receives leads through digital channels and repeatedly needs to assist, qualify, schedule, or follow up.

Potential examples:

- dentistry;
- aesthetic medicine;
- physiotherapy;
- psychology;
- veterinary care;
- barbershops and salons;
- real estate agencies;
- academies;
- workshops;
- professional services;
- other businesses with customer-service and scheduling processes.

---

## 4. External end user

The external user is the person who contacts the business.

Depending on the vertical, they may be called:

    patient
    customer
    lead
    prospect
    interested person
    user

Within the product core, they will primarily be represented as:

    Contact

and, when a commercial opportunity exists:

    Lead

---

## 5. Internal users

### 5.1 Owner

The main person responsible for the business inside the platform.

Can:

- configure the business;
- manage users;
- manage services;
- manage staff;
- configure schedules;
- configure integrations;
- configure AI;
- review conversations;
- manage leads;
- review appointments;
- review metrics.

---

### 5.2 Member

Operational user.

May, according to future permissions:

- review conversations;
- respond manually;
- manage leads;
- view the schedule;
- handle handoffs;
- view contacts.

During the MVP, permissions will remain simple.

---

## 6. Core experience principle

The business should not need to learn AI concepts to use the system.

Configuration should be expressed in business terms.

Preferred:

    Services
    Schedules
    Staff
    Frequently asked questions
    Conversation objective
    Policies

Not:

    temperature
    top_p
    system tokens
    function schemas
    vector indexes

Technical details should remain hidden except in future advanced areas.

---

# 7. Product modules

## 7.1 Dashboard

Objective:

Provide a quick view of commercial and operational status.

Initial information:

- leads received;
- active conversations;
- appointments scheduled;
- conversations requiring a human;
- basic conversion;
- recent activity.

The dashboard should quickly answer:

    What is happening?
    What requires attention?
    How many opportunities are we converting?

It should not become an overloaded metrics panel during the MVP.

---

## 7.2 Inbox

Objective:

Centralize the business's conversations.

The inbox must allow users to:

- list conversations;
- identify the channel;
- see the contact;
- see the last message;
- know the status;
- know whether AI or a human is responding;
- identify conversations that require attention;
- open the full history;
- respond manually.

Conceptual example:

    Inbox

    [●] Carlos Pérez
        "I would like an evaluation tomorrow"
        WhatsApp · AI active · 2 min ago

    [!] Laura Gómez
        "I need to speak with someone"
        WhatsApp · Human required · 5 min ago

---

## 7.3 Conversation

The conversation view must combine:

    messages
    +
    contact information
    +
    commercial status
    +
    operational actions

Minimum actions:

- send message;
- take control;
- return control to AI;
- view service of interest;
- view lead status;
- view appointment;
- open the contact.

---

## 7.4 Human handoff

The business must always be able to intervene.

Conceptual states:

    AI_CONTROLLED
    HUMAN_CONTROLLED
    HUMAN_REQUIRED

Handoff cases:

- the user asks for a person;
- the AI does not have enough information;
- an exception occurs;
- the conversation contains a situation requiring review;
- an operator decides to intervene.

Rule:

> While the conversation is under human control, the AI must not respond automatically.

---

## 7.5 CRM

Objective:

Provide commercial context about each person.

The initial CRM must include:

    Contacts
    Leads
    Status
    Source
    Service of interest
    Last interaction
    Appointments

The initial goal is not to compete with a full enterprise CRM.

---

## 7.6 Contacts

Every identifiable person will be a contact.

Minimum information:

- name;
- phone;
- optional email;
- source;
- creation date;
- last interaction.

Later, it may include:

- tags;
- notes;
- custom fields;
- complete history;
- multiple channels;
- consent;
- preferences.

---

## 7.7 Leads

A lead represents a commercial opportunity associated with a contact.

The same contact may have different opportunities over time.

Future example:

    Contact:
    Ana Gómez

    Lead 1:
    Dental evaluation
    Closed

    Lead 2:
    Orthodontics
    Active

During the MVP, a simpler model may be used, but the design must not block this evolution.

---

## 7.8 Pipeline

Objective:

Show which commercial stage each lead is in.

Initial pipeline:

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

The platform must evolve toward configurable pipelines per business.

The pipeline must not depend on the dental sector.

---

## 7.9 Services

Each business can configure what it offers.

Candidate information:

    Name
    Description
    Duration
    Price
    Status
    Associated staff
    Instructions

Examples:

    Evaluation
    Cleaning
    Orthodontics
    Psychology consultation
    Real estate visit
    Technical diagnosis

---

## 7.10 Staff

Represents people who provide services or receive appointments.

Basic information:

- name;
- status;
- services;
- schedules;
- appointments.

Not every business will require individual staff members.

The architecture should later allow alternative resources such as:

    rooms
    equipment
    vehicles
    spaces

without including them in the MVP.

---

## 7.11 Scheduling

Objective:

Manage availability and appointments.

Functions:

- view schedule;
- configure availability;
- create appointment;
- cancel appointment;
- change status;
- prevent conflicts;
- relate the appointment to contact, service, and staff member.

Initial candidate views:

    Day
    Week
    List

A functional experience is sufficient during the MVP.

---

## 7.12 Appointments

An appointment must have a lifecycle.

Initial states:

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

Later, the following may be added:

    RESCHEDULED
    CONFIRMED
    PENDING_CONFIRMATION

The internal appointment will be the primary source of truth.

---

## 7.13 AI Agent

The agent is responsible for automatically handling conversations.

It must be able to:

- understand intent;
- answer questions;
- use business information;
- identify service of interest;
- collect missing data;
- check availability;
- propose time slots;
- create appointments through tools;
- update commercial context;
- request handoff.

It must not:

- invent prices;
- invent availability;
- modify the database directly;
- perform actions without backend validation;
- continue responding during a human handoff.

---

## 7.14 Business Knowledge

Each business must be able to provide knowledge to the agent.

Initial information:

- business description;
- services;
- prices;
- schedules;
- address;
- staff;
- frequently asked questions;
- policies;
- relevant commercial information.

Later, it may expand to:

- documents;
- web pages;
- catalogs;
- files;
- service-specific instructions.

---

## 7.15 AI configuration

The AI configuration visible to the business should remain simple.

Examples:

    Assistant name
    Tone
    Main objective
    Greeting
    When to escalate to a human
    Allowed information
    Restricted information

Technical model selection may remain under platform control.

---

## 7.16 Messaging

Messaging will be a shared product capability.

Initial channel:

    WhatsApp

Future channels:

    Instagram
    Facebook Messenger
    Webchat
    SMS
    Email
    Voice

The product must not assume every conversation comes from WhatsApp.

---

## 7.17 Integrations

The business may connect external services.

Candidates:

    WhatsApp providers
    Google Calendar
    Outlook Calendar
    Gmail
    CRMs
    n8n
    webhooks

Integrations must remain isolated from core product logic.

---

## 7.18 Automations

Objective:

Execute actions when something happens.

Example:

    appointment.created
          ↓
    schedule reminder

Another future example:

    lead.created
          ↓
    wait 2 hours
          ↓
    if there is no appointment
          ↓
    send follow-up

During the MVP, rules may be defined by the system.

Later, they may become configurable by the business.

---

## 7.19 Analytics

The system must measure real outcomes.

Initial metrics:

- leads received;
- conversations;
- appointments;
- conversion;
- handoffs;
- time to first response;
- errors.

Future metrics:

- conversion by channel;
- conversion by service;
- conversion by campaign;
- conversion by agent;
- no-show rate;
- lead recovery;
- attributed revenue;
- average time to close.

---

# 8. Main product flow

## 8.1 Entry

    External user
          ↓
    Channel
          ↓
    Message

---

## 8.2 Identification

    Message
       ↓
    Does contact exist?
       ├── Yes → use contact
       └── No → create contact

---

## 8.3 Conversation

    Contact
       ↓
    Create/retrieve conversation
       ↓
    Persist message

---

## 8.4 Assistance

    Human control?
       ├── Yes → do not run agent
       └── No
            ↓
          AI agent

---

## 8.5 Conversion

    AI identifies intent
            ↓
    Service
            ↓
    Availability
            ↓
    Options
            ↓
    Selection
            ↓
    Validation
            ↓
    Appointment

---

## 8.6 Confirmation

    Appointment created
            ↓
    Lead updated
            ↓
    Confirmation message
            ↓
    Reminder scheduled

---

# 9. Initial business journey

## 9.1 Onboarding

The business must progressively complete:

    Create account
       ↓
    Create/configure business
       ↓
    Register services
       ↓
    Register staff
       ↓
    Configure availability
       ↓
    Add knowledge
       ↓
    Connect messaging
       ↓
    Test agent
       ↓
    Activate

During the pilot, this process may be assisted manually.

Fully self-service onboarding is not required for the MVP.

---

## 9.2 Daily operation

Once configured:

    Open dashboard
            ↓
    Review activity
            ↓
    Handle handoffs
            ↓
    Review appointments
            ↓
    Review conversations if needed

The product's goal is to reduce, not increase, operational workload.

---

# 10. Initial lead journey

Dental example:

    Patient:
    Hi, I would like to know how much a cleaning costs.

    AI:
    Responds with valid information.

    Patient:
    Do you have availability tomorrow?

    AI:
    Checks real availability.

    System:
    Returns time slots.

    AI:
    Presents options.

    Patient:
    At 11:30.

    System:
    Validates time slot.

    System:
    Creates appointment.

    AI:
    Confirms.

    System:
    Schedules reminder.

This flow represents the core MVP experience.

---

# 11. UX principles

## 11.1 Clarity

The internal user must quickly understand what is happening.

Prioritize:

    status
    pending action
    responsible party
    result

---

## 11.2 Supervision

Automation must never feel invisible to the business.

The user must be able to review:

- what the AI responded;
- what actions it executed;
- what appointments it created;
- what conversations it escalated.

---

## 11.3 Control

The business may intervene whenever it considers necessary.

Automation does not mean loss of control.

---

## 11.4 Progressive configuration

The system should work with a reasonably small initial configuration.

It should not require dozens of screens before delivering value.

---

## 11.5 Mobile-friendly

The dashboard will be web-based but must work correctly on mobile devices.

A native app is not required for the MVP.

---

# 12. Product rules

## 12.1 AI does not invent operational data

Do not invent:

    prices
    schedules
    availability
    staff
    appointments
    policies

If the information does not exist:

    ask
    escalate
    or acknowledge that it is unavailable

---

## 12.2 Appointment must be confirmed by the backend

A model response saying:

> Your appointment has been scheduled.

may only be sent after the backend has confirmed the real creation of the appointment.

---

## 12.3 Human has priority

If a human takes control:

    conversational automation paused

---

## 12.4 Messages are recorded

Relevant messages in the flow must be persisted for:

- history;
- support;
- auditing;
- context;
- analytics.

---

## 12.5 Tenant is always defined

Every operational action must execute within the context of a business.

---

# 13. Important states

## Conversation

    OPEN
    HUMAN_REQUIRED
    CLOSED

Control:

    AI
    HUMAN

---

## Appointment

    SCHEDULED
    CANCELLED
    COMPLETED
    NO_SHOW

---

## Lead

Initial commercial status:

    NEW
    CONTACTED
    INTERESTED
    APPOINTMENT_PROPOSED
    APPOINTMENT_SCHEDULED
    COMPLETED

---

# 14. Notifications

During the MVP, notifications will focus on high-value events.

Examples:

- handoff required;
- critical integration error;
- appointment created;
- job exhausted retries.

A complete notification center is not required initially.

---

# 15. Operator actions

From the panel, a user will progressively be able to:

    view
    create
    edit
    reply
    take control
    close
    cancel
    reschedule
    query

Specific actions will depend on the module.

---

# 16. Business settings

Candidate area:

    Settings
    ├── Business
    ├── Users
    ├── Services
    ├── Staff
    ├── Availability
    ├── AI Agent
    ├── Integrations
    └── Messaging

Advanced configuration may appear later.

---

# 17. Multi-industry design

The product must avoid dental-specific names in the core.

Prefer:

    Service

instead of:

    DentalTreatment

Prefer:

    StaffMember

instead of:

    Dentist

Prefer:

    Appointment

instead of:

    DentalAppointment

Specialization should come through configuration or vertical modules.

---

# 18. Verticals

A vertical may provide:

- presets;
- terminology;
- automations;
- fields;
- templates;
- knowledge;
- specific integrations.

Future example:

    Vertical: Dentistry

    Preset:
    - evaluation
    - cleaning
    - orthodontics
    - follow-up reminder

This must not change the core.

---

# 19. Important future features

These are not necessarily part of the MVP, but they are part of the vision.

### Omnichannel

    WhatsApp
    Instagram
    Web
    Email
    Voice

in a single inbox.

### Commercial follow-up

Automatically recover leads that did not convert.

### Post-sale

Maintain contact after the appointment or sale.

### Recall

Contact customers after configurable periods.

### Campaigns

Segment and contact groups of users under rules and consent.

### Voice Agent

Make or receive calls through AI.

### Payments

Allow deposits or payments related to services.

### Advanced Analytics

Measure attribution, performance, and return.

---

# 20. Expected differentiator

The product does not aim to differentiate itself only by:

> Having an AI chatbot.

The desired combination is:

    conversation
    +
    business context
    +
    real actions
    +
    CRM
    +
    scheduling
    +
    follow-up
    +
    human supervision
    +
    metrics

AI must be one part of the system, not the entire product.

---

# 21. Value indicators

The product will be valuable if it improves variables such as:

    lower response time
    fewer unattended leads
    more scheduled appointments
    less manual work
    better follow-up
    greater commercial visibility

These metrics must be measured during pilots.

---

# 22. Candidate primary metric

The main product metric during the pilot will be:

    Leads that end in a scheduled appointment
    -----------------------------------------
                  Leads received

This metric must not be interpreted alone.

Also observe:

- volume;
- lead quality;
- handoffs;
- no-shows;
- errors;
- response time.

---

# 23. Product risks

## Over-automation

Trying to make AI solve situations where a person should intervene.

Mitigation:

    clear handoff
    policies
    limited tools
    supervision

---

## Poor configuration

An AI can only work correctly if the business provides valid information.

Mitigation:

- onboarding;
- validations;
- testing before activation;
- guided configuration.

---

## Channel dependency

Changes in WhatsApp or other providers may affect operations.

Mitigation:

    MessagingProvider + adapters

---

## Incorrect responses

The model may misinterpret or generate undesired information.

Mitigation:

- grounding;
- tools;
- restrictions;
- traceability;
- handoff;
- testing.

---

## Excessive complexity

Trying to build too many capabilities before validating the core flow.

Mitigation:

    MVP.md
    +
    ROADMAP.md
    +
    explicit scope criteria

---

# 24. Current non-goals

ia-business-platform is not initially intended to be:

- clinical software;
- medical record software;
- ERP;
- accounting software;
- payment gateway;
- billing system;
- complete call center;
- general-purpose enterprise CRM;
- universal no-code builder;
- complete marketing platform.

It may integrate with products in these categories in the future.

---

# 25. Definition of initial product success

The first version will be considered successful if a pilot business can:

1. configure its operation;
2. connect a real channel;
3. receive leads;
4. let AI handle basic conversations;
5. schedule appointments automatically;
6. intervene manually when necessary;
7. view contacts, conversations, and appointments;
8. receive reminders;
9. measure basic results;
10. use the system stably in real operations.

---

## 26. Guiding principle

> The product must automate repetitive work without taking visibility or control away from the business.

Every new feature should be evaluated according to whether it improves at least one of these dimensions:

    conversion
    efficiency
    follow-up
    control
    customer experience
    visibility

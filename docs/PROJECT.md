# PROJECT.md

## Temporary name

**ia-business-platform**

The name is temporary and is used to identify the project during its early design and development phases.

---

## Description

**ia-business-platform** is a multi-tenant SaaS platform focused on automating lead attention, conversion, scheduling, and follow-up through messaging channels and artificial intelligence.

The system aims to centralize a business's commercial conversations, automatically assist users, identify their needs, guide them toward a conversion action, and maintain follow-up throughout their lifecycle as a lead or customer.

The platform will not be tied to a specific industry.

The first use case will be a dental office, but the product core must later be adaptable to other service businesses such as:

- clinics and medical centers;
- aesthetic centers;
- veterinary clinics;
- psychology practices;
- physiotherapy practices;
- real estate agencies;
- academies;
- workshops;
- barbershops and salons;
- other businesses based on appointments, leads, or customer service.

---

## Problem

Many businesses receive potential customers through channels such as WhatsApp, Instagram, or web forms.

Management is usually manual and presents problems such as:

- delayed responses;
- unattended leads;
- scattered conversations;
- lost information;
- appointments managed manually;
- lack of follow-up;
- constant dependence on a phone;
- absence of conversion metrics;
- difficulty knowing the status of each opportunity.

As a result, the business can lose customers simply because it does not respond or follow up in time.

---

## Value proposition

ia-business-platform aims to turn commercial attention into a continuous and automated process.

Each lead can be:

1. received;
2. identified;
3. assisted;
4. qualified;
5. informed;
6. guided toward an action;
7. scheduled when appropriate;
8. registered in the CRM;
9. followed up automatically;
10. escalated to a person when necessary.

The goal is not simply to answer messages with AI.

The goal is to help the business turn conversations into measurable results.

---

## Conceptual flow

    Lead
      ↓
    Communication channel
      ↓
    Conversation
      ↓
    AI Agent
      ↓
    Need identification
      ↓
    Question resolution
      ↓
    Qualification
      ↓
    Conversion
      ↓
    Scheduling / commercial action
      ↓
    Follow-up
      ↓
    Customer

---

## Product principles

### 1. Multi-tenant from the start

The platform must support multiple businesses in isolation.

Each business will have its own:

- users;
- contacts;
- leads;
- conversations;
- services;
- staff members;
- appointments;
- pipelines;
- settings;
- automations;
- integrations.

---

### 2. Industry-independent core

The main domain must use general concepts.

Examples:

- Business
- Contact
- Lead
- Conversation
- Message
- Service
- StaffMember
- Appointment
- Pipeline
- Automation

Concepts specific to dentistry or other industries should be implemented as configuration or extensions of the core whenever possible.

---

### 3. AI as an agent, not as the source of truth

Artificial intelligence will be mainly responsible for:

- understanding messages;
- conversing;
- interpreting intent;
- collecting information;
- selecting tools;
- generating responses.

Critical operations must be executed and validated by the backend.

Examples:

- availability;
- appointment creation;
- data modification;
- lead status;
- permissions;
- automations.

---

### 4. Human intervention always available

The platform must allow a person to take control of a conversation.

The system will never assume that AI can solve every case.

---

### 5. Decoupled providers

The product must not depend directly on a single external provider.

This applies especially to:

- messaging;
- artificial intelligence;
- email;
- calendars;
- telephony;
- storage;
- external integrations.

Providers must connect through adapters or interfaces.

---

### 6. Event-based automation

Important internal actions may generate events.

Examples:

    lead.created
    message.received
    appointment.created
    appointment.cancelled
    lead.stage_changed
    conversation.handoff_requested

These events may trigger:

- notifications;
- tasks;
- follow-ups;
- integrations;
- asynchronous processes;
- analytics.

---

## First use case

The first real environment will be a dental office.

The main problem identified is:

> A large portion of the professional's time is spent answering WhatsApp messages and coordinating appointments manually.

The first implementation must allow a patient to start a conversation, resolve questions, and end with a scheduled appointment without human intervention when the case allows it.

---

## Initial objective

The first major functional objective is to complete the flow:

    WhatsApp
       ↓
    Message received
       ↓
    Contact identified
       ↓
    Conversation registered
       ↓
    AI responds
       ↓
    Patient wants to schedule
       ↓
    System checks availability
       ↓
    Patient selects a time
       ↓
    Appointment created
       ↓
    Pipeline updated
       ↓
    Confirmation sent

When this flow works end to end with a real user, the initial product core will be considered validated.

---

## Future scope

The platform may evolve toward functionality such as:

- multiple channels;
- Instagram;
- web forms;
- voice agents;
- campaigns;
- reminders;
- lead recovery;
- post-sale follow-up;
- customer reactivation;
- promotions;
- payments;
- CRM integrations;
- multiple locations;
- advanced analytics;
- configurable automations;
- specialized verticals.

These features are not necessarily part of the MVP.

---

## Vision

ia-business-platform aims to become an attention and conversion infrastructure for service businesses.

The long-term vision is for a company to configure its operation, connect its channels, and allow AI agents to manage a large portion of the commercial cycle while maintaining human supervision and full control over its data and processes.

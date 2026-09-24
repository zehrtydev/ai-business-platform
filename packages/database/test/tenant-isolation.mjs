import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';

import {
  createAppointmentForBusiness,
  updateAppointmentStatusForBusiness,
  getAppointmentAvailableSlotsForBusiness,
  createDatabase,
  createDevelopmentInboundMessageForBusiness,
  createServiceForBusiness,
  getContactDetailForBusiness,
  getConversationDetailForBusiness,
  getDashboardSummary,
  listBusinessMembershipsForUser,
  listContactsForBusiness,
  listConversationsForBusiness,
  listServicesForBusiness,
  requestConversationHandoffForBusiness,
  resumeConversationAiForBusiness,
  setServiceActiveForBusiness,
  takeOverConversationForBusiness,
  updateServiceForBusiness,
} from '../dist/index.js';

const connectionString = process.env.DATABASE_TEST_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_TEST_URL is required.');
}

const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
});

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(currentDirectory, '..', 'migrations');

async function waitForDatabase() {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      await sql`select 1`;
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error('Database did not become ready within 60 seconds.', {
    cause: lastError,
  });
}

async function resetDatabase() {
  const [database] = await sql`
    select current_database() as "name"
  `;

  assert(
    database.name.toLowerCase().includes('test'),
    `Refusing to reset non-test database "${database.name}".`,
  );

  await sql.unsafe('DROP EXTENSION IF EXISTS btree_gist CASCADE');
  await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await sql.unsafe('DROP SCHEMA IF EXISTS auth CASCADE');
  await sql.unsafe('DROP SCHEMA IF EXISTS extensions CASCADE');

  await sql.unsafe('CREATE SCHEMA public');
  await sql.unsafe('CREATE SCHEMA auth');
  await sql.unsafe('CREATE SCHEMA extensions');

  await sql.unsafe(`
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY
    )
  `);

  await sql.unsafe('SET search_path TO "$user", public, extensions');
}

async function applyMigrations() {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  assert(migrationFiles.length > 0, 'No database migrations found.');

  for (const migrationFile of migrationFiles) {
    const migration = await readFile(
      join(migrationsDirectory, migrationFile),
      'utf8',
    );

    const statements = migration
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.unsafe(statement);
    }
  }

  return migrationFiles;
}

async function verifyRls() {
  const expectedTables = [
    'app_users',
    'appointments',
    'availability_rules',
    'business_memberships',
    'businesses',
    'contacts',
    'conversations',
    'leads',
    'messages',
    'pipeline_stages',
    'pipelines',
    'services',
    'staff_members',
    'staff_services',
  ].sort();

  const rows = await sql`
    select c.relname as "name"
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
    order by c.relname
  `;

  assert.deepEqual(
    rows.map((row) => row.name).sort(),
    expectedTables,
    'All application tables must have RLS enabled.',
  );
}

async function verifyMembershipReader() {
  const userId = crypto.randomUUID();
  let businessA;
  let businessB;

  await sql`
    insert into auth.users (id)
    values (${userId}::uuid)
  `;

  await sql`
    insert into public.app_users (id, display_name)
    values (${userId}::uuid, 'Membership reader test')
  `;

  const [createdBusinessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Membership reader A', 'America/Bogota')
    returning id
  `;

  const [createdBusinessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Membership reader B', 'America/Bogota')
    returning id
  `;

  businessA = createdBusinessA.id;
  businessB = createdBusinessB.id;

  await sql`
    insert into public.business_memberships (
      business_id,
      user_id,
      role
    )
    values
      (${businessA}::uuid, ${userId}::uuid, 'owner'),
      (${businessB}::uuid, ${userId}::uuid, 'member')
  `;

  const database = createDatabase(connectionString);

  try {
    const memberships = await listBusinessMembershipsForUser(
      database.db,
      userId,
    );

    assert.equal(memberships.length, 2);

    assert.deepEqual(
      memberships.map((membership) => ({
        businessId: membership.businessId,
        role: membership.role,
      })),
      [
        {
          businessId: [businessA, businessB].sort()[0],
          role:
            [businessA, businessB].sort()[0] === businessA ? 'owner' : 'member',
        },
        {
          businessId: [businessA, businessB].sort()[1],
          role:
            [businessA, businessB].sort()[1] === businessA ? 'owner' : 'member',
        },
      ],
    );
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA}::uuid, ${businessB}::uuid)
  `;

  await sql`
    delete from auth.users
    where id = ${userId}::uuid
  `;
}

async function verifyContactList() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Contact list A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Contact list B', 'America/Bogota')
    returning id
  `;

  const [contactA1] = await sql`
    insert into public.contacts (
      business_id,
      name,
      phone,
      email,
      source,
      last_interaction_at,
      created_at
    )
    values (
      ${businessA.id}::uuid,
      'Contact A1',
      '+10000000001',
      'a1@example.com',
      'development',
      '2026-09-20T01:00:00Z',
      '2026-09-19T20:00:00Z'
    )
    returning id
  `;

  const [contactA2] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source,
      created_at
    )
    values (
      ${businessA.id}::uuid,
      'Contact A2',
      'development',
      '2026-09-19T21:00:00Z'
    )
    returning id
  `;

  const [contactB] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source,
      last_interaction_at
    )
    values (
      ${businessB.id}::uuid,
      'Contact B',
      'development',
      '2026-09-20T02:00:00Z'
    )
    returning id
  `;

  const [pipelineA] = await sql`
    insert into public.pipelines (
      business_id,
      name,
      is_default
    )
    values (
      ${businessA.id}::uuid,
      'Contact list pipeline A',
      true
    )
    returning id
  `;

  const [pipelineB] = await sql`
    insert into public.pipelines (
      business_id,
      name,
      is_default
    )
    values (
      ${businessB.id}::uuid,
      'Contact list pipeline B',
      true
    )
    returning id
  `;

  const [stageAOld] = await sql`
    insert into public.pipeline_stages (
      business_id,
      pipeline_id,
      name,
      position
    )
    values (
      ${businessA.id}::uuid,
      ${pipelineA.id}::uuid,
      'New',
      1
    )
    returning id
  `;

  const [stageANew] = await sql`
    insert into public.pipeline_stages (
      business_id,
      pipeline_id,
      name,
      position
    )
    values (
      ${businessA.id}::uuid,
      ${pipelineA.id}::uuid,
      'Qualified',
      2
    )
    returning id
  `;

  const [stageB] = await sql`
    insert into public.pipeline_stages (
      business_id,
      pipeline_id,
      name,
      position
    )
    values (
      ${businessB.id}::uuid,
      ${pipelineB.id}::uuid,
      'Other tenant stage',
      1
    )
    returning id
  `;

  const [serviceAOld] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (
      ${businessA.id}::uuid,
      'Cleaning',
      30
    )
    returning id
  `;

  const [serviceANew] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (
      ${businessA.id}::uuid,
      'Evaluation',
      60
    )
    returning id
  `;

  const [serviceB] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (
      ${businessB.id}::uuid,
      'Other tenant service',
      45
    )
    returning id
  `;

  await sql`
    insert into public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id,
      created_at,
      updated_at
    )
    values (
      ${businessA.id}::uuid,
      ${contactA1.id}::uuid,
      ${pipelineA.id}::uuid,
      ${stageAOld.id}::uuid,
      ${serviceAOld.id}::uuid,
      '2026-09-19T22:00:00Z',
      '2026-09-19T22:00:00Z'
    )
  `;

  const [latestLeadA] = await sql`
    insert into public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id,
      created_at,
      updated_at
    )
    values (
      ${businessA.id}::uuid,
      ${contactA1.id}::uuid,
      ${pipelineA.id}::uuid,
      ${stageANew.id}::uuid,
      ${serviceANew.id}::uuid,
      '2026-09-20T00:00:00Z',
      '2026-09-20T00:30:00Z'
    )
    returning id
  `;

  await sql`
    insert into public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id
    )
    values (
      ${businessB.id}::uuid,
      ${contactB.id}::uuid,
      ${pipelineB.id}::uuid,
      ${stageB.id}::uuid,
      ${serviceB.id}::uuid
    )
  `;

  const database = createDatabase(connectionString);

  try {
    const contactsA = await listContactsForBusiness(database.db, businessA.id);

    assert.equal(contactsA.length, 2);

    assert.deepEqual(
      contactsA.map((contact) => contact.id),
      [contactA1.id, contactA2.id],
    );

    assert.equal(contactsA[0].name, 'Contact A1');
    assert.equal(contactsA[0].phone, '+10000000001');
    assert.equal(contactsA[0].email, 'a1@example.com');
    assert.equal(contactsA[0].source, 'development');

    assert.deepEqual(contactsA[0].lead, {
      id: latestLeadA.id,
      pipelineStage: {
        id: stageANew.id,
        name: 'Qualified',
      },
      service: {
        id: serviceANew.id,
        name: 'Evaluation',
      },
    });

    assert.equal(contactsA[1].id, contactA2.id);
    assert.equal(contactsA[1].lead, null);

    const detailA = await getContactDetailForBusiness(
      database.db,
      businessA.id,
      contactA1.id,
    );

    assert(detailA);
    assert.equal(detailA.id, contactA1.id);
    assert.equal(detailA.name, 'Contact A1');
    assert.equal(detailA.phone, '+10000000001');
    assert.equal(detailA.email, 'a1@example.com');
    assert.equal(detailA.source, 'development');

    assert.deepEqual(
      detailA.lead
        ? {
            id: detailA.lead.id,
            pipelineStage: detailA.lead.pipelineStage,
            service: detailA.lead.service,
          }
        : null,
      {
        id: latestLeadA.id,
        pipelineStage: {
          id: stageANew.id,
          name: 'Qualified',
        },
        service: {
          id: serviceANew.id,
          name: 'Evaluation',
        },
      },
    );

    const contactWithoutLead = await getContactDetailForBusiness(
      database.db,
      businessA.id,
      contactA2.id,
    );

    assert(contactWithoutLead);
    assert.equal(contactWithoutLead.id, contactA2.id);
    assert.equal(contactWithoutLead.lead, null);

    const crossTenantContact = await getContactDetailForBusiness(
      database.db,
      businessA.id,
      contactB.id,
    );

    assert.equal(crossTenantContact, null);

    const invalidContactId = await getContactDetailForBusiness(
      database.db,
      businessA.id,
      'not-a-uuid',
    );

    assert.equal(invalidContactId, null);

    const contactsB = await listContactsForBusiness(database.db, businessB.id);

    assert.equal(contactsB.length, 1);
    assert.equal(contactsB[0].id, contactB.id);
    assert.equal(contactsB[0].lead?.pipelineStage.id, stageB.id);
    assert.equal(contactsB[0].lead?.service?.id, serviceB.id);

    const limitedContactsA = await listContactsForBusiness(
      database.db,
      businessA.id,
      1,
    );

    assert.equal(limitedContactsA.length, 1);
    assert.equal(limitedContactsA[0].id, contactA1.id);
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;
}

async function verifyConversationList() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Conversation list A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Conversation list B', 'America/Bogota')
    returning id
  `;

  const [contactA1] = await sql`
    insert into public.contacts (
      business_id,
      name,
      phone,
      source
    )
    values (
      ${businessA.id}::uuid,
      'Conversation Contact A1',
      '+10000000011',
      'development'
    )
    returning id
  `;

  const [contactA2] = await sql`
    insert into public.contacts (
      business_id,
      name,
      email,
      source
    )
    values (
      ${businessA.id}::uuid,
      'Conversation Contact A2',
      'conversation-a2@example.com',
      'development'
    )
    returning id
  `;

  const [contactB] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source
    )
    values (
      ${businessB.id}::uuid,
      'Conversation Contact B',
      'development'
    )
    returning id
  `;

  const [conversationA1] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled,
      created_at,
      updated_at
    )
    values (
      ${businessA.id}::uuid,
      ${contactA1.id}::uuid,
      'development',
      'HUMAN_REQUIRED',
      false,
      '2026-09-20T00:00:00Z',
      '2026-09-20T02:00:00Z'
    )
    returning id
  `;

  const [conversationA2] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled,
      created_at,
      updated_at
    )
    values (
      ${businessA.id}::uuid,
      ${contactA2.id}::uuid,
      'development',
      'OPEN',
      true,
      '2026-09-19T23:00:00Z',
      '2026-09-20T01:00:00Z'
    )
    returning id
  `;

  const [conversationB] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessB.id}::uuid,
      ${contactB.id}::uuid,
      'other-tenant-channel',
      'OPEN',
      true
    )
    returning id
  `;

  await sql`
    insert into public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content,
      created_at
    )
    values (
      ${businessA.id}::uuid,
      ${conversationA1.id}::uuid,
      'INBOUND',
      'CONTACT',
      'Older message',
      '2026-09-20T01:00:00Z'
    )
  `;

  const [middleMessageA1] = await sql`
    insert into public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content,
      created_at
    )
    values (
      ${businessA.id}::uuid,
      ${conversationA1.id}::uuid,
      'OUTBOUND',
      'AI',
      'Middle AI message',
      '2026-09-20T01:30:00Z'
    )
    returning id
  `;

  const [latestMessageA1] = await sql`
    insert into public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content,
      created_at
    )
    values (
      ${businessA.id}::uuid,
      ${conversationA1.id}::uuid,
      'INBOUND',
      'CONTACT',
      'Latest customer message',
      '2026-09-20T01:59:00Z'
    )
    returning id
  `;

  await sql`
    insert into public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content
    )
    values (
      ${businessB.id}::uuid,
      ${conversationB.id}::uuid,
      'INBOUND',
      'CONTACT',
      'Other tenant message'
    )
  `;

  const database = createDatabase(connectionString);

  try {
    const conversationsA = await listConversationsForBusiness(
      database.db,
      businessA.id,
    );

    assert.equal(conversationsA.length, 2);

    assert.deepEqual(
      conversationsA.map((conversation) => conversation.id),
      [conversationA1.id, conversationA2.id],
    );

    assert.deepEqual(conversationsA[0].contact, {
      id: contactA1.id,
      name: 'Conversation Contact A1',
      phone: '+10000000011',
      email: null,
    });

    assert.equal(conversationsA[0].channel, 'development');
    assert.equal(conversationsA[0].status, 'HUMAN_REQUIRED');
    assert.equal(conversationsA[0].aiEnabled, false);

    assert.deepEqual(
      conversationsA[0].latestMessage
        ? {
            id: conversationsA[0].latestMessage.id,
            direction: conversationsA[0].latestMessage.direction,
            sender: conversationsA[0].latestMessage.sender,
            content: conversationsA[0].latestMessage.content,
          }
        : null,
      {
        id: latestMessageA1.id,
        direction: 'INBOUND',
        sender: 'CONTACT',
        content: 'Latest customer message',
      },
    );

    assert.equal(conversationsA[1].id, conversationA2.id);
    assert.equal(conversationsA[1].latestMessage, null);

    const conversationDetailA1 = await getConversationDetailForBusiness(
      database.db,
      businessA.id,
      conversationA1.id,
    );

    assert(conversationDetailA1);
    assert.equal(conversationDetailA1.id, conversationA1.id);
    assert.equal(conversationDetailA1.status, 'HUMAN_REQUIRED');
    assert.equal(conversationDetailA1.aiEnabled, false);
    assert.deepEqual(conversationDetailA1.contact, {
      id: contactA1.id,
      name: 'Conversation Contact A1',
      phone: '+10000000011',
      email: null,
    });

    assert.deepEqual(
      conversationDetailA1.messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        sender: message.sender,
        content: message.content,
      })),
      [
        {
          id: conversationDetailA1.messages[0].id,
          direction: 'INBOUND',
          sender: 'CONTACT',
          content: 'Older message',
        },
        {
          id: middleMessageA1.id,
          direction: 'OUTBOUND',
          sender: 'AI',
          content: 'Middle AI message',
        },
        {
          id: latestMessageA1.id,
          direction: 'INBOUND',
          sender: 'CONTACT',
          content: 'Latest customer message',
        },
      ],
    );

    const conversationDetailA2 = await getConversationDetailForBusiness(
      database.db,
      businessA.id,
      conversationA2.id,
    );

    assert(conversationDetailA2);
    assert.deepEqual(conversationDetailA2.messages, []);

    const crossTenantConversation = await getConversationDetailForBusiness(
      database.db,
      businessA.id,
      conversationB.id,
    );

    assert.equal(crossTenantConversation, null);

    const invalidConversationId = await getConversationDetailForBusiness(
      database.db,
      businessA.id,
      'not-a-uuid',
    );

    assert.equal(invalidConversationId, null);

    const conversationsB = await listConversationsForBusiness(
      database.db,
      businessB.id,
    );

    assert.equal(conversationsB.length, 1);
    assert.equal(conversationsB[0].id, conversationB.id);
    assert.equal(
      conversationsB[0].latestMessage?.content,
      'Other tenant message',
    );

    const limitedConversationsA = await listConversationsForBusiness(
      database.db,
      businessA.id,
      1,
    );

    assert.equal(limitedConversationsA.length, 1);
    assert.equal(limitedConversationsA[0].id, conversationA1.id);
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;
}

async function verifyConversationHandoffWorkflow() {
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();

  await sql`
    insert into auth.users (id)
    values
      (${userA}::uuid),
      (${userB}::uuid)
  `;

  await sql`
    insert into public.app_users (id, display_name)
    values
      (${userA}::uuid, 'Handoff User A'),
      (${userB}::uuid, 'Handoff User B')
  `;

  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Handoff Business A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Handoff Business B', 'America/Bogota')
    returning id
  `;

  await sql`
    insert into public.business_memberships (
      business_id,
      user_id,
      role
    )
    values
      (${businessA.id}::uuid, ${userA}::uuid, 'owner'),
      (${businessA.id}::uuid, ${userB}::uuid, 'member')
  `;

  const [contactA] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source
    )
    values (
      ${businessA.id}::uuid,
      'Handoff Contact A',
      'development'
    )
    returning id
  `;

  const [contactB] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source
    )
    values (
      ${businessB.id}::uuid,
      'Handoff Contact B',
      'development'
    )
    returning id
  `;

  const [conversationA] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessA.id}::uuid,
      ${contactA.id}::uuid,
      'development',
      'OPEN',
      true
    )
    returning id
  `;

  const [conversationB] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessB.id}::uuid,
      ${contactB.id}::uuid,
      'development',
      'OPEN',
      true
    )
    returning id
  `;

  const database = createDatabase(connectionString);

  try {
    const crossTenantHandoff = await requestConversationHandoffForBusiness(
      database.db,
      businessA.id,
      conversationB.id,
    );

    assert.deepEqual(crossTenantHandoff, {
      kind: 'not_found',
    });

    const [untouchedConversationB] = await sql`
      select
        status,
        ai_enabled as "aiEnabled",
        assigned_to_user_id as "assignedToUserId"
      from public.conversations
      where id = ${conversationB.id}::uuid
    `;

    assert.deepEqual(
      {
        status: untouchedConversationB.status,
        aiEnabled: untouchedConversationB.aiEnabled,
        assignedToUserId: untouchedConversationB.assignedToUserId,
      },
      {
        status: 'OPEN',
        aiEnabled: true,
        assignedToUserId: null,
      },
    );

    const handoff = await requestConversationHandoffForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
    );

    assert.equal(handoff.kind, 'updated');

    if (handoff.kind !== 'updated') {
      throw new Error('Expected request handoff to update the conversation.');
    }

    assert.equal(handoff.conversation.status, 'HUMAN_REQUIRED');
    assert.equal(handoff.conversation.aiEnabled, false);
    assert.equal(handoff.conversation.assignedToUserId, null);

    const duplicateHandoff = await requestConversationHandoffForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
    );

    assert.deepEqual(duplicateHandoff, {
      kind: 'conflict',
    });

    const takeoverResults = await Promise.all([
      takeOverConversationForBusiness(
        database.db,
        businessA.id,
        conversationA.id,
        userA,
      ),
      takeOverConversationForBusiness(
        database.db,
        businessA.id,
        conversationA.id,
        userB,
      ),
    ]);

    const updatedTakeovers = takeoverResults.filter(
      (result) => result.kind === 'updated',
    );
    const conflictingTakeovers = takeoverResults.filter(
      (result) => result.kind === 'conflict',
    );

    assert.equal(
      updatedTakeovers.length,
      1,
      'Exactly one concurrent takeover must succeed.',
    );
    assert.equal(
      conflictingTakeovers.length,
      1,
      'Exactly one concurrent takeover must conflict.',
    );

    const successfulTakeover = updatedTakeovers[0];

    assert(successfulTakeover);
    assert.equal(successfulTakeover.kind, 'updated');

    if (successfulTakeover.kind !== 'updated') {
      throw new Error('Expected one takeover to succeed.');
    }

    assert.equal(successfulTakeover.conversation.status, 'OPEN');
    assert.equal(successfulTakeover.conversation.aiEnabled, false);
    assert(
      successfulTakeover.conversation.assignedToUserId === userA ||
        successfulTakeover.conversation.assignedToUserId === userB,
    );

    const winningUserId = successfulTakeover.conversation.assignedToUserId;

    const [persistedHumanState] = await sql`
      select
        status,
        ai_enabled as "aiEnabled",
        assigned_to_user_id as "assignedToUserId"
      from public.conversations
      where id = ${conversationA.id}::uuid
    `;

    assert.deepEqual(
      {
        status: persistedHumanState.status,
        aiEnabled: persistedHumanState.aiEnabled,
        assignedToUserId: persistedHumanState.assignedToUserId,
      },
      {
        status: 'OPEN',
        aiEnabled: false,
        assignedToUserId: winningUserId,
      },
    );

    const resumed = await resumeConversationAiForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
    );

    assert.equal(resumed.kind, 'updated');

    if (resumed.kind !== 'updated') {
      throw new Error('Expected resume AI to update the conversation.');
    }

    assert.equal(resumed.conversation.status, 'OPEN');
    assert.equal(resumed.conversation.aiEnabled, true);
    assert.equal(resumed.conversation.assignedToUserId, null);

    const duplicateResume = await resumeConversationAiForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
    );

    assert.deepEqual(duplicateResume, {
      kind: 'conflict',
    });

    await assert.rejects(
      () => sql`
        update public.conversations
        set
          ai_enabled = false,
          assigned_to_user_id = null
        where id = ${conversationA.id}::uuid
      `,
      (error) => error?.code === '23514',
      'Database constraint must reject OPEN + AI disabled + no assignee.',
    );

    const [finalConversation] = await sql`
      select
        status,
        ai_enabled as "aiEnabled",
        assigned_to_user_id as "assignedToUserId"
      from public.conversations
      where id = ${conversationA.id}::uuid
    `;

    assert.deepEqual(
      {
        status: finalConversation.status,
        aiEnabled: finalConversation.aiEnabled,
        assignedToUserId: finalConversation.assignedToUserId,
      },
      {
        status: 'OPEN',
        aiEnabled: true,
        assignedToUserId: null,
      },
    );
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;

  await sql`
    delete from auth.users
    where id in (${userA}::uuid, ${userB}::uuid)
  `;
}

async function verifyAppointmentCreationWorkflow() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Appointment Creation A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Appointment Creation B', 'America/Bogota')
    returning id
  `;

  const [contactA] = await sql`
    insert into public.contacts (business_id, name, source)
    values (
      ${businessA.id}::uuid,
      'Appointment Contact A',
      'test'
    )
    returning id
  `;

  const [contactB] = await sql`
    insert into public.contacts (business_id, name, source)
    values (
      ${businessB.id}::uuid,
      'Appointment Contact B',
      'test'
    )
    returning id
  `;

  const [serviceA] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (
      ${businessA.id}::uuid,
      'Appointment Service A',
      60
    )
    returning id
  `;

  const [serviceB] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (
      ${businessB.id}::uuid,
      'Appointment Service B',
      45
    )
    returning id
  `;

  const [inactiveService] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes,
      is_active
    )
    values (
      ${businessA.id}::uuid,
      'Inactive Appointment Service',
      30,
      false
    )
    returning id
  `;

  const [staffA] = await sql`
    insert into public.staff_members (business_id, name)
    values (
      ${businessA.id}::uuid,
      'Appointment Staff A'
    )
    returning id
  `;

  const [staffB] = await sql`
    insert into public.staff_members (business_id, name)
    values (
      ${businessB.id}::uuid,
      'Appointment Staff B'
    )
    returning id
  `;

  const [unlinkedStaff] = await sql`
    insert into public.staff_members (business_id, name)
    values (
      ${businessA.id}::uuid,
      'Unlinked Appointment Staff'
    )
    returning id
  `;

  const [inactiveStaff] = await sql`
    insert into public.staff_members (
      business_id,
      name,
      is_active
    )
    values (
      ${businessA.id}::uuid,
      'Inactive Appointment Staff',
      false
    )
    returning id
  `;

  await sql`
    insert into public.staff_services (
      business_id,
      staff_member_id,
      service_id
    )
    values (
      ${businessA.id}::uuid,
      ${staffA.id}::uuid,
      ${serviceA.id}::uuid
    )
  `;

  await sql`
    insert into public.availability_rules (
      business_id,
      staff_member_id,
      day_of_week,
      start_time,
      end_time,
      is_active
    )
    values (
      ${businessA.id}::uuid,
      ${staffA.id}::uuid,
      1,
      '09:00:00'::time,
      '17:00:00'::time,
      true
    )
  `;

  await sql`
    insert into public.staff_services (
      business_id,
      staff_member_id,
      service_id
    )
    values (
      ${businessA.id}::uuid,
      ${staffA.id}::uuid,
      ${inactiveService.id}::uuid
    )
  `;

  await sql`
    insert into public.staff_services (
      business_id,
      staff_member_id,
      service_id
    )
    values (
      ${businessA.id}::uuid,
      ${inactiveStaff.id}::uuid,
      ${serviceA.id}::uuid
    )
  `;

  await sql`
    insert into public.staff_services (
      business_id,
      staff_member_id,
      service_id
    )
    values (
      ${businessB.id}::uuid,
      ${staffB.id}::uuid,
      ${serviceB.id}::uuid
    )
  `;

  const database = createDatabase(connectionString);

  try {
    const startsAt = new Date('2099-09-21T14:00:00.000Z');

    const created = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt,
      },
    );

    assert.equal(created.kind, 'created');

    assert.equal(
      created.appointment.startsAt.toISOString(),
      '2099-09-21T14:00:00.000Z',
    );

    assert.equal(
      created.appointment.endsAt.toISOString(),
      '2099-09-21T15:00:00.000Z',
    );

    assert.equal(created.appointment.status, 'SCHEDULED');
    assert.equal(created.appointment.contactId, contactA.id);
    assert.equal(created.appointment.serviceId, serviceA.id);
    assert.equal(created.appointment.staffMemberId, staffA.id);

    const slotsAfterFirstAppointment =
      await getAppointmentAvailableSlotsForBusiness(database.db, businessA.id, {
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        date: '2099-09-21',
      });

    assert.equal(slotsAfterFirstAppointment.kind, 'available');

    assert.equal(
      slotsAfterFirstAppointment.availability.timezone,
      'America/Bogota',
    );

    assert.equal(
      slotsAfterFirstAppointment.availability.serviceDurationMinutes,
      60,
    );

    assert.equal(
      slotsAfterFirstAppointment.availability.slotIntervalMinutes,
      60,
    );

    const firstAppointmentSlotStarts =
      slotsAfterFirstAppointment.availability.slots.map((slot) =>
        slot.startsAt.toISOString(),
      );

    assert.equal(firstAppointmentSlotStarts.length, 7);

    assert.equal(firstAppointmentSlotStarts[0], '2099-09-21T15:00:00.000Z');

    assert.equal(firstAppointmentSlotStarts.at(-1), '2099-09-21T21:00:00.000Z');

    assert.equal(
      slotsAfterFirstAppointment.availability.slots.at(-1).endsAt.toISOString(),
      '2099-09-21T22:00:00.000Z',
    );

    assert.equal(
      firstAppointmentSlotStarts.includes('2099-09-21T14:00:00.000Z'),
      false,
    );

    assert.equal(
      firstAppointmentSlotStarts.includes('2099-09-21T14:15:00.000Z'),
      false,
    );

    assert.equal(
      firstAppointmentSlotStarts.includes('2099-09-21T14:30:00.000Z'),
      false,
    );

    assert.equal(
      firstAppointmentSlotStarts.includes('2099-09-21T14:45:00.000Z'),
      false,
    );

    assert.equal(
      firstAppointmentSlotStarts.includes('2099-09-21T15:00:00.000Z'),
      true,
    );

    const unavailableDaySlots = await getAppointmentAvailableSlotsForBusiness(
      database.db,
      businessA.id,
      {
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        date: '2099-09-22',
      },
    );

    assert.equal(unavailableDaySlots.kind, 'available');
    assert.equal(unavailableDaySlots.availability.slots.length, 0);

    const unsupportedStaffSlots = await getAppointmentAvailableSlotsForBusiness(
      database.db,
      businessA.id,
      {
        serviceId: serviceA.id,
        staffMemberId: unlinkedStaff.id,
        date: '2099-09-21',
      },
    );

    assert.deepEqual(unsupportedStaffSlots, {
      kind: 'configuration',
    });

    const crossTenantServiceSlots =
      await getAppointmentAvailableSlotsForBusiness(database.db, businessA.id, {
        serviceId: serviceB.id,
        staffMemberId: staffA.id,
        date: '2099-09-21',
      });

    assert.deepEqual(crossTenantServiceSlots, {
      kind: 'not_found',
    });

    const crossTenantStaffSlots = await getAppointmentAvailableSlotsForBusiness(
      database.db,
      businessA.id,
      {
        serviceId: serviceA.id,
        staffMemberId: staffB.id,
        date: '2099-09-21',
      },
    );

    assert.deepEqual(crossTenantStaffSlots, {
      kind: 'not_found',
    });

    const invalidDateSlots = await getAppointmentAvailableSlotsForBusiness(
      database.db,
      businessA.id,
      {
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        date: '2099-02-30',
      },
    );

    assert.deepEqual(invalidDateSlots, {
      kind: 'invalid',
    });

    const crossTenantContact = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactB.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(crossTenantContact, {
      kind: 'not_found',
    });

    const crossTenantService = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceB.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(crossTenantService, {
      kind: 'not_found',
    });

    const crossTenantStaff = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffB.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(crossTenantStaff, {
      kind: 'not_found',
    });

    const unsupportedService = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: unlinkedStaff.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(unsupportedService, {
      kind: 'conflict',
      reason: 'configuration',
    });

    const inactiveServiceResult = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: inactiveService.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(inactiveServiceResult, {
      kind: 'conflict',
      reason: 'configuration',
    });

    const inactiveStaffResult = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: inactiveStaff.id,
        startsAt: new Date('2099-09-21T16:00:00.000Z'),
      },
    );

    assert.deepEqual(inactiveStaffResult, {
      kind: 'conflict',
      reason: 'configuration',
    });

    const pastAppointment = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2020-09-21T14:00:00.000Z'),
      },
    );

    assert.deepEqual(pastAppointment, {
      kind: 'conflict',
      reason: 'past',
    });

    const unavailableDay = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-22T14:00:00.000Z'),
      },
    );

    assert.deepEqual(unavailableDay, {
      kind: 'conflict',
      reason: 'unavailable_day',
    });

    const outsideWorkingHours = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T22:00:00.000Z'),
      },
    );

    assert.deepEqual(outsideWorkingHours, {
      kind: 'conflict',
      reason: 'outside_hours',
    });

    const overlapping = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T14:30:00.000Z'),
      },
    );

    assert.deepEqual(overlapping, {
      kind: 'conflict',
      reason: 'overlap',
    });

    const adjacent = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T15:00:00.000Z'),
      },
    );

    assert.equal(adjacent.kind, 'created');

    assert.equal(
      adjacent.appointment.endsAt.toISOString(),
      '2099-09-21T16:00:00.000Z',
    );

    const slotsAfterAdjacentAppointment =
      await getAppointmentAvailableSlotsForBusiness(database.db, businessA.id, {
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        date: '2099-09-21',
      });

    assert.equal(slotsAfterAdjacentAppointment.kind, 'available');

    const adjacentSlotStarts =
      slotsAfterAdjacentAppointment.availability.slots.map((slot) =>
        slot.startsAt.toISOString(),
      );

    assert.equal(adjacentSlotStarts.length, 6);

    assert.equal(adjacentSlotStarts[0], '2099-09-21T16:00:00.000Z');

    assert.equal(adjacentSlotStarts.at(-1), '2099-09-21T21:00:00.000Z');

    const [counts] = await sql`
      select
        count(*) filter (
          where business_id = ${businessA.id}::uuid
        )::int as "businessA",
        count(*) filter (
          where business_id = ${businessB.id}::uuid
        )::int as "businessB"
      from public.appointments
    `;

    assert.deepEqual(counts, {
      businessA: 2,
      businessB: 0,
    });

    const cancelled = await updateAppointmentStatusForBusiness(
      database.db,
      businessA.id,
      created.appointment.id,
      'CANCELLED',
    );

    assert.equal(cancelled.kind, 'updated');
    assert.equal(cancelled.appointment.status, 'CANCELLED');

    const terminalTransition = await updateAppointmentStatusForBusiness(
      database.db,
      businessA.id,
      created.appointment.id,
      'COMPLETED',
    );

    assert.equal(terminalTransition.kind, 'conflict');
    assert.equal(terminalTransition.currentStatus, 'CANCELLED');

    const crossTenantStatusUpdate = await updateAppointmentStatusForBusiness(
      database.db,
      businessB.id,
      created.appointment.id,
      'COMPLETED',
    );

    assert.equal(crossTenantStatusUpdate.kind, 'not_found');

    const slotsAfterCancellation =
      await getAppointmentAvailableSlotsForBusiness(database.db, businessA.id, {
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        date: '2099-09-21',
      });

    assert.equal(slotsAfterCancellation.kind, 'available');

    assert.equal(
      slotsAfterCancellation.availability.slots.some(
        (slot) => slot.startsAt.toISOString() === '2099-09-21T14:00:00.000Z',
      ),
      true,
      'Cancelling an appointment must release its slot.',
    );

    const replacement = await createAppointmentForBusiness(
      database.db,
      businessA.id,
      {
        contactId: contactA.id,
        serviceId: serviceA.id,
        staffMemberId: staffA.id,
        startsAt: new Date('2099-09-21T14:00:00.000Z'),
      },
    );

    assert.equal(
      replacement.kind,
      'created',
      'A cancelled appointment must no longer block a replacement booking.',
    );

    if (replacement.kind === 'created') {
      await sql`
        delete from public.appointments
        where id = ${replacement.appointment.id}::uuid
      `;
    }
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (
      ${businessA.id}::uuid,
      ${businessB.id}::uuid
    )
  `;
}

async function verifyDevelopmentMessageSimulation() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Development messages A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Development messages B', 'America/Bogota')
    returning id
  `;

  const [contactA] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source
    )
    values (
      ${businessA.id}::uuid,
      'Development Message Contact A',
      'development'
    )
    returning id
  `;

  const [contactB] = await sql`
    insert into public.contacts (
      business_id,
      name,
      source
    )
    values (
      ${businessB.id}::uuid,
      'Development Message Contact B',
      'development'
    )
    returning id
  `;

  const [conversationA] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessA.id}::uuid,
      ${contactA.id}::uuid,
      'development',
      'OPEN',
      true
    )
    returning id
  `;

  const [nonDevelopmentConversationA] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessA.id}::uuid,
      ${contactA.id}::uuid,
      'whatsapp',
      'OPEN',
      true
    )
    returning id
  `;

  const [closedConversationA] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessA.id}::uuid,
      ${contactA.id}::uuid,
      'development',
      'CLOSED',
      false
    )
    returning id
  `;

  const [conversationB] = await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values (
      ${businessB.id}::uuid,
      ${contactB.id}::uuid,
      'development',
      'OPEN',
      true
    )
    returning id
  `;

  const database = createDatabase(connectionString);

  try {
    const created = await createDevelopmentInboundMessageForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
      '  Simulated inbound customer message.  ',
    );

    assert(created);
    assert.equal(created.conversationId, conversationA.id);
    assert.equal(created.direction, 'INBOUND');
    assert.equal(created.sender, 'CONTACT');
    assert.equal(created.senderUserId, null);
    assert.equal(created.content, 'Simulated inbound customer message.');
    assert.equal(created.messageType, 'TEXT');
    assert.equal(created.providerMessageId, null);

    const detail = await getConversationDetailForBusiness(
      database.db,
      businessA.id,
      conversationA.id,
    );

    assert(detail);
    assert.equal(detail.messages.length, 1);
    assert.equal(detail.messages[0].id, created.id);
    assert.equal(
      detail.messages[0].content,
      'Simulated inbound customer message.',
    );
    assert.equal(detail.updatedAt.getTime(), created.createdAt.getTime());

    const [contactAfterMessage] = await sql`
      select last_interaction_at as "lastInteractionAt"
      from public.contacts
      where business_id = ${businessA.id}::uuid
        and id = ${contactA.id}::uuid
    `;

    assert(contactAfterMessage?.lastInteractionAt);
    assert.equal(
      contactAfterMessage.lastInteractionAt.getTime(),
      created.createdAt.getTime(),
    );

    const crossTenant = await createDevelopmentInboundMessageForBusiness(
      database.db,
      businessA.id,
      conversationB.id,
      'Cross tenant message',
    );

    assert.equal(crossTenant, null);

    const nonDevelopment = await createDevelopmentInboundMessageForBusiness(
      database.db,
      businessA.id,
      nonDevelopmentConversationA.id,
      'Should not be accepted',
    );

    assert.equal(nonDevelopment, null);

    const closed = await createDevelopmentInboundMessageForBusiness(
      database.db,
      businessA.id,
      closedConversationA.id,
      'Should not be accepted',
    );

    assert.equal(closed, null);

    const invalidId = await createDevelopmentInboundMessageForBusiness(
      database.db,
      businessA.id,
      'not-a-uuid',
      'Invalid identifier',
    );

    assert.equal(invalidId, null);

    await assert.rejects(
      () =>
        createDevelopmentInboundMessageForBusiness(
          database.db,
          businessA.id,
          conversationA.id,
          '   ',
        ),
      /Message content is required/,
    );

    await assert.rejects(
      () =>
        createDevelopmentInboundMessageForBusiness(
          database.db,
          businessA.id,
          conversationA.id,
          'x'.repeat(4_001),
        ),
      /must not exceed 4000 characters/,
    );
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;
}

async function verifyServiceManagement() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Service management A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Service management B', 'America/Bogota')
    returning id
  `;

  const database = createDatabase(connectionString);

  try {
    const serviceA = await createServiceForBusiness(database.db, businessA.id, {
      name: '  Dental evaluation  ',
      description: '  Initial consultation  ',
      durationMinutes: 45,
      price: {
        minorUnits: 12_000_000,
        currencyCode: 'cop',
      },
    });

    assert.equal(serviceA.name, 'Dental evaluation');
    assert.equal(serviceA.description, 'Initial consultation');
    assert.equal(serviceA.durationMinutes, 45);
    assert.deepEqual(serviceA.price, {
      minorUnits: 12_000_000,
      currencyCode: 'COP',
    });
    assert.equal(serviceA.isActive, true);

    const serviceAWithoutPrice = await createServiceForBusiness(
      database.db,
      businessA.id,
      {
        name: 'Follow-up',
        durationMinutes: 30,
      },
    );

    assert.equal(serviceAWithoutPrice.description, null);
    assert.equal(serviceAWithoutPrice.price, null);
    assert.equal(serviceAWithoutPrice.isActive, true);

    const serviceB = await createServiceForBusiness(database.db, businessB.id, {
      name: 'Other tenant service',
      description: 'Must remain isolated',
      durationMinutes: 60,
      price: {
        minorUnits: 25_000,
        currencyCode: 'USD',
      },
    });

    const servicesA = await listServicesForBusiness(database.db, businessA.id);

    assert.equal(servicesA.length, 2);
    assert.deepEqual(
      servicesA.map((service) => service.id).sort(),
      [serviceA.id, serviceAWithoutPrice.id].sort(),
    );
    assert(
      servicesA.every((service) => service.id !== serviceB.id),
      'Business A must not list services from Business B.',
    );

    const servicesB = await listServicesForBusiness(database.db, businessB.id);

    assert.equal(servicesB.length, 1);
    assert.equal(servicesB[0].id, serviceB.id);

    const updatedA = await updateServiceForBusiness(
      database.db,
      businessA.id,
      serviceA.id,
      {
        name: '  Comprehensive evaluation  ',
        description: '   ',
        durationMinutes: 60,
        price: null,
      },
    );

    assert(updatedA);
    assert.equal(updatedA.id, serviceA.id);
    assert.equal(updatedA.name, 'Comprehensive evaluation');
    assert.equal(updatedA.description, null);
    assert.equal(updatedA.durationMinutes, 60);
    assert.equal(updatedA.price, null);
    assert.equal(updatedA.isActive, true);

    const crossTenantUpdate = await updateServiceForBusiness(
      database.db,
      businessA.id,
      serviceB.id,
      {
        name: 'Cross-tenant mutation',
        description: null,
        durationMinutes: 15,
        price: null,
      },
    );

    assert.equal(crossTenantUpdate, null);

    const crossTenantDeactivate = await setServiceActiveForBusiness(
      database.db,
      businessA.id,
      serviceB.id,
      false,
    );

    assert.equal(crossTenantDeactivate, null);

    const deactivated = await setServiceActiveForBusiness(
      database.db,
      businessA.id,
      serviceA.id,
      false,
    );

    assert(deactivated);
    assert.equal(deactivated.id, serviceA.id);
    assert.equal(deactivated.isActive, false);

    const reactivated = await setServiceActiveForBusiness(
      database.db,
      businessA.id,
      serviceA.id,
      true,
    );

    assert(reactivated);
    assert.equal(reactivated.id, serviceA.id);
    assert.equal(reactivated.isActive, true);

    const invalidIdUpdate = await updateServiceForBusiness(
      database.db,
      businessA.id,
      'not-a-uuid',
      {
        name: 'Invalid',
        description: null,
        durationMinutes: 30,
        price: null,
      },
    );

    assert.equal(invalidIdUpdate, null);

    const invalidIdActivation = await setServiceActiveForBusiness(
      database.db,
      businessA.id,
      'not-a-uuid',
      false,
    );

    assert.equal(invalidIdActivation, null);

    await assert.rejects(
      () =>
        createServiceForBusiness(database.db, businessA.id, {
          name: '   ',
          durationMinutes: 30,
        }),
      /Service name is required/,
    );

    await assert.rejects(
      () =>
        createServiceForBusiness(database.db, businessA.id, {
          name: 'Invalid duration',
          durationMinutes: 0,
        }),
      /positive integer/,
    );

    await assert.rejects(
      () =>
        createServiceForBusiness(database.db, businessA.id, {
          name: 'Invalid price',
          durationMinutes: 30,
          price: {
            minorUnits: -1,
            currencyCode: 'COP',
          },
        }),
      /non-negative safe integer/,
    );

    await assert.rejects(
      () =>
        createServiceForBusiness(database.db, businessA.id, {
          name: 'Invalid currency',
          durationMinutes: 30,
          price: {
            minorUnits: 10_000,
            currencyCode: 'CO',
          },
        }),
      /exactly three letters/,
    );

    const [persistedServiceB] = await sql`
      select
        name,
        description,
        duration_minutes as "durationMinutes",
        price_minor_units as "priceMinorUnits",
        currency_code as "currencyCode",
        is_active as "isActive"
      from public.services
      where id = ${serviceB.id}::uuid
    `;

    assert.deepEqual(persistedServiceB, {
      name: 'Other tenant service',
      description: 'Must remain isolated',
      durationMinutes: 60,
      priceMinorUnits: 25_000,
      currencyCode: 'USD',
      isActive: true,
    });

    await assert.rejects(
      () => sql`
        insert into public.services (
          business_id,
          name,
          duration_minutes,
          price_minor_units,
          currency_code
        )
        values (
          ${businessA.id}::uuid,
          'Invalid database price',
          30,
          1000,
          null
        )
      `,
      (error) => error?.code === '23514',
      'Database must reject an amount without a currency.',
    );
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;
}

async function verifyDashboardSummary() {
  const [businessA] = await sql`
    insert into public.businesses (name, timezone)
    values ('Dashboard summary A', 'America/Bogota')
    returning id
  `;

  const [businessB] = await sql`
    insert into public.businesses (name, timezone)
    values ('Dashboard summary B', 'America/Bogota')
    returning id
  `;

  const contacts = await sql`
    insert into public.contacts (business_id, name, source)
    values
      (${businessA.id}::uuid, 'Dashboard Contact 1', 'test'),
      (${businessA.id}::uuid, 'Dashboard Contact 2', 'test'),
      (${businessA.id}::uuid, 'Dashboard Contact 3', 'test')
    returning id
  `;

  const [pipeline] = await sql`
    insert into public.pipelines (business_id, name, is_default)
    values (${businessA.id}::uuid, 'Dashboard Pipeline', true)
    returning id
  `;

  const [stage] = await sql`
    insert into public.pipeline_stages (
      business_id,
      pipeline_id,
      name,
      position
    )
    values (
      ${businessA.id}::uuid,
      ${pipeline.id}::uuid,
      'Dashboard Stage',
      1
    )
    returning id
  `;

  const [service] = await sql`
    insert into public.services (
      business_id,
      name,
      duration_minutes
    )
    values (${businessA.id}::uuid, 'Dashboard Service', 30)
    returning id
  `;

  const [staff] = await sql`
    insert into public.staff_members (business_id, name)
    values (${businessA.id}::uuid, 'Dashboard Staff')
    returning id
  `;

  for (const contact of contacts) {
    await sql`
      insert into public.leads (
        business_id,
        contact_id,
        pipeline_id,
        pipeline_stage_id,
        service_id
      )
      values (
        ${businessA.id}::uuid,
        ${contact.id}::uuid,
        ${pipeline.id}::uuid,
        ${stage.id}::uuid,
        ${service.id}::uuid
      )
    `;
  }

  await sql`
    insert into public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    values
      (
        ${businessA.id}::uuid,
        ${contacts[0].id}::uuid,
        'WHATSAPP',
        'OPEN',
        true
      ),
      (
        ${businessA.id}::uuid,
        ${contacts[1].id}::uuid,
        'WHATSAPP',
        'OPEN',
        true
      ),
      (
        ${businessA.id}::uuid,
        ${contacts[2].id}::uuid,
        'WHATSAPP',
        'HUMAN_REQUIRED',
        false
      ),
      (
        ${businessA.id}::uuid,
        ${contacts[0].id}::uuid,
        'WHATSAPP',
        'CLOSED',
        false
      )
  `;

  await sql`
    insert into public.appointments (
      business_id,
      contact_id,
      service_id,
      staff_member_id,
      starts_at,
      ends_at,
      status
    )
    values
      (
        ${businessA.id}::uuid,
        ${contacts[0].id}::uuid,
        ${service.id}::uuid,
        ${staff.id}::uuid,
        '2026-10-02T14:00:00Z',
        '2026-10-02T14:30:00Z',
        'SCHEDULED'
      ),
      (
        ${businessA.id}::uuid,
        ${contacts[1].id}::uuid,
        ${service.id}::uuid,
        ${staff.id}::uuid,
        '2026-10-02T15:00:00Z',
        '2026-10-02T15:30:00Z',
        'SCHEDULED'
      ),
      (
        ${businessA.id}::uuid,
        ${contacts[2].id}::uuid,
        ${service.id}::uuid,
        ${staff.id}::uuid,
        '2026-10-02T16:00:00Z',
        '2026-10-02T16:30:00Z',
        'CANCELLED'
      )
  `;

  const database = createDatabase(connectionString);

  try {
    const summaryA = await getDashboardSummary(database.db, businessA.id);

    assert.deepEqual(summaryA, {
      leadsReceived: 3,
      openConversations: 2,
      scheduledAppointments: 2,
      humanHandoffs: 1,
    });

    const summaryB = await getDashboardSummary(database.db, businessB.id);

    assert.deepEqual(summaryB, {
      leadsReceived: 0,
      openConversations: 0,
      scheduledAppointments: 0,
      humanHandoffs: 0,
    });
  } finally {
    await database.client.end({ timeout: 5 });
  }

  await sql`
    delete from public.businesses
    where id in (${businessA.id}::uuid, ${businessB.id}::uuid)
  `;
}

async function verifyTenantIsolation() {
  await sql.unsafe(`
DO $$
DECLARE
  business_a uuid;
  business_b uuid;

  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();

  contact_a uuid;
  contact_b uuid;

  service_a uuid;
  service_b uuid;

  staff_a uuid;
  staff_b uuid;

  pipeline_a uuid;
  pipeline_b uuid;

  stage_a uuid;
  stage_b uuid;

  conversation_a uuid;
  conversation_b uuid;

  cross_staff_service_rejected boolean := false;
  cross_availability_staff_rejected boolean := false;
  cross_pipeline_stage_rejected boolean := false;
  cross_lead_contact_rejected boolean := false;
  cross_lead_stage_rejected boolean := false;
  cross_lead_service_rejected boolean := false;
  cross_appointment_contact_rejected boolean := false;
  cross_appointment_service_rejected boolean := false;
  cross_appointment_staff_rejected boolean := false;
  appointment_overlap_rejected boolean := false;
  cross_conversation_contact_rejected boolean := false;
  cross_conversation_assignee_rejected boolean := false;
  invalid_ai_state_rejected boolean := false;
  cross_message_conversation_rejected boolean := false;
  cross_message_sender_rejected boolean := false;
  duplicate_provider_message_rejected boolean := false;
BEGIN
  INSERT INTO auth.users (id)
  VALUES (user_a), (user_b);

  INSERT INTO public.app_users (id, display_name)
  VALUES
    (user_a, 'Tenant test user A'),
    (user_b, 'Tenant test user B');

  INSERT INTO public.businesses (name, timezone)
  VALUES ('Tenant test A', 'America/Bogota')
  RETURNING id INTO business_a;

  INSERT INTO public.businesses (name, timezone)
  VALUES ('Tenant test B', 'America/Bogota')
  RETURNING id INTO business_b;

  INSERT INTO public.business_memberships (
    business_id,
    user_id,
    role
  )
  VALUES
    (business_a, user_a, 'owner'),
    (business_b, user_b, 'owner');

  INSERT INTO public.contacts (business_id, name, source)
  VALUES (business_a, 'Contact A', 'test')
  RETURNING id INTO contact_a;

  INSERT INTO public.contacts (business_id, name, source)
  VALUES (business_b, 'Contact B', 'test')
  RETURNING id INTO contact_b;

  INSERT INTO public.services (
    business_id,
    name,
    duration_minutes
  )
  VALUES (business_a, 'Service A', 60)
  RETURNING id INTO service_a;

  INSERT INTO public.services (
    business_id,
    name,
    duration_minutes
  )
  VALUES (business_b, 'Service B', 60)
  RETURNING id INTO service_b;

  INSERT INTO public.staff_members (business_id, name)
  VALUES (business_a, 'Staff A')
  RETURNING id INTO staff_a;

  INSERT INTO public.staff_members (business_id, name)
  VALUES (business_b, 'Staff B')
  RETURNING id INTO staff_b;

  INSERT INTO public.pipelines (
    business_id,
    name,
    is_default
  )
  VALUES (business_a, 'Pipeline A', true)
  RETURNING id INTO pipeline_a;

  INSERT INTO public.pipelines (
    business_id,
    name,
    is_default
  )
  VALUES (business_b, 'Pipeline B', true)
  RETURNING id INTO pipeline_b;

  INSERT INTO public.pipeline_stages (
    business_id,
    pipeline_id,
    name,
    position
  )
  VALUES (business_a, pipeline_a, 'Stage A', 1)
  RETURNING id INTO stage_a;

  INSERT INTO public.pipeline_stages (
    business_id,
    pipeline_id,
    name,
    position
  )
  VALUES (business_b, pipeline_b, 'Stage B', 1)
  RETURNING id INTO stage_b;

  INSERT INTO public.staff_services (
    business_id,
    staff_member_id,
    service_id
  )
  VALUES (business_a, staff_a, service_a);

  INSERT INTO public.availability_rules (
    business_id,
    staff_member_id,
    day_of_week,
    start_time,
    end_time
  )
  VALUES (
    business_a,
    staff_a,
    1,
    '09:00',
    '17:00'
  );

  BEGIN
    INSERT INTO public.staff_services (
      business_id,
      staff_member_id,
      service_id
    )
    VALUES (business_a, staff_a, service_b);
  EXCEPTION WHEN foreign_key_violation THEN
    cross_staff_service_rejected := true;
  END;

  BEGIN
    INSERT INTO public.availability_rules (
      business_id,
      staff_member_id,
      day_of_week,
      start_time,
      end_time
    )
    VALUES (
      business_a,
      staff_b,
      2,
      '09:00',
      '17:00'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_availability_staff_rejected := true;
  END;

  BEGIN
    INSERT INTO public.pipeline_stages (
      business_id,
      pipeline_id,
      name,
      position
    )
    VALUES (
      business_a,
      pipeline_b,
      'Invalid cross-tenant stage',
      2
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_pipeline_stage_rejected := true;
  END;

  BEGIN
    INSERT INTO public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id
    )
    VALUES (
      business_a,
      contact_b,
      pipeline_a,
      stage_a,
      service_a
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_lead_contact_rejected := true;
  END;

  BEGIN
    INSERT INTO public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id
    )
    VALUES (
      business_a,
      contact_a,
      pipeline_b,
      stage_b,
      service_a
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_lead_stage_rejected := true;
  END;

  BEGIN
    INSERT INTO public.leads (
      business_id,
      contact_id,
      pipeline_id,
      pipeline_stage_id,
      service_id
    )
    VALUES (
      business_a,
      contact_a,
      pipeline_a,
      stage_a,
      service_b
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_lead_service_rejected := true;
  END;

  INSERT INTO public.appointments (
    business_id,
    contact_id,
    service_id,
    staff_member_id,
    starts_at,
    ends_at
  )
  VALUES (
    business_a,
    contact_a,
    service_a,
    staff_a,
    '2026-10-01T15:00:00Z',
    '2026-10-01T16:00:00Z'
  );

  BEGIN
    INSERT INTO public.appointments (
      business_id,
      contact_id,
      service_id,
      staff_member_id,
      starts_at,
      ends_at
    )
    VALUES (
      business_a,
      contact_b,
      service_a,
      staff_a,
      '2026-10-01T17:00:00Z',
      '2026-10-01T18:00:00Z'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_appointment_contact_rejected := true;
  END;

  BEGIN
    INSERT INTO public.appointments (
      business_id,
      contact_id,
      service_id,
      staff_member_id,
      starts_at,
      ends_at
    )
    VALUES (
      business_a,
      contact_a,
      service_b,
      staff_a,
      '2026-10-01T17:00:00Z',
      '2026-10-01T18:00:00Z'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_appointment_service_rejected := true;
  END;

  BEGIN
    INSERT INTO public.appointments (
      business_id,
      contact_id,
      service_id,
      staff_member_id,
      starts_at,
      ends_at
    )
    VALUES (
      business_a,
      contact_a,
      service_a,
      staff_b,
      '2026-10-01T17:00:00Z',
      '2026-10-01T18:00:00Z'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_appointment_staff_rejected := true;
  END;

  BEGIN
    INSERT INTO public.appointments (
      business_id,
      contact_id,
      service_id,
      staff_member_id,
      starts_at,
      ends_at
    )
    VALUES (
      business_a,
      contact_a,
      service_a,
      staff_a,
      '2026-10-01T15:30:00Z',
      '2026-10-01T16:30:00Z'
    );
  EXCEPTION WHEN exclusion_violation THEN
    appointment_overlap_rejected := true;
  END;

  -- Half-open ranges must allow adjacent reservations.
  INSERT INTO public.appointments (
    business_id,
    contact_id,
    service_id,
    staff_member_id,
    starts_at,
    ends_at
  )
  VALUES (
    business_a,
    contact_a,
    service_a,
    staff_a,
    '2026-10-01T16:00:00Z',
    '2026-10-01T17:00:00Z'
  );

  INSERT INTO public.conversations (
    business_id,
    contact_id,
    channel
  )
  VALUES (
    business_a,
    contact_a,
    'WHATSAPP'
  )
  RETURNING id INTO conversation_a;

  INSERT INTO public.conversations (
    business_id,
    contact_id,
    channel
  )
  VALUES (
    business_b,
    contact_b,
    'WHATSAPP'
  )
  RETURNING id INTO conversation_b;

  UPDATE public.conversations
  SET
    assigned_to_user_id = user_a,
    ai_enabled = false
  WHERE id = conversation_a;

  BEGIN
    INSERT INTO public.conversations (
      business_id,
      contact_id,
      channel
    )
    VALUES (
      business_a,
      contact_b,
      'WHATSAPP'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_conversation_contact_rejected := true;
  END;

  BEGIN
    UPDATE public.conversations
    SET assigned_to_user_id = user_b
    WHERE id = conversation_a;
  EXCEPTION WHEN foreign_key_violation THEN
    cross_conversation_assignee_rejected := true;
  END;

  BEGIN
    INSERT INTO public.conversations (
      business_id,
      contact_id,
      channel,
      status,
      ai_enabled
    )
    VALUES (
      business_a,
      contact_a,
      'WHATSAPP',
      'HUMAN_REQUIRED',
      true
    );
  EXCEPTION WHEN check_violation THEN
    invalid_ai_state_rejected := true;
  END;

  INSERT INTO public.messages (
    business_id,
    conversation_id,
    direction,
    sender,
    content,
    provider_message_id
  )
  VALUES (
    business_a,
    conversation_a,
    'INBOUND',
    'CONTACT',
    'Inbound A',
    'provider-message-1'
  );

  INSERT INTO public.messages (
    business_id,
    conversation_id,
    direction,
    sender,
    sender_user_id,
    content
  )
  VALUES (
    business_a,
    conversation_a,
    'OUTBOUND',
    'HUMAN',
    user_a,
    'Human response A'
  );

  BEGIN
    INSERT INTO public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content
    )
    VALUES (
      business_a,
      conversation_b,
      'INBOUND',
      'CONTACT',
      'Invalid conversation tenant'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_message_conversation_rejected := true;
  END;

  BEGIN
    INSERT INTO public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      sender_user_id,
      content
    )
    VALUES (
      business_a,
      conversation_a,
      'OUTBOUND',
      'HUMAN',
      user_b,
      'Invalid sender tenant'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    cross_message_sender_rejected := true;
  END;

  BEGIN
    INSERT INTO public.messages (
      business_id,
      conversation_id,
      direction,
      sender,
      content,
      provider_message_id
    )
    VALUES (
      business_a,
      conversation_a,
      'INBOUND',
      'CONTACT',
      'Duplicate provider message',
      'provider-message-1'
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_provider_message_rejected := true;
  END;

  -- The same provider identifier may exist in another business.
  INSERT INTO public.messages (
    business_id,
    conversation_id,
    direction,
    sender,
    content,
    provider_message_id
  )
  VALUES (
    business_b,
    conversation_b,
    'INBOUND',
    'CONTACT',
    'Inbound B',
    'provider-message-1'
  );

  IF NOT cross_staff_service_rejected THEN
    RAISE EXCEPTION 'Cross-tenant staff/service relation was not rejected';
  END IF;

  IF NOT cross_availability_staff_rejected THEN
    RAISE EXCEPTION 'Cross-tenant availability staff was not rejected';
  END IF;

  IF NOT cross_pipeline_stage_rejected THEN
    RAISE EXCEPTION 'Cross-tenant pipeline stage was not rejected';
  END IF;

  IF NOT cross_lead_contact_rejected THEN
    RAISE EXCEPTION 'Cross-tenant lead contact was not rejected';
  END IF;

  IF NOT cross_lead_stage_rejected THEN
    RAISE EXCEPTION 'Cross-tenant lead stage was not rejected';
  END IF;

  IF NOT cross_lead_service_rejected THEN
    RAISE EXCEPTION 'Cross-tenant lead service was not rejected';
  END IF;

  IF NOT cross_appointment_contact_rejected THEN
    RAISE EXCEPTION 'Cross-tenant appointment contact was not rejected';
  END IF;

  IF NOT cross_appointment_service_rejected THEN
    RAISE EXCEPTION 'Cross-tenant appointment service was not rejected';
  END IF;

  IF NOT cross_appointment_staff_rejected THEN
    RAISE EXCEPTION 'Cross-tenant appointment staff was not rejected';
  END IF;

  IF NOT appointment_overlap_rejected THEN
    RAISE EXCEPTION 'Overlapping scheduled appointment was not rejected';
  END IF;

  IF NOT cross_conversation_contact_rejected THEN
    RAISE EXCEPTION 'Cross-tenant conversation contact was not rejected';
  END IF;

  IF NOT cross_conversation_assignee_rejected THEN
    RAISE EXCEPTION 'Cross-tenant conversation assignee was not rejected';
  END IF;

  IF NOT invalid_ai_state_rejected THEN
    RAISE EXCEPTION 'Invalid conversation AI state was not rejected';
  END IF;

  IF NOT cross_message_conversation_rejected THEN
    RAISE EXCEPTION 'Cross-tenant message conversation was not rejected';
  END IF;

  IF NOT cross_message_sender_rejected THEN
    RAISE EXCEPTION 'Cross-tenant human message sender was not rejected';
  END IF;

  IF NOT duplicate_provider_message_rejected THEN
    RAISE EXCEPTION 'Duplicate provider message was not rejected';
  END IF;

  DELETE FROM public.businesses
  WHERE id IN (business_a, business_b);

  DELETE FROM auth.users
  WHERE id IN (user_a, user_b);
END
$$;
  `);

  const [counts] = await sql`
    select
      (select count(*)::int from public.businesses) as "businesses",
      (select count(*)::int from public.contacts) as "contacts",
      (select count(*)::int from public.conversations) as "conversations",
      (select count(*)::int from public.messages) as "messages",
      (select count(*)::int from auth.users) as "authUsers"
  `;

  assert.deepEqual(counts, {
    businesses: 0,
    contacts: 0,
    conversations: 0,
    messages: 0,
    authUsers: 0,
  });
}

try {
  await waitForDatabase();
  await resetDatabase();
  const migrations = await applyMigrations();
  await verifyRls();
  await verifyMembershipReader();
  await verifyContactList();
  await verifyConversationList();
  await verifyConversationHandoffWorkflow();
  await verifyAppointmentCreationWorkflow();
  await verifyServiceManagement();
  await verifyDevelopmentMessageSimulation();
  await verifyDashboardSummary();
  await verifyTenantIsolation();

  console.log(
    `Database integration test passed: ${migrations.length} migrations applied, RLS verified, tenant isolation enforced.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}

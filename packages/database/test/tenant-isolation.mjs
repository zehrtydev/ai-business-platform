import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';

import {
  createDatabase,
  getDashboardSummary,
  listBusinessMembershipsForUser,
  listContactsForBusiness,
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
  await verifyDashboardSummary();
  await verifyTenantIsolation();

  console.log(
    `Database integration test passed: ${migrations.length} migrations applied, RLS verified, tenant isolation enforced.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}

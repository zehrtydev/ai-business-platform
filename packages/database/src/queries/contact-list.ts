import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../client.js';
import { contacts } from '../schema/contact.js';
import { leads } from '../schema/lead.js';
import { pipelineStages } from '../schema/pipeline-stage.js';
import { services } from '../schema/service.js';

export interface ContactListLead {
  id: string;
  pipelineStage: {
    id: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
  } | null;
}

export interface ContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: Date | null;
  createdAt: Date;
  lead: ContactListLead | null;
}

export async function listContactsForBusiness(
  db: Database,
  businessId: string,
  limit = 100,
): Promise<ContactListItem[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Contact list limit must be between 1 and 100.');
  }

  const contactRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      source: contacts.source,
      lastInteractionAt: contacts.lastInteractionAt,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(eq(contacts.businessId, normalizedBusinessId))
    .orderBy(
      desc(sql`coalesce(${contacts.lastInteractionAt}, ${contacts.createdAt})`),
      desc(contacts.createdAt),
      desc(contacts.id),
    )
    .limit(limit);

  if (contactRows.length === 0) {
    return [];
  }

  const contactIds = contactRows.map((contact) => contact.id);

  const leadRows = await db
    .select({
      id: leads.id,
      contactId: leads.contactId,
      pipelineStageId: pipelineStages.id,
      pipelineStageName: pipelineStages.name,
      serviceId: services.id,
      serviceName: services.name,
    })
    .from(leads)
    .innerJoin(
      pipelineStages,
      and(
        eq(leads.businessId, pipelineStages.businessId),
        eq(leads.pipelineId, pipelineStages.pipelineId),
        eq(leads.pipelineStageId, pipelineStages.id),
      ),
    )
    .leftJoin(
      services,
      and(
        eq(leads.businessId, services.businessId),
        eq(leads.serviceId, services.id),
      ),
    )
    .where(
      and(
        eq(leads.businessId, normalizedBusinessId),
        inArray(leads.contactId, contactIds),
      ),
    )
    .orderBy(desc(leads.updatedAt), desc(leads.createdAt), desc(leads.id));

  const latestLeadByContactId = new Map<string, ContactListLead>();

  for (const lead of leadRows) {
    if (latestLeadByContactId.has(lead.contactId)) {
      continue;
    }

    latestLeadByContactId.set(lead.contactId, {
      id: lead.id,
      pipelineStage: {
        id: lead.pipelineStageId,
        name: lead.pipelineStageName,
      },
      service:
        lead.serviceId && lead.serviceName
          ? {
              id: lead.serviceId,
              name: lead.serviceName,
            }
          : null,
    });
  }

  return contactRows.map((contact) => ({
    ...contact,
    lead: latestLeadByContactId.get(contact.id) ?? null,
  }));
}

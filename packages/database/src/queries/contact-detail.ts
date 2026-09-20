import { and, desc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { contacts } from '../schema/contact.js';
import { leads } from '../schema/lead.js';
import { pipelineStages } from '../schema/pipeline-stage.js';
import { services } from '../schema/service.js';

export interface ContactDetailLead {
  id: string;
  pipelineStage: {
    id: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lead: ContactDetailLead | null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getContactDetailForBusiness(
  db: Database,
  businessId: string,
  contactId: string,
): Promise<ContactDetail | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedContactId = contactId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!normalizedContactId || !isUuid(normalizedContactId)) {
    return null;
  }

  const [contact] = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      source: contacts.source,
      lastInteractionAt: contacts.lastInteractionAt,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.businessId, normalizedBusinessId),
        eq(contacts.id, normalizedContactId),
      ),
    )
    .limit(1);

  if (!contact) {
    return null;
  }

  const [lead] = await db
    .select({
      id: leads.id,
      pipelineStageId: pipelineStages.id,
      pipelineStageName: pipelineStages.name,
      serviceId: services.id,
      serviceName: services.name,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
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
        eq(leads.contactId, normalizedContactId),
      ),
    )
    .orderBy(desc(leads.updatedAt), desc(leads.createdAt), desc(leads.id))
    .limit(1);

  return {
    ...contact,
    lead: lead
      ? {
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
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        }
      : null,
  };
}

import { Injectable } from '@nestjs/common';
import {
  getContactDetailForBusiness,
  listContactsForBusiness,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  CrmContactDetail,
  CrmContactListItem,
  CrmContactReader,
} from './crm.types.js';

@Injectable()
export class DatabaseCrmContactReader implements CrmContactReader {
  constructor(private readonly database: DatabaseService) {}

  async listContacts(businessId: string): Promise<CrmContactListItem[]> {
    const contacts = await listContactsForBusiness(
      this.database.db,
      businessId,
    );

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      lastInteractionAt: contact.lastInteractionAt?.toISOString() ?? null,
      createdAt: contact.createdAt.toISOString(),
      lead: contact.lead,
    }));
  }

  async getContact(
    businessId: string,
    contactId: string,
  ): Promise<CrmContactDetail | null> {
    const contact = await getContactDetailForBusiness(
      this.database.db,
      businessId,
      contactId,
    );

    if (!contact) {
      return null;
    }

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      lastInteractionAt: contact.lastInteractionAt?.toISOString() ?? null,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
      lead: contact.lead
        ? {
            id: contact.lead.id,
            pipelineStage: contact.lead.pipelineStage,
            service: contact.lead.service,
            createdAt: contact.lead.createdAt.toISOString(),
            updatedAt: contact.lead.updatedAt.toISOString(),
          }
        : null,
    };
  }
}

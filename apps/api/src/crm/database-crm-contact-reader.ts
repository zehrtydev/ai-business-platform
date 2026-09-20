import { Injectable } from '@nestjs/common';
import { listContactsForBusiness } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type { CrmContactListItem, CrmContactReader } from './crm.types.js';

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
}

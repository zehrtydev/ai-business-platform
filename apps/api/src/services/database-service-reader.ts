import { Injectable } from '@nestjs/common';
import { listServicesForBusiness } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type { ServiceItem, ServiceReader } from './services.types.js';

@Injectable()
export class DatabaseServiceReader implements ServiceReader {
  constructor(private readonly database: DatabaseService) {}

  async listServices(businessId: string): Promise<ServiceItem[]> {
    const services = await listServicesForBusiness(
      this.database.db,
      businessId,
    );

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    }));
  }
}

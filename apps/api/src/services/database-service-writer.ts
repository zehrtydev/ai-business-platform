import { Injectable } from '@nestjs/common';
import {
  createServiceForBusiness,
  setServiceActiveForBusiness,
  updateServiceForBusiness,
  type ServiceRecord,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  ServiceCreateInput,
  ServiceItem,
  ServiceUpdateInput,
  ServiceWriter,
} from './services.types.js';

function mapService(service: ServiceRecord): ServiceItem {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: service.price,
    isActive: service.isActive,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

@Injectable()
export class DatabaseServiceWriter implements ServiceWriter {
  constructor(private readonly database: DatabaseService) {}

  async createService(
    businessId: string,
    input: ServiceCreateInput,
  ): Promise<ServiceItem> {
    const service = await createServiceForBusiness(
      this.database.db,
      businessId,
      input,
    );

    return mapService(service);
  }

  async updateService(
    businessId: string,
    serviceId: string,
    input: ServiceUpdateInput,
  ): Promise<ServiceItem | null> {
    const service = await updateServiceForBusiness(
      this.database.db,
      businessId,
      serviceId,
      input,
    );

    return service ? mapService(service) : null;
  }

  async setServiceActive(
    businessId: string,
    serviceId: string,
    isActive: boolean,
  ): Promise<ServiceItem | null> {
    const service = await setServiceActiveForBusiness(
      this.database.db,
      businessId,
      serviceId,
      isActive,
    );

    return service ? mapService(service) : null;
  }
}

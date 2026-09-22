import { Injectable } from '@nestjs/common';
import {
  getAppointmentSchedulingOptionsForBusiness,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AppointmentSchedulingOptions,
  AppointmentSchedulingOptionsReader,
} from './appointments.types.js';

@Injectable()
export class DatabaseAppointmentSchedulingOptionsReader
  implements AppointmentSchedulingOptionsReader
{
  constructor(private readonly database: DatabaseService) {}

  async getOptions(
    businessId: string,
  ): Promise<AppointmentSchedulingOptions | null> {
    return getAppointmentSchedulingOptionsForBusiness(
      this.database.db,
      businessId,
    );
  }
}

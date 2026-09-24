import { Injectable } from '@nestjs/common';
import { listAppointmentsForBusiness } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AppointmentListItem,
  AppointmentReader,
} from './appointments.types.js';

@Injectable()
export class DatabaseAppointmentReader implements AppointmentReader {
  constructor(private readonly database: DatabaseService) {}

  async listAppointments(businessId: string): Promise<AppointmentListItem[]> {
    const appointments = await listAppointmentsForBusiness(
      this.database.db,
      businessId,
    );

    return appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      contact: appointment.contact,
      service: appointment.service,
      staffMember: appointment.staffMember,
    }));
  }
}

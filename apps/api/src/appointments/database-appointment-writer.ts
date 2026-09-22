import { Injectable } from '@nestjs/common';
import {
  createAppointmentForBusiness,
  updateAppointmentStatusForBusiness,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AppointmentCreateInput,
  AppointmentCreateResult,
  AppointmentStatusUpdateInput,
  AppointmentStatusUpdateResult,
  AppointmentWriter,
} from './appointments.types.js';

@Injectable()
export class DatabaseAppointmentWriter implements AppointmentWriter {
  constructor(private readonly database: DatabaseService) {}

  async createAppointment(
    businessId: string,
    input: AppointmentCreateInput,
  ): Promise<AppointmentCreateResult> {
    const result = await createAppointmentForBusiness(
      this.database.db,
      businessId,
      {
        contactId: input.contactId,
        serviceId: input.serviceId,
        staffMemberId: input.staffMemberId,
        startsAt: new Date(input.startsAt),
      },
    );

    if (result.kind !== 'created') {
      return result;
    }

    return {
      kind: 'created',
      appointment: {
        id: result.appointment.id,
        contactId: result.appointment.contactId,
        serviceId: result.appointment.serviceId,
        staffMemberId: result.appointment.staffMemberId,
        startsAt: result.appointment.startsAt.toISOString(),
        endsAt: result.appointment.endsAt.toISOString(),
        status: result.appointment.status,
        createdAt: result.appointment.createdAt.toISOString(),
        updatedAt: result.appointment.updatedAt.toISOString(),
      },
    };
  }

  async updateAppointmentStatus(
    businessId: string,
    input: AppointmentStatusUpdateInput,
  ): Promise<AppointmentStatusUpdateResult> {
    const result = await updateAppointmentStatusForBusiness(
      this.database.db,
      businessId,
      input.appointmentId,
      input.status,
    );

    if (result.kind !== 'updated') {
      return result;
    }

    return {
      kind: 'updated',
      appointment: {
        id: result.appointment.id,
        status: result.appointment.status,
        updatedAt: result.appointment.updatedAt.toISOString(),
      },
    };
  }
}

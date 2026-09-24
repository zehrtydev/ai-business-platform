import { Injectable } from '@nestjs/common';
import { getAppointmentAvailableSlotsForBusiness } from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AppointmentAvailableSlotsInput,
  AppointmentAvailableSlotsReader,
  AppointmentAvailableSlotsResult,
} from './appointments.types.js';

@Injectable()
export class DatabaseAppointmentAvailableSlotsReader implements AppointmentAvailableSlotsReader {
  constructor(private readonly database: DatabaseService) {}

  async getAvailableSlots(
    businessId: string,
    input: AppointmentAvailableSlotsInput,
  ): Promise<AppointmentAvailableSlotsResult> {
    const result = await getAppointmentAvailableSlotsForBusiness(
      this.database.db,
      businessId,
      input,
    );

    if (result.kind !== 'available') {
      return result;
    }

    return {
      kind: 'available',
      availability: {
        ...result.availability,
        slots: result.availability.slots.map((slot) => ({
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
        })),
      },
    };
  }
}

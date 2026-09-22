import { and, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { appointments } from '../schema/appointment.js';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type AppointmentLifecycleStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface UpdatedAppointmentStatus {
  id: string;
  status: AppointmentLifecycleStatus;
  updatedAt: Date;
}

export type UpdateAppointmentStatusResult =
  | {
      kind: 'updated';
      appointment: UpdatedAppointmentStatus;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'conflict';
      currentStatus: AppointmentStatus;
    };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function updateAppointmentStatusForBusiness(
  db: Database,
  businessId: string,
  appointmentId: string,
  status: AppointmentLifecycleStatus,
): Promise<UpdateAppointmentStatusResult> {
  const normalizedBusinessId = businessId.trim();
  const normalizedAppointmentId = appointmentId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedAppointmentId)) {
    return {
      kind: 'not_found',
    };
  }

  const [updated] = await db
    .update(appointments)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.businessId, normalizedBusinessId),
        eq(appointments.id, normalizedAppointmentId),
        eq(appointments.status, 'SCHEDULED'),
      ),
    )
    .returning({
      id: appointments.id,
      status: appointments.status,
      updatedAt: appointments.updatedAt,
    });

  if (updated) {
    return {
      kind: 'updated',
      appointment: {
        id: updated.id,
        status,
        updatedAt: updated.updatedAt,
      },
    };
  }

  const [existing] = await db
    .select({
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.businessId, normalizedBusinessId),
        eq(appointments.id, normalizedAppointmentId),
      ),
    )
    .limit(1);

  if (!existing) {
    return {
      kind: 'not_found',
    };
  }

  return {
    kind: 'conflict',
    currentStatus: existing.status,
  };
}

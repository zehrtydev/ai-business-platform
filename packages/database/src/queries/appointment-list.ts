import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { appointments } from '../schema/appointment.js';
import { contacts } from '../schema/contact.js';
import { services } from '../schema/service.js';
import { staffMembers } from '../schema/staff-member.js';

export interface AppointmentListItem {
  id: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  staffMember: {
    id: string;
    name: string;
  };
}

export async function listAppointmentsForBusiness(
  db: Database,
  businessId: string,
): Promise<AppointmentListItem[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const rows = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,

      contactId: contacts.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactEmail: contacts.email,

      serviceId: services.id,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,

      staffMemberId: staffMembers.id,
      staffMemberName: staffMembers.name,
    })
    .from(appointments)
    .innerJoin(
      contacts,
      and(
        eq(appointments.businessId, contacts.businessId),
        eq(appointments.contactId, contacts.id),
      ),
    )
    .innerJoin(
      services,
      and(
        eq(appointments.businessId, services.businessId),
        eq(appointments.serviceId, services.id),
      ),
    )
    .innerJoin(
      staffMembers,
      and(
        eq(appointments.businessId, staffMembers.businessId),
        eq(appointments.staffMemberId, staffMembers.id),
      ),
    )
    .where(eq(appointments.businessId, normalizedBusinessId))
    .orderBy(asc(appointments.startsAt));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    contact: {
      id: row.contactId,
      name: row.contactName,
      phone: row.contactPhone,
      email: row.contactEmail,
    },
    service: {
      id: row.serviceId,
      name: row.serviceName,
      durationMinutes: row.serviceDurationMinutes,
    },
    staffMember: {
      id: row.staffMemberId,
      name: row.staffMemberName,
    },
  }));
}

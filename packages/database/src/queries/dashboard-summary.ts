import { and, count, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { appointments } from '../schema/appointment.js';
import { conversations } from '../schema/conversation.js';
import { leads } from '../schema/lead.js';

export interface DashboardSummary {
  leadsReceived: number;
  openConversations: number;
  scheduledAppointments: number;
  humanHandoffs: number;
}

export async function getDashboardSummary(
  db: Database,
  businessId: string,
): Promise<DashboardSummary> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const [
    leadRows,
    openConversationRows,
    scheduledAppointmentRows,
    humanHandoffRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(leads)
      .where(eq(leads.businessId, normalizedBusinessId)),
    db
      .select({ value: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, normalizedBusinessId),
          eq(conversations.status, 'OPEN'),
        ),
      ),
    db
      .select({ value: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, normalizedBusinessId),
          eq(appointments.status, 'SCHEDULED'),
        ),
      ),
    db
      .select({ value: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessId, normalizedBusinessId),
          eq(conversations.status, 'HUMAN_REQUIRED'),
        ),
      ),
  ]);

  return {
    leadsReceived: Number(leadRows[0]?.value ?? 0),
    openConversations: Number(openConversationRows[0]?.value ?? 0),
    scheduledAppointments: Number(scheduledAppointmentRows[0]?.value ?? 0),
    humanHandoffs: Number(humanHandoffRows[0]?.value ?? 0),
  };
}

export interface AppointmentListItem {
  id: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
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

export interface AppointmentReader {
  listAppointments(
    businessId: string,
  ): Promise<readonly AppointmentListItem[]>;
}

export interface AppointmentCreateInput {
  contactId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: string;
}

export interface CreatedAppointment {
  id: string;
  contactId: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED';
  createdAt: string;
  updatedAt: string;
}

export type AppointmentConflictReason =
  | 'past'
  | 'unavailable_day'
  | 'outside_hours'
  | 'overlap'
  | 'configuration';

export type AppointmentCreateResult =
  | {
      kind: 'created';
      appointment: CreatedAppointment;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'conflict';
      reason: AppointmentConflictReason;
    };

export interface AppointmentWriter {
  createAppointment(
    businessId: string,
    input: AppointmentCreateInput,
  ): Promise<AppointmentCreateResult>;

  updateAppointmentStatus(
    businessId: string,
    input: AppointmentStatusUpdateInput,
  ): Promise<AppointmentStatusUpdateResult>;
}

export interface AppointmentSchedulingAvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AppointmentSchedulingStaffMember {
  id: string;
  name: string;
  availability: AppointmentSchedulingAvailabilityRule[];
}

export interface AppointmentSchedulingService {
  id: string;
  name: string;
  durationMinutes: number;
  staffMembers: AppointmentSchedulingStaffMember[];
}

export interface AppointmentSchedulingOptions {
  timezone: string;
  services: AppointmentSchedulingService[];
}

export interface AppointmentSchedulingOptionsReader {
  getOptions(
    businessId: string,
  ): Promise<AppointmentSchedulingOptions | null>;
}


export interface AppointmentAvailableSlotsInput {
  serviceId: string;
  staffMemberId: string;
  date: string;
}

export interface AppointmentAvailableSlot {
  startsAt: string;
  endsAt: string;
}

export interface AppointmentAvailableSlots {
  timezone: string;
  date: string;
  serviceId: string;
  staffMemberId: string;
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  slots: AppointmentAvailableSlot[];
}

export type AppointmentAvailableSlotsResult =
  | {
      kind: 'available';
      availability: AppointmentAvailableSlots;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'configuration';
    }
  | {
      kind: 'invalid';
    };

export interface AppointmentAvailableSlotsReader {
  getAvailableSlots(
    businessId: string,
    input: AppointmentAvailableSlotsInput,
  ): Promise<AppointmentAvailableSlotsResult>;
}

export type AppointmentLifecycleStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type AppointmentStatus =
  | 'SCHEDULED'
  | AppointmentLifecycleStatus;

export interface AppointmentStatusUpdateInput {
  appointmentId: string;
  status: AppointmentLifecycleStatus;
}

export interface UpdatedAppointmentStatus {
  id: string;
  status: AppointmentLifecycleStatus;
  updatedAt: string;
}

export type AppointmentStatusUpdateResult =
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

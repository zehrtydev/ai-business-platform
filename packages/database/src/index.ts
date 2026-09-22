export type { Database } from './client.js';
export type { DevelopmentInboundMessage } from './queries/development-message.js';
export { createDevelopmentInboundMessageForBusiness } from './queries/development-message.js';
export type {
  ConversationDetail,
  ConversationDetailMessage,
} from './queries/conversation-detail.js';
export { getConversationDetailForBusiness } from './queries/conversation-detail.js';
export type {
  ConversationListItem,
  ConversationListMessage,
} from './queries/conversation-list.js';
export { listConversationsForBusiness } from './queries/conversation-list.js';
export type {
  ContactDetail,
  ContactDetailLead,
} from './queries/contact-detail.js';
export { getContactDetailForBusiness } from './queries/contact-detail.js';
export type {
  ContactListItem,
  ContactListLead,
} from './queries/contact-list.js';
export { listContactsForBusiness } from './queries/contact-list.js';
export type { DashboardSummary } from './queries/dashboard-summary.js';
export { getDashboardSummary } from './queries/dashboard-summary.js';
export { listBusinessMembershipsForUser } from './queries/business-membership.js';
export { createDatabase } from './client.js';
export * as schema from './schema/index.js';
export type {
  ConversationControlMutationResult,
  ConversationControlState,
} from './queries/conversation-handoff.js';
export {
  requestConversationHandoffForBusiness,
  resumeConversationAiForBusiness,
  takeOverConversationForBusiness,
} from './queries/conversation-handoff.js';

export type { AppointmentListItem } from './queries/appointment-list.js';
export { listAppointmentsForBusiness } from './queries/appointment-list.js';

export type {
  AppointmentConflictReason,
  CreateAppointmentInput,
  CreateAppointmentResult,
  CreatedAppointment,
} from './queries/appointment-create.js';
export { createAppointmentForBusiness } from './queries/appointment-create.js';

export type {
  AppointmentSchedulingAvailabilityRule,
  AppointmentSchedulingOptions,
  AppointmentSchedulingService,
  AppointmentSchedulingStaffMember,
} from './queries/appointment-scheduling-options.js';
export { getAppointmentSchedulingOptionsForBusiness } from './queries/appointment-scheduling-options.js';

export type {
  AppointmentAvailableSlot,
  AppointmentAvailableSlots,
  GetAppointmentAvailableSlotsInput,
  GetAppointmentAvailableSlotsResult,
} from './queries/appointment-available-slots.js';
export {
  getAppointmentAvailableSlotsForBusiness,
} from './queries/appointment-available-slots.js';

export type {
  AppointmentLifecycleStatus,
  AppointmentStatus,
  UpdateAppointmentStatusResult,
  UpdatedAppointmentStatus,
} from './queries/appointment-status.js';
export { updateAppointmentStatusForBusiness } from './queries/appointment-status.js';

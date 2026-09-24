export interface StaffAssignedService {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StaffMemberItem {
  id: string;
  name: string;
  isActive: boolean;
  services: StaffAssignedService[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffMutationInput {
  name: string;
  serviceIds: string[];
}

export interface StaffReader {
  listStaffMembers(businessId: string): Promise<readonly StaffMemberItem[]>;
}

export type StaffCreateResult =
  | {
      kind: 'created';
      staffMember: StaffMemberItem;
    }
  | {
      kind: 'service_not_found';
    };

export type StaffUpdateResult =
  | {
      kind: 'updated';
      staffMember: StaffMemberItem;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'service_not_found';
    };

export interface StaffWriter {
  createStaffMember(
    businessId: string,
    input: StaffMutationInput,
  ): Promise<StaffCreateResult>;

  updateStaffMember(
    businessId: string,
    staffMemberId: string,
    input: StaffMutationInput,
  ): Promise<StaffUpdateResult>;

  setStaffMemberActive(
    businessId: string,
    staffMemberId: string,
    isActive: boolean,
  ): Promise<StaffMemberItem | null>;
}

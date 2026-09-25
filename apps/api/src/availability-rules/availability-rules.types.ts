export interface AvailabilityRuleItem {
  id: string;
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRuleMutationInput {
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityRuleReader {
  listAvailabilityRules(
    businessId: string,
  ): Promise<readonly AvailabilityRuleItem[]>;
}

export type AvailabilityRuleCreateResult =
  | {
      kind: 'created';
      availabilityRule: AvailabilityRuleItem;
    }
  | {
      kind: 'staff_not_found';
    };

export type AvailabilityRuleUpdateResult =
  | {
      kind: 'updated';
      availabilityRule: AvailabilityRuleItem;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'staff_not_found';
    };

export interface AvailabilityRuleWriter {
  createAvailabilityRule(
    businessId: string,
    input: AvailabilityRuleMutationInput,
  ): Promise<AvailabilityRuleCreateResult>;

  updateAvailabilityRule(
    businessId: string,
    availabilityRuleId: string,
    input: AvailabilityRuleMutationInput,
  ): Promise<AvailabilityRuleUpdateResult>;

  setAvailabilityRuleActive(
    businessId: string,
    availabilityRuleId: string,
    isActive: boolean,
  ): Promise<AvailabilityRuleItem | null>;
}

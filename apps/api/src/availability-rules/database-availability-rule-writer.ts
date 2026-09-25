import { Injectable } from '@nestjs/common';
import {
  createAvailabilityRuleForBusiness,
  setAvailabilityRuleActiveForBusiness,
  updateAvailabilityRuleForBusiness,
  type AvailabilityRuleRecord,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AvailabilityRuleCreateResult,
  AvailabilityRuleItem,
  AvailabilityRuleMutationInput,
  AvailabilityRuleUpdateResult,
  AvailabilityRuleWriter,
} from './availability-rules.types.js';

function mapAvailabilityRule(
  availabilityRule: AvailabilityRuleRecord,
): AvailabilityRuleItem {
  return {
    id: availabilityRule.id,
    staffMemberId: availabilityRule.staffMemberId,
    dayOfWeek: availabilityRule.dayOfWeek,
    startTime: availabilityRule.startTime,
    endTime: availabilityRule.endTime,
    isActive: availabilityRule.isActive,
    createdAt: availabilityRule.createdAt.toISOString(),
    updatedAt: availabilityRule.updatedAt.toISOString(),
  };
}

@Injectable()
export class DatabaseAvailabilityRuleWriter implements AvailabilityRuleWriter {
  constructor(private readonly database: DatabaseService) {}

  async createAvailabilityRule(
    businessId: string,
    input: AvailabilityRuleMutationInput,
  ): Promise<AvailabilityRuleCreateResult> {
    const result = await createAvailabilityRuleForBusiness(
      this.database.db,
      businessId,
      input,
    );

    if (result.kind === 'staff_not_found') {
      return result;
    }

    return {
      kind: 'created',
      availabilityRule: mapAvailabilityRule(result.availabilityRule),
    };
  }

  async updateAvailabilityRule(
    businessId: string,
    availabilityRuleId: string,
    input: AvailabilityRuleMutationInput,
  ): Promise<AvailabilityRuleUpdateResult> {
    const result = await updateAvailabilityRuleForBusiness(
      this.database.db,
      businessId,
      availabilityRuleId,
      input,
    );

    if (result.kind !== 'updated') {
      return result;
    }

    return {
      kind: 'updated',
      availabilityRule: mapAvailabilityRule(result.availabilityRule),
    };
  }

  async setAvailabilityRuleActive(
    businessId: string,
    availabilityRuleId: string,
    isActive: boolean,
  ): Promise<AvailabilityRuleItem | null> {
    const availabilityRule = await setAvailabilityRuleActiveForBusiness(
      this.database.db,
      businessId,
      availabilityRuleId,
      isActive,
    );

    return availabilityRule ? mapAvailabilityRule(availabilityRule) : null;
  }
}

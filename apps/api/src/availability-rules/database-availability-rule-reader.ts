import { Injectable } from '@nestjs/common';
import {
  listAvailabilityRulesForBusiness,
  type AvailabilityRuleRecord,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type {
  AvailabilityRuleItem,
  AvailabilityRuleReader,
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
export class DatabaseAvailabilityRuleReader implements AvailabilityRuleReader {
  constructor(private readonly database: DatabaseService) {}

  async listAvailabilityRules(
    businessId: string,
  ): Promise<AvailabilityRuleItem[]> {
    const availabilityRules = await listAvailabilityRulesForBusiness(
      this.database.db,
      businessId,
    );

    return availabilityRules.map(mapAvailabilityRule);
  }
}

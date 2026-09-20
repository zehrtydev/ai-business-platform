import { Injectable } from '@nestjs/common';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '@ai-business-platform/database';

import { DatabaseService } from '../database/database.service.js';
import type { DashboardSummaryReader } from './dashboard.types.js';

@Injectable()
export class DatabaseDashboardSummaryReader implements DashboardSummaryReader {
  constructor(private readonly database: DatabaseService) {}

  getSummary(businessId: string): Promise<DashboardSummary> {
    return getDashboardSummary(this.database.db, businessId);
  }
}

import type { DashboardSummary } from '@ai-business-platform/database';

export type { DashboardSummary };

export interface DashboardSummaryReader {
  getSummary(businessId: string): Promise<DashboardSummary>;
}

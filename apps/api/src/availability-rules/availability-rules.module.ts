import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AvailabilityRulesController } from './availability-rules.controller.js';
import {
  AVAILABILITY_RULE_READER,
  AVAILABILITY_RULE_WRITER,
} from './availability-rules.tokens.js';
import { DatabaseAvailabilityRuleReader } from './database-availability-rule-reader.js';
import { DatabaseAvailabilityRuleWriter } from './database-availability-rule-writer.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [AvailabilityRulesController],
  providers: [
    DatabaseAvailabilityRuleReader,
    DatabaseAvailabilityRuleWriter,
    {
      provide: AVAILABILITY_RULE_READER,
      useExisting: DatabaseAvailabilityRuleReader,
    },
    {
      provide: AVAILABILITY_RULE_WRITER,
      useExisting: DatabaseAvailabilityRuleWriter,
    },
  ],
})
export class AvailabilityRulesModule {}

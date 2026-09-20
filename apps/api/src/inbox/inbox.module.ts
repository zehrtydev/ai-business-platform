import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DatabaseInboxConversationReader } from './database-inbox-conversation-reader.js';
import { InboxController } from './inbox.controller.js';
import { INBOX_CONVERSATION_READER } from './inbox.tokens.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [InboxController],
  providers: [
    DatabaseInboxConversationReader,
    {
      provide: INBOX_CONVERSATION_READER,
      useExisting: DatabaseInboxConversationReader,
    },
  ],
})
export class InboxModule {}

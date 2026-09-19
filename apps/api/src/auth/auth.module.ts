import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AUTH_ACCESS_TOKEN_VERIFIER } from './auth.tokens.js';
import { SupabaseAuthVerifier } from './supabase-auth-verifier.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    SupabaseAuthVerifier,
    {
      provide: AUTH_ACCESS_TOKEN_VERIFIER,
      useExisting: SupabaseAuthVerifier,
    },
    SupabaseAuthGuard,
  ],
  exports: [AUTH_ACCESS_TOKEN_VERIFIER, SupabaseAuthGuard],
})
export class AuthModule {}

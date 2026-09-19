import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.authenticatedIdentity;
  }
}

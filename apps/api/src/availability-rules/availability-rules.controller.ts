import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  TenantContextGuard,
  type TenantRequest,
} from '../tenancy/tenant-context.guard.js';
import {
  AVAILABILITY_RULE_READER,
  AVAILABILITY_RULE_WRITER,
} from './availability-rules.tokens.js';
import type {
  AvailabilityRuleMutationInput,
  AvailabilityRuleReader,
  AvailabilityRuleWriter,
} from './availability-rules.types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTime(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a time string.`);
  }

  const normalized = value.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(normalized);

  if (!match) {
    throw new BadRequestException(
      `${field} must use HH:MM or HH:MM:SS format.`,
    );
  }

  const [, hours, minutes, seconds = '00'] = match;

  return `${hours}:${minutes}:${seconds}`;
}

function parseAvailabilityRuleBody(
  body: unknown,
): AvailabilityRuleMutationInput {
  if (!isRecord(body)) {
    throw new BadRequestException('Availability rule data is required.');
  }

  const staffMemberId =
    typeof body.staffMemberId === 'string' ? body.staffMemberId.trim() : '';

  if (!staffMemberId) {
    throw new BadRequestException('staffMemberId is required.');
  }

  const dayOfWeek = body.dayOfWeek;

  if (
    typeof dayOfWeek !== 'number' ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7
  ) {
    throw new BadRequestException('dayOfWeek must be an integer from 1 to 7.');
  }

  const startTime = normalizeTime(body.startTime, 'startTime');
  const endTime = normalizeTime(body.endTime, 'endTime');

  if (startTime >= endTime) {
    throw new BadRequestException('startTime must be before endTime.');
  }

  return {
    staffMemberId,
    dayOfWeek,
    startTime,
    endTime,
  };
}

function parseStatusBody(body: unknown): boolean {
  if (!isRecord(body) || typeof body.isActive !== 'boolean') {
    throw new BadRequestException('isActive must be a boolean.');
  }

  return body.isActive;
}

@Controller('availability-rules')
export class AvailabilityRulesController {
  constructor(
    @Inject(AVAILABILITY_RULE_READER)
    private readonly availabilityRuleReader: AvailabilityRuleReader,
    @Inject(AVAILABILITY_RULE_WRITER)
    private readonly availabilityRuleWriter: AvailabilityRuleWriter,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async availabilityRules(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items:
        await this.availabilityRuleReader.listAvailabilityRules(businessId),
    };
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async createAvailabilityRule(
    @Req() request: TenantRequest,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const result = await this.availabilityRuleWriter.createAvailabilityRule(
      businessId,
      parseAvailabilityRuleBody(body),
    );

    if (result.kind === 'staff_not_found') {
      throw new NotFoundException('Staff member not found.');
    }

    return {
      availabilityRule: result.availabilityRule,
    };
  }

  @Patch(':availabilityRuleId')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateAvailabilityRule(
    @Req() request: TenantRequest,
    @Param('availabilityRuleId') availabilityRuleId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedAvailabilityRuleId = availabilityRuleId.trim();

    if (!normalizedAvailabilityRuleId) {
      throw new BadRequestException('availabilityRuleId is required.');
    }

    const result = await this.availabilityRuleWriter.updateAvailabilityRule(
      businessId,
      normalizedAvailabilityRuleId,
      parseAvailabilityRuleBody(body),
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException('Availability rule not found.');
    }

    if (result.kind === 'staff_not_found') {
      throw new NotFoundException('Staff member not found.');
    }

    return {
      availabilityRule: result.availabilityRule,
    };
  }

  @Patch(':availabilityRuleId/status')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateAvailabilityRuleStatus(
    @Req() request: TenantRequest,
    @Param('availabilityRuleId') availabilityRuleId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedAvailabilityRuleId = availabilityRuleId.trim();

    if (!normalizedAvailabilityRuleId) {
      throw new BadRequestException('availabilityRuleId is required.');
    }

    const availabilityRule =
      await this.availabilityRuleWriter.setAvailabilityRuleActive(
        businessId,
        normalizedAvailabilityRuleId,
        parseStatusBody(body),
      );

    if (!availabilityRule) {
      throw new NotFoundException('Availability rule not found.');
    }

    return {
      availabilityRule,
    };
  }
}

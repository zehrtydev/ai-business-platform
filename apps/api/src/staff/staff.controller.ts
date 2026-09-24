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
import { STAFF_READER, STAFF_WRITER } from './staff.tokens.js';
import type {
  StaffMutationInput,
  StaffReader,
  StaffWriter,
} from './staff.types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStaffBody(body: unknown): StaffMutationInput {
  if (!isRecord(body)) {
    throw new BadRequestException('Staff member data is required.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    throw new BadRequestException('name is required.');
  }

  if (body.serviceIds !== undefined && !Array.isArray(body.serviceIds)) {
    throw new BadRequestException('serviceIds must be an array.');
  }

  const rawServiceIds = body.serviceIds ?? [];

  if (
    !Array.isArray(rawServiceIds) ||
    rawServiceIds.some(
      (serviceId) => typeof serviceId !== 'string' || !serviceId.trim(),
    )
  ) {
    throw new BadRequestException('serviceIds must contain non-empty strings.');
  }

  return {
    name,
    serviceIds: rawServiceIds.map((serviceId) => serviceId.trim()),
  };
}

function parseStatusBody(body: unknown): boolean {
  if (!isRecord(body) || typeof body.isActive !== 'boolean') {
    throw new BadRequestException('isActive must be a boolean.');
  }

  return body.isActive;
}

@Controller('staff')
export class StaffController {
  constructor(
    @Inject(STAFF_READER)
    private readonly staffReader: StaffReader,
    @Inject(STAFF_WRITER)
    private readonly staffWriter: StaffWriter,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async staffMembers(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items: await this.staffReader.listStaffMembers(businessId),
    };
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async createStaffMember(
    @Req() request: TenantRequest,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const result = await this.staffWriter.createStaffMember(
      businessId,
      parseStaffBody(body),
    );

    if (result.kind === 'service_not_found') {
      throw new NotFoundException('One or more services were not found.');
    }

    return {
      staffMember: result.staffMember,
    };
  }

  @Patch(':staffMemberId')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateStaffMember(
    @Req() request: TenantRequest,
    @Param('staffMemberId') staffMemberId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedStaffMemberId = staffMemberId.trim();

    if (!normalizedStaffMemberId) {
      throw new BadRequestException('staffMemberId is required.');
    }

    const result = await this.staffWriter.updateStaffMember(
      businessId,
      normalizedStaffMemberId,
      parseStaffBody(body),
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException('Staff member not found.');
    }

    if (result.kind === 'service_not_found') {
      throw new NotFoundException('One or more services were not found.');
    }

    return {
      staffMember: result.staffMember,
    };
  }

  @Patch(':staffMemberId/status')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateStaffMemberStatus(
    @Req() request: TenantRequest,
    @Param('staffMemberId') staffMemberId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedStaffMemberId = staffMemberId.trim();

    if (!normalizedStaffMemberId) {
      throw new BadRequestException('staffMemberId is required.');
    }

    const staffMember = await this.staffWriter.setStaffMemberActive(
      businessId,
      normalizedStaffMemberId,
      parseStatusBody(body),
    );

    if (!staffMember) {
      throw new NotFoundException('Staff member not found.');
    }

    return {
      staffMember,
    };
  }
}

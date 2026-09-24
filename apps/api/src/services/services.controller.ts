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
import { SERVICE_READER, SERVICE_WRITER } from './services.tokens.js';
import type {
  ServiceCreateInput,
  ServicePrice,
  ServiceReader,
  ServiceUpdateInput,
  ServiceWriter,
} from './services.types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parsePrice(value: unknown): ServicePrice | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isRecord(value)) {
    throw new BadRequestException('price must be an object or null.');
  }

  const minorUnits = value.minorUnits;
  const currencyCode =
    typeof value.currencyCode === 'string'
      ? value.currencyCode.trim().toUpperCase()
      : '';

  if (
    typeof minorUnits !== 'number' ||
    !Number.isSafeInteger(minorUnits) ||
    minorUnits < 0
  ) {
    throw new BadRequestException(
      'price.minorUnits must be a non-negative integer.',
    );
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new BadRequestException(
      'price.currencyCode must contain exactly three letters.',
    );
  }

  return {
    minorUnits,
    currencyCode,
  };
}

function parseServiceBody(
  body: unknown,
): ServiceCreateInput & ServiceUpdateInput {
  if (!isRecord(body)) {
    throw new BadRequestException('Service data is required.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    throw new BadRequestException('name is required.');
  }

  let description: string | null = null;

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      throw new BadRequestException('description must be a string or null.');
    }

    description = body.description.trim() || null;
  }

  const durationMinutes = body.durationMinutes;

  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new BadRequestException(
      'durationMinutes must be a positive integer.',
    );
  }

  return {
    name,
    description,
    durationMinutes,
    price: parsePrice(body.price),
  };
}

function parseStatusBody(body: unknown): boolean {
  if (!isRecord(body) || typeof body.isActive !== 'boolean') {
    throw new BadRequestException('isActive must be a boolean.');
  }

  return body.isActive;
}

@Controller('services')
export class ServicesController {
  constructor(
    @Inject(SERVICE_READER)
    private readonly serviceReader: ServiceReader,
    @Inject(SERVICE_WRITER)
    private readonly serviceWriter: ServiceWriter,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async services(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items: await this.serviceReader.listServices(businessId),
    };
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async createService(@Req() request: TenantRequest, @Body() body: unknown) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const input = parseServiceBody(body);

    return {
      service: await this.serviceWriter.createService(businessId, input),
    };
  }

  @Patch(':serviceId')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateService(
    @Req() request: TenantRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedServiceId = serviceId.trim();

    if (!normalizedServiceId) {
      throw new BadRequestException('serviceId is required.');
    }

    const service = await this.serviceWriter.updateService(
      businessId,
      normalizedServiceId,
      parseServiceBody(body),
    );

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return {
      service,
    };
  }

  @Patch(':serviceId/status')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateServiceStatus(
    @Req() request: TenantRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedServiceId = serviceId.trim();

    if (!normalizedServiceId) {
      throw new BadRequestException('serviceId is required.');
    }

    const service = await this.serviceWriter.setServiceActive(
      businessId,
      normalizedServiceId,
      parseStatusBody(body),
    );

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return {
      service,
    };
  }
}

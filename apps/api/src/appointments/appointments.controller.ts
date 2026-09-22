import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  TenantContextGuard,
  type TenantRequest,
} from '../tenancy/tenant-context.guard.js';
import {
  APPOINTMENT_AVAILABLE_SLOTS_READER,
  APPOINTMENT_READER,
  APPOINTMENT_SCHEDULING_OPTIONS_READER,
  APPOINTMENT_WRITER,
} from './appointments.tokens.js';
import type {
  AppointmentAvailableSlotsReader,
  AppointmentCreateInput,
  AppointmentLifecycleStatus,
  AppointmentReader,
  AppointmentSchedulingOptionsReader,
  AppointmentWriter,
} from './appointments.types.js';

function parseCreateAppointmentBody(body: unknown): AppointmentCreateInput {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('Appointment data is required.');
  }

  const record = body as Record<string, unknown>;

  const contactId =
    typeof record.contactId === 'string' ? record.contactId.trim() : '';
  const serviceId =
    typeof record.serviceId === 'string' ? record.serviceId.trim() : '';
  const staffMemberId =
    typeof record.staffMemberId === 'string'
      ? record.staffMemberId.trim()
      : '';
  const startsAt =
    typeof record.startsAt === 'string' ? record.startsAt.trim() : '';

  if (!contactId || !serviceId || !staffMemberId || !startsAt) {
    throw new BadRequestException(
      'contactId, serviceId, staffMemberId and startsAt are required.',
    );
  }

  const parsedStartsAt = new Date(startsAt);

  if (Number.isNaN(parsedStartsAt.getTime())) {
    throw new BadRequestException('startsAt must be a valid date-time.');
  }

  return {
    contactId,
    serviceId,
    staffMemberId,
    startsAt: parsedStartsAt.toISOString(),
  };
}

function parseAppointmentStatusBody(
  body: unknown,
): AppointmentLifecycleStatus {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('Appointment status is required.');
  }

  const record = body as Record<string, unknown>;
  const status =
    typeof record.status === 'string' ? record.status.trim() : '';

  if (
    status !== 'CANCELLED' &&
    status !== 'COMPLETED' &&
    status !== 'NO_SHOW'
  ) {
    throw new BadRequestException(
      'status must be CANCELLED, COMPLETED or NO_SHOW.',
    );
  }

  return status;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function parseAvailableSlotsQuery(query: unknown) {
  if (typeof query !== 'object' || query === null) {
    throw new BadRequestException(
      'serviceId, staffMemberId and date are required.',
    );
  }

  const record = query as Record<string, unknown>;

  const serviceId =
    typeof record.serviceId === 'string'
      ? record.serviceId.trim()
      : '';

  const staffMemberId =
    typeof record.staffMemberId === 'string'
      ? record.staffMemberId.trim()
      : '';

  const date =
    typeof record.date === 'string'
      ? record.date.trim()
      : '';

  if (!serviceId || !staffMemberId || !date) {
    throw new BadRequestException(
      'serviceId, staffMemberId and date are required.',
    );
  }

  if (!isIsoDate(date)) {
    throw new BadRequestException(
      'date must be a valid YYYY-MM-DD date.',
    );
  }

  return {
    serviceId,
    staffMemberId,
    date,
  };
}

@Controller('appointments')
export class AppointmentsController {
  constructor(
    @Inject(APPOINTMENT_READER)
    private readonly appointmentReader: AppointmentReader,
    @Inject(APPOINTMENT_WRITER)
    private readonly appointmentWriter: AppointmentWriter,
    @Inject(APPOINTMENT_SCHEDULING_OPTIONS_READER)
    private readonly schedulingOptionsReader: AppointmentSchedulingOptionsReader,
    @Inject(APPOINTMENT_AVAILABLE_SLOTS_READER)
    private readonly availableSlotsReader: AppointmentAvailableSlotsReader,
  ) {}

  @Get()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async appointments(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    return {
      items: await this.appointmentReader.listAppointments(businessId),
    };
  }

  @Get('options')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async schedulingOptions(@Req() request: TenantRequest) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const options = await this.schedulingOptionsReader.getOptions(businessId);

    if (!options) {
      throw new NotFoundException('Business scheduling options not found.');
    }

    return options;
  }

  @Get('available-slots')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async availableSlots(
    @Req() request: TenantRequest,
    @Query() query: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException(
        'Tenant context is required.',
      );
    }

    const input = parseAvailableSlotsQuery(query);

    const result = await this.availableSlotsReader.getAvailableSlots(
      businessId,
      input,
    );

    if (result.kind === 'invalid') {
      throw new BadRequestException(
        'date must be a valid YYYY-MM-DD date.',
      );
    }

    if (result.kind === 'not_found') {
      throw new NotFoundException(
        'Service or staff member not found.',
      );
    }

    if (result.kind === 'configuration') {
      throw new ConflictException(
        'The selected staff member is not configured for that service.',
      );
    }

    return result.availability;
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async createAppointment(
    @Req() request: TenantRequest,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const input = parseCreateAppointmentBody(body);

    const result = await this.appointmentWriter.createAppointment(
      businessId,
      input,
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException(
        'Contact, service or staff member not found.',
      );
    }

    if (result.kind === 'conflict') {
      throw new ConflictException({
        message:
          'Appointment cannot be scheduled with the requested configuration.',
        reason: result.reason,
      });
    }

    return {
      appointment: result.appointment,
    };
  }

  @Patch(':appointmentId/status')
  @UseGuards(SupabaseAuthGuard, TenantContextGuard)
  async updateAppointmentStatus(
    @Req() request: TenantRequest,
    @Param('appointmentId') appointmentId: string,
    @Body() body: unknown,
  ) {
    const businessId = request.tenantContext?.businessId;

    if (!businessId) {
      throw new InternalServerErrorException('Tenant context is required.');
    }

    const normalizedAppointmentId = appointmentId.trim();

    if (!normalizedAppointmentId) {
      throw new BadRequestException('appointmentId is required.');
    }

    const status = parseAppointmentStatusBody(body);

    const result = await this.appointmentWriter.updateAppointmentStatus(
      businessId,
      {
        appointmentId: normalizedAppointmentId,
        status,
      },
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException('Appointment not found.');
    }

    if (result.kind === 'conflict') {
      throw new ConflictException({
        message:
          'Only scheduled appointments can change lifecycle status.',
        currentStatus: result.currentStatus,
      });
    }

    return {
      appointment: result.appointment,
    };
  }
}

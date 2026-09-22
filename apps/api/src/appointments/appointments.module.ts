import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AppointmentsController } from './appointments.controller.js';
import {
  APPOINTMENT_AVAILABLE_SLOTS_READER,
  APPOINTMENT_READER,
  APPOINTMENT_SCHEDULING_OPTIONS_READER,
  APPOINTMENT_WRITER,
} from './appointments.tokens.js';
import { DatabaseAppointmentAvailableSlotsReader } from './database-appointment-available-slots-reader.js';
import { DatabaseAppointmentReader } from './database-appointment-reader.js';
import { DatabaseAppointmentSchedulingOptionsReader } from './database-appointment-scheduling-options-reader.js';
import { DatabaseAppointmentWriter } from './database-appointment-writer.js';

@Module({
  imports: [AuthModule, DatabaseModule, TenancyModule],
  controllers: [AppointmentsController],
  providers: [
    DatabaseAppointmentAvailableSlotsReader,
    DatabaseAppointmentReader,
    DatabaseAppointmentSchedulingOptionsReader,
    DatabaseAppointmentWriter,
    {
      provide: APPOINTMENT_AVAILABLE_SLOTS_READER,
      useExisting: DatabaseAppointmentAvailableSlotsReader,
    },
    {
      provide: APPOINTMENT_READER,
      useExisting: DatabaseAppointmentReader,
    },
    {
      provide: APPOINTMENT_SCHEDULING_OPTIONS_READER,
      useExisting: DatabaseAppointmentSchedulingOptionsReader,
    },
    {
      provide: APPOINTMENT_WRITER,
      useExisting: DatabaseAppointmentWriter,
    },
  ],
})
export class AppointmentsModule {}

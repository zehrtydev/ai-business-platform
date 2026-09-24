import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../client.js';
import { services } from '../schema/service.js';

export interface ServicePrice {
  minorUnits: number;
  currencyCode: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price?: ServicePrice | null;
}

export interface UpdateServiceInput {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeDescription(
  description: string | null | undefined,
): string | null {
  if (description === null || description === undefined) {
    return null;
  }

  const normalized = description.trim();

  return normalized || null;
}

function normalizeDurationMinutes(durationMinutes: number): number {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('Service duration must be a positive integer.');
  }

  return durationMinutes;
}

function normalizePrice(price: ServicePrice | null | undefined): {
  priceMinorUnits: number | null;
  currencyCode: string | null;
} {
  if (price === null || price === undefined) {
    return {
      priceMinorUnits: null,
      currencyCode: null,
    };
  }

  if (!Number.isSafeInteger(price.minorUnits) || price.minorUnits < 0) {
    throw new Error(
      'Service price minor units must be a non-negative safe integer.',
    );
  }

  const currencyCode = price.currencyCode.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      'Service currency code must contain exactly three letters.',
    );
  }

  return {
    priceMinorUnits: price.minorUnits,
    currencyCode,
  };
}

function mapService(row: {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ServiceRecord {
  const price =
    row.priceMinorUnits === null || row.currencyCode === null
      ? null
      : {
          minorUnits: row.priceMinorUnits,
          currencyCode: row.currencyCode,
        };

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    price,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const serviceSelection = {
  id: services.id,
  name: services.name,
  description: services.description,
  durationMinutes: services.durationMinutes,
  priceMinorUnits: services.priceMinorUnits,
  currencyCode: services.currencyCode,
  isActive: services.isActive,
  createdAt: services.createdAt,
  updatedAt: services.updatedAt,
};

export async function listServicesForBusiness(
  db: Database,
  businessId: string,
): Promise<ServiceRecord[]> {
  const normalizedBusinessId = businessId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  const rows = await db
    .select(serviceSelection)
    .from(services)
    .where(eq(services.businessId, normalizedBusinessId))
    .orderBy(asc(services.name), asc(services.id));

  return rows.map(mapService);
}

export async function createServiceForBusiness(
  db: Database,
  businessId: string,
  input: CreateServiceInput,
): Promise<ServiceRecord> {
  const normalizedBusinessId = businessId.trim();
  const name = input.name.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!name) {
    throw new Error('Service name is required.');
  }

  const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  const description = normalizeDescription(input.description);
  const price = normalizePrice(input.price);

  const [created] = await db
    .insert(services)
    .values({
      businessId: normalizedBusinessId,
      name,
      description,
      durationMinutes,
      priceMinorUnits: price.priceMinorUnits,
      currencyCode: price.currencyCode,
    })
    .returning(serviceSelection);

  if (!created) {
    throw new Error('Service could not be created.');
  }

  return mapService(created);
}

export async function updateServiceForBusiness(
  db: Database,
  businessId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<ServiceRecord | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedServiceId = serviceId.trim();
  const name = input.name.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedServiceId)) {
    return null;
  }

  if (!name) {
    throw new Error('Service name is required.');
  }

  const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  const description = normalizeDescription(input.description);
  const price = normalizePrice(input.price);

  const [updated] = await db
    .update(services)
    .set({
      name,
      description,
      durationMinutes,
      priceMinorUnits: price.priceMinorUnits,
      currencyCode: price.currencyCode,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(services.businessId, normalizedBusinessId),
        eq(services.id, normalizedServiceId),
      ),
    )
    .returning(serviceSelection);

  return updated ? mapService(updated) : null;
}

export async function setServiceActiveForBusiness(
  db: Database,
  businessId: string,
  serviceId: string,
  isActive: boolean,
): Promise<ServiceRecord | null> {
  const normalizedBusinessId = businessId.trim();
  const normalizedServiceId = serviceId.trim();

  if (!normalizedBusinessId) {
    throw new Error('Business ID is required.');
  }

  if (!isUuid(normalizedServiceId)) {
    return null;
  }

  const [updated] = await db
    .update(services)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(services.businessId, normalizedBusinessId),
        eq(services.id, normalizedServiceId),
      ),
    )
    .returning(serviceSelection);

  return updated ? mapService(updated) : null;
}

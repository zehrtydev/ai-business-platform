export interface ServicePrice {
  minorUnits: number;
  currencyCode: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCreateInput {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
}

export interface ServiceUpdateInput {
  name: string;
  description: string | null;
  durationMinutes: number;
  price: ServicePrice | null;
}

export interface ServiceReader {
  listServices(businessId: string): Promise<readonly ServiceItem[]>;
}

export interface ServiceWriter {
  createService(
    businessId: string,
    input: ServiceCreateInput,
  ): Promise<ServiceItem>;

  updateService(
    businessId: string,
    serviceId: string,
    input: ServiceUpdateInput,
  ): Promise<ServiceItem | null>;

  setServiceActive(
    businessId: string,
    serviceId: string,
    isActive: boolean,
  ): Promise<ServiceItem | null>;
}

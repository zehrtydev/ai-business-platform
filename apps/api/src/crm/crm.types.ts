export interface CrmContactListItem {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: string | null;
  createdAt: string;
  lead: {
    id: string;
    pipelineStage: {
      id: string;
      name: string;
    };
    service: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface CrmContactDetail {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  lastInteractionAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    pipelineStage: {
      id: string;
      name: string;
    };
    service: {
      id: string;
      name: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CrmContactReader {
  listContacts(businessId: string): Promise<readonly CrmContactListItem[]>;

  getContact(
    businessId: string,
    contactId: string,
  ): Promise<CrmContactDetail | null>;
}

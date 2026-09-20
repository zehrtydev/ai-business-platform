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

export interface CrmContactReader {
  listContacts(businessId: string): Promise<readonly CrmContactListItem[]>;
}

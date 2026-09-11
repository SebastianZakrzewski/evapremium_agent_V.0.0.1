import type { CreateLeadInput, CreateLeadResult } from '../domain/lead';
import { createLead } from '../domain/lead';
import { BitrixLeadClient } from './fake-bitrix-http';

export class LeadResolver {
  constructor(private readonly bitrix: BitrixLeadClient) {}

  create(input: CreateLeadInput): Promise<CreateLeadResult> {
    return createLead(input, this.bitrix);
  }
}

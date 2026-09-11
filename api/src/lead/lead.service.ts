import { Inject, Injectable } from '@nestjs/common';
import {
  createLead,
  type CreateLeadInput,
  type CreateLeadResult,
} from '../domain/lead';
import { BitrixLeadClient } from './fake-bitrix-http';

export const BITRIX_LEAD_CLIENT = Symbol('BITRIX_LEAD_CLIENT');

@Injectable()
export class LeadService {
  constructor(@Inject(BITRIX_LEAD_CLIENT) private readonly bitrix: BitrixLeadClient) {}

  create(input: CreateLeadInput): Promise<CreateLeadResult> {
    return createLead(input, this.bitrix);
  }
}

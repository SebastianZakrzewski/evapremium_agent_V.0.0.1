import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AGENT_EVENTS,
  type AgentEventSink,
} from '../agent-events/agent-event';
import { BitrixLeadClient } from './fake-bitrix-http';
import { LeadAttemptService } from './lead-attempt.service';

export const BITRIX_LEAD_CLIENT = Symbol('BITRIX_LEAD_CLIENT');

@Injectable()
export class LeadService extends LeadAttemptService {
  constructor(
    @Inject(BITRIX_LEAD_CLIENT) bitrix: BitrixLeadClient,
    @Optional() @Inject(AGENT_EVENTS) events?: AgentEventSink,
  ) {
    super(bitrix, events);
  }
}

import type { AgentEventSink } from '../agent-events/agent-event';
import { recordLeadAttempted } from '../agent-events/record-agent-event';
import {
  createLead,
  type CreateLeadInput,
  type CreateLeadResult,
} from '../domain/lead';
import type { BitrixLeadGateway } from '../domain/lead';

export class LeadAttemptService {
  constructor(
    private readonly bitrix: BitrixLeadGateway,
    private readonly events?: AgentEventSink,
  ) {}

  async create(input: CreateLeadInput): Promise<CreateLeadResult> {
    const result = await createLead(input, this.bitrix);
    recordLeadAttempted(this.events, input.sessionId, result.status);
    return result;
  }
}

import type { Agent } from '@mastra/core/agent';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { createEvaMastraAgent } from '../mastra/create-eva-mastra-agent';
import { ShopTools } from './shop-tools';

export class MastraChatAgent implements ChatAgent {
  private readonly agent: Agent;

  constructor(tools: ShopTools) {
    this.agent = createEvaMastraAgent(tools);
  }

  async handle(message: string): Promise<ChatAgentTurn> {
    const result = await this.agent.generate(message);
    const text =
      typeof result === 'object' && result !== null && 'text' in result
        ? String(result.text)
        : String(result);
    return { text, data: { status: 'generated' } };
  }
}

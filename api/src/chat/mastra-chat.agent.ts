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
    let text = '';
    for await (const chunk of this.stream(message)) {
      text += chunk;
    }
    return { text, data: { status: 'generated' } };
  }

  async *stream(message: string): AsyncIterable<string> {
    const output = await this.agent.stream(message);
    for await (const chunk of output.textStream) {
      if (typeof chunk === 'string' && chunk.length > 0) {
        yield chunk;
      }
    }
  }
}

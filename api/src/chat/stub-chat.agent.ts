import { runWithTurnSession } from '../agent-events/turn-session-context';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { ShopTools } from './shop-tools';

export class StubChatAgent implements ChatAgent {
  constructor(private readonly tools: ShopTools) {}

  handle(message: string, sessionId?: string): Promise<ChatAgentTurn> {
    const run = () => this.execute(message.trim());
    return sessionId ? runWithTurnSession(sessionId, run) : run();
  }

  private execute(trimmed: string): Promise<ChatAgentTurn> {
    if (trimmed === 'resolve vw golf 8 kombi 2021') {
      const data = this.tools.resolveTemplate({
        brand: 'vw',
        model: 'golf 8',
        bodyType: 'kombi',
        year: 2021,
      });
      return Promise.resolve({ text: data.status, data });
    }

    if (trimmed === 'quote passenger_car komplet-5szt') {
      const data = this.tools.quotePrice({
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'komplet-5szt',
      });
      return Promise.resolve({
        text: data.status,
        data,
      });
    }

    if (trimmed.startsWith('leaf ')) {
      const slug = trimmed.slice('leaf '.length).trim();
      const data = this.tools.lookupLeaf(slug);
      return Promise.resolve({
        text: data.status,
        data,
      });
    }

    return Promise.resolve({ text: 'unsupported', data: { status: 'unsupported' } });
  }
}

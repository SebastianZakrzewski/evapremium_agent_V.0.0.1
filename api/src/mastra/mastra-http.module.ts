import type { Mastra } from '@mastra/core';
import { MastraModule } from '@mastra/nestjs';
import { ChatModule } from '../chat/chat.module';
import { EVA_MASTRA } from './eva-mastra.token';
import { MASTRA_HTTP_PREFIX, shouldMountMastraHttp } from './studio-http';

export function mastraHttpModules() {
  if (!shouldMountMastraHttp(process.env)) {
    return [];
  }
  return [
    MastraModule.registerAsync({
      imports: [ChatModule],
      inject: [EVA_MASTRA],
      useFactory: (mastra: Mastra) => ({
        mastra,
        prefix: MASTRA_HTTP_PREFIX,
        auth: { enabled: true, allowQueryApiKey: false },
      }),
    }),
  ];
}

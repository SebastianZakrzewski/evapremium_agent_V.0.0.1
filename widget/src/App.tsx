import { ChatPanel } from './chat/ChatPanel';
import type { ChatApi } from './chat/chat-api';
import { createHttpChatApi } from './chat/http-chat-api';

const defaultApi = createHttpChatApi(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
);

type AppProps = {
  api?: ChatApi;
};

export function App({ api = defaultApi }: AppProps) {
  return (
    <main>
      <h1>EVA Premium</h1>
      <ChatPanel api={api} />
    </main>
  );
}

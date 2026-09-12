import { ChatPanel } from './chat/ChatPanel';
import type { ChatApi } from './chat/chat-api';
import { createHttpChatApi } from './chat/http-chat-api';

const defaultApi = createHttpChatApi(import.meta.env.VITE_API_BASE_URL ?? '');

type AppProps = {
  api?: ChatApi;
};

export function App({ api = defaultApi }: AppProps) {
  return <ChatPanel api={api} />;
}

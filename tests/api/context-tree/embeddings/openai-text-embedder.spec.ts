import {
  OPENAI_EMBEDDING_MODEL,
  OpenAiTextEmbedder,
} from '@api/context-tree/embeddings/openai-text-embedder';

describe('OpenAiTextEmbedder', () => {
  it('posts text-embedding-3-small and returns the vector', async () => {
    const embedder = new OpenAiTextEmbedder('sk-test', async (url, init) => {
      expect(url).toBe('https://api.openai.com/v1/embeddings');
      expect(init.headers.Authorization).toBe('Bearer sk-test');
      const payload = JSON.parse(init.body) as { model: string; input: string };
      expect(payload.model).toBe(OPENAI_EMBEDDING_MODEL);
      expect(payload.input).toBe('Dostawa\nWysyłka');
      return {
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
      };
    });
    await expect(embedder.embed('Dostawa\nWysyłka')).resolves.toEqual([
      0.1, 0.2,
    ]);
  });
});

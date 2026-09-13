import type { TextEmbedder } from '../ports';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export class OpenAiTextEmbedder implements TextEmbedder {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch as FetchLike,
  ) {}

  async embed(text: string): Promise<number[] | null> {
    const response = await this.fetchImpl(
      'https://api.openai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_EMBEDDING_MODEL,
          input: text,
        }),
      },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as {
      data?: { embedding?: number[] }[];
    };
    return body.data?.[0]?.embedding ?? null;
  }
}

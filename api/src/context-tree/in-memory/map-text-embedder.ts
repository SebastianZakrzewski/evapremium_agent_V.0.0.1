import type { TextEmbedder } from '../ports';

export class MapTextEmbedder implements TextEmbedder {
  constructor(private readonly vectors: Record<string, number[]>) {}

  embed(text: string): number[] | null {
    return this.vectors[text] ?? null;
  }
}

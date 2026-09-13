import type { TextEmbedder } from '../ports';

export class NullTextEmbedder implements TextEmbedder {
  embed(text: string): null {
    void text;
    return null;
  }
}

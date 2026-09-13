import type { ShopIntent } from './intents/schema';

export type PublishedPromptBlockReader = {
  listPublishedIds: () => Promise<string[]>;
  preview: (
    ids: string[],
    context: Record<string, unknown>,
  ) => Promise<string>;
};

export type MastraWithPromptEditor = {
  getEditor?: () => unknown;
};

type PromptEditorApi = {
  prompt: {
    listResolved: (args?: {
      status?: 'published' | 'draft' | 'archived';
    }) => Promise<{ promptBlocks?: Array<{ id: string }> }>;
    preview: (
      blocks: Array<{ type: 'prompt_block_ref'; id: string }>,
      context: Record<string, unknown>,
    ) => Promise<string>;
  };
};

function asPromptEditor(value: unknown): PromptEditorApi | undefined {
  if (!value || typeof value !== 'object' || !('prompt' in value)) {
    return undefined;
  }
  return value as PromptEditorApi;
}

export function promptBlockReaderFromMastra(
  mastra?: MastraWithPromptEditor,
): PublishedPromptBlockReader | undefined {
  const editor = asPromptEditor(mastra?.getEditor?.());
  if (!editor?.prompt) {
    return undefined;
  }
  return {
    async listPublishedIds() {
      const listed = await editor.prompt.listResolved({ status: 'published' });
      return (listed.promptBlocks ?? []).map((block) => block.id);
    },
    preview(ids, context) {
      return editor.prompt.preview(
        ids.map((id) => ({ type: 'prompt_block_ref', id })),
        context,
      );
    },
  };
}

export async function instructionsFromPublishedPromptBlocks(
  reader: PublishedPromptBlockReader | undefined,
  intent: ShopIntent,
): Promise<string | undefined> {
  if (!reader) {
    return undefined;
  }
  try {
    const ids = await reader.listPublishedIds();
    if (ids.length === 0) {
      return undefined;
    }
    const text = (await reader.preview(ids, { intent })).trim();
    return text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}

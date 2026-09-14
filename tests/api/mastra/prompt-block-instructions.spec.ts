import { instructionsFromPublishedPromptBlocks } from '@api/mastra/prompt-block-instructions';

describe('instructionsFromPublishedPromptBlocks', () => {
  it('joins published prompt-blocks with intent in preview context', async () => {
    const preview = jest.fn(async () => 'blok ze Studio');
    const text = await instructionsFromPublishedPromptBlocks(
      {
        listPublishedIds: async () => ['evapremium-agent-v-0-0-1'],
        preview,
      },
      'pricing',
    );

    expect(text).toBe('blok ze Studio');
    expect(preview).toHaveBeenCalledWith(
      ['evapremium-agent-v-0-0-1'],
      { intent: 'pricing' },
    );
  });

  it('returns undefined when no published blocks exist', async () => {
    await expect(
      instructionsFromPublishedPromptBlocks(
        {
          listPublishedIds: async () => [],
          preview: async () => 'unused',
        },
        'product_info',
      ),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the editor throws', async () => {
    await expect(
      instructionsFromPublishedPromptBlocks(
        {
          listPublishedIds: async () => {
            throw new Error('storage down');
          },
          preview: async () => 'unused',
        },
        'pricing',
      ),
    ).resolves.toBeUndefined();
  });
});

export type TemplateCascadeInput = {
  brandKey?: string;
  modelKey?: string;
};

export type TemplateCascadeResult = {
  status: 'not-implemented';
};

export function resolveTemplate(
  input: TemplateCascadeInput,
): TemplateCascadeResult {
  void input;
  return { status: 'not-implemented' };
}

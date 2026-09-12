function isExpectedHttpError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as {
    getStatus?: unknown;
    getResponse?: unknown;
  };
  return (
    typeof candidate.getStatus === 'function' &&
    typeof candidate.getResponse === 'function'
  );
}

export function reportUnexpectedError(
  error: unknown,
  capture: (exception: unknown) => void,
): void {
  if (isExpectedHttpError(error)) {
    return;
  }
  capture(error);
}

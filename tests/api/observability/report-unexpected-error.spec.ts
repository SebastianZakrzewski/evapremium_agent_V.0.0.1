import { reportUnexpectedError } from '@api/observability/report-unexpected-error';

class FakeHttpError extends Error {
  getStatus() {
    return 404;
  }

  getResponse() {
    return { message: 'missing session' };
  }
}

describe('reportUnexpectedError', () => {
  it('does not report Nest HTTP exceptions (expected client errors)', () => {
    const capture = jest.fn();
    reportUnexpectedError(new FakeHttpError('missing session'), capture);
    expect(capture).not.toHaveBeenCalled();
  });

  it('reports unexpected failures that the chat stream would otherwise swallow', () => {
    const capture = jest.fn();
    const error = new Error('supabase insert failed');
    reportUnexpectedError(error, capture);
    expect(capture).toHaveBeenCalledWith(error);
  });
});

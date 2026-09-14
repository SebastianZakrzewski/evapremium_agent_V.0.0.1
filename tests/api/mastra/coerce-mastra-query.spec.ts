import { coerceMastraOrderByQuery, parseMastraQueryString } from '@api/mastra/coerce-mastra-query';

describe('coerceMastraOrderByQuery', () => {
  it('turns Studio string orderBy into the object Nest validates', () => {
    const query: Record<string, unknown> = {
      orderBy: 'createdAt',
      sortDirection: 'ASC',
    };
    coerceMastraOrderByQuery(query);
    expect(query.orderBy).toEqual({ field: 'createdAt', direction: 'ASC' });
  });

  it('parses JSON orderBy strings', () => {
    const query: Record<string, unknown> = {
      orderBy: '{"field":"updatedAt","direction":"DESC"}',
    };
    coerceMastraOrderByQuery(query);
    expect(query.orderBy).toEqual({ field: 'updatedAt', direction: 'DESC' });
  });

  it('maps versionNumber to createdAt so publish version lists validate', () => {
    const query: Record<string, unknown> = { orderBy: 'versionNumber' };
    coerceMastraOrderByQuery(query);
    expect(query.orderBy).toEqual({ field: 'createdAt', direction: 'DESC' });
  });

  it('leaves object orderBy unchanged', () => {
    const orderBy = { field: 'createdAt', direction: 'DESC' };
    const query: Record<string, unknown> = { orderBy };
    coerceMastraOrderByQuery(query);
    expect(query.orderBy).toBe(orderBy);
  });

  it('parses Express query strings used by Studio publish', () => {
    const query = parseMastraQueryString(
      'orderBy=createdAt&sortDirection=DESC',
    );
    expect(query.orderBy).toEqual({ field: 'createdAt', direction: 'DESC' });
  });
});

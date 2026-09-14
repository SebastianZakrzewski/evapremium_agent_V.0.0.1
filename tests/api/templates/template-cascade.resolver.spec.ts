import { TemplateCascadeResolver } from '@api/templates/template-cascade.resolver';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '@api/templates/in-memory/in-memory-catalogs';

describe('TemplateCascadeResolver', () => {
  const resolver = new TemplateCascadeResolver(
    new InMemoryTemplateCatalog(CASCADE_TEMPLATES),
    new InMemoryAliasCatalog(CASCADE_ALIASES),
  );

  it('resolves a known vehicle to one template', () => {
    expect(
      resolver.resolve({
        brand: 'vw',
        model: 'golf 8',
        bodyType: 'kombi',
        year: 2021,
      }),
    ).toMatchObject({
      status: 'one',
      template: { id: 'tmpl-golf-mk8-wagon' },
    });
  });

  it('returns none and many from the same catalogs', () => {
    expect(resolver.resolve({ brand: 'brak' })).toEqual({ status: 'none' });
    expect(resolver.resolve({ brand: 'vw' }).status).toBe('many');
  });
});

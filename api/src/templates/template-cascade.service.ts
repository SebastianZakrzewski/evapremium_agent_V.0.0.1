import { Inject, Injectable } from '@nestjs/common';
import { ALIAS_CATALOG, TEMPLATE_CATALOG, type AliasCatalog, type TemplateCatalog } from './ports';
import { TemplateCascadeResolver } from './template-cascade.resolver';

@Injectable()
export class TemplateCascadeService extends TemplateCascadeResolver {
  constructor(
    @Inject(TEMPLATE_CATALOG) templates: TemplateCatalog,
    @Inject(ALIAS_CATALOG) aliases: AliasCatalog,
  ) {
    super(templates, aliases);
  }
}

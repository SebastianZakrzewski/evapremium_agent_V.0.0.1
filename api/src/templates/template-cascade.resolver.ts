import {
  resolveTemplate,
  type TemplateCascadeInput,
  type TemplateCascadeResult,
} from '../domain/template-cascade';
import type { AliasCatalog, TemplateCatalog } from './ports';

export class TemplateCascadeResolver {
  constructor(
    private readonly templates: TemplateCatalog,
    private readonly aliases: AliasCatalog,
  ) {}

  resolve(input: TemplateCascadeInput): TemplateCascadeResult {
    return resolveTemplate(input, this.templates.list(), this.aliases.list());
  }
}

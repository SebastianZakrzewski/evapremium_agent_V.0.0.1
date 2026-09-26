import {
  resolveClassifiedTemplate,
  resolveTemplate,
  type TemplateCascadeInput,
  type TemplateCascadeResult,
  type VehicleKeyClassifier,
  type VehicleSlotAlias,
} from '../domain/template-cascade';
import type { AliasCatalog, TemplateCatalog } from './ports';

export class TemplateCascadeResolver {
  constructor(
    private readonly templates: TemplateCatalog,
    private readonly aliases: AliasCatalog,
    private readonly classifier?: VehicleKeyClassifier | null,
  ) {}

  resolve(input: TemplateCascadeInput): Promise<TemplateCascadeResult> {
    const templates = this.templates.list();
    const aliases = this.aliases.list();
    if (!this.classifier) {
      return Promise.resolve(resolveTemplate(input, templates, aliases));
    }
    return resolveClassifiedTemplate(input, templates, aliases, this.classifier);
  }

  listAliases(): VehicleSlotAlias[] {
    return this.aliases.list();
  }
}

import type { MatTemplate, VehicleSlotAlias } from '../../domain/template-cascade';
import type { AliasCatalog, TemplateCatalog } from '../ports';

export class InMemoryTemplateCatalog implements TemplateCatalog {
  constructor(private readonly templates: MatTemplate[]) {}

  list(): MatTemplate[] {
    return this.templates;
  }
}

export class InMemoryAliasCatalog implements AliasCatalog {
  constructor(private readonly aliases: VehicleSlotAlias[]) {}

  list(): VehicleSlotAlias[] {
    return this.aliases;
  }
}

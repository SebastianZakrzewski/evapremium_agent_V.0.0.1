import { Inject, Injectable, Optional } from '@nestjs/common';
import type { VehicleKeyClassifier } from '../domain/template-cascade';
import {
  ALIAS_CATALOG,
  TEMPLATE_CATALOG,
  VEHICLE_KEY_CLASSIFIER,
  type AliasCatalog,
  type TemplateCatalog,
} from './ports';
import { TemplateCascadeResolver } from './template-cascade.resolver';

@Injectable()
export class TemplateCascadeService extends TemplateCascadeResolver {
  constructor(
    @Inject(TEMPLATE_CATALOG) templates: TemplateCatalog,
    @Inject(ALIAS_CATALOG) aliases: AliasCatalog,
    @Optional()
    @Inject(VEHICLE_KEY_CLASSIFIER)
    classifier?: VehicleKeyClassifier | null,
  ) {
    super(templates, aliases, classifier);
  }
}

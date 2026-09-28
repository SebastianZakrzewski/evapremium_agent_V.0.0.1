/**
 * Shop-facing widget object. It is the configuration interface.
 * `showProduct` is one field: the shop's own card, addressed by id and HTTPS URL.
 * `mountObject` renders a shop object beside the chat. The object is an id plus
 * a string map. This module does not name the map keys.
 */
export type ShowProductConfig = {
  productId: string;
  cardUrl: string;
};

export type MountedObject = {
  id: string;
  fields: Record<string, string>;
};

export type MountObject = (
  object: MountedObject,
  host: HTMLElement,
) => void | (() => void);

export const EVA_WIDGET_SOURCE = 'eva-widget';
export const EVA_OBJECT_MESSAGE_TYPE = 'eva.object';

export type EvaObjectMessage = {
  source: typeof EVA_WIDGET_SOURCE;
  type: typeof EVA_OBJECT_MESSAGE_TYPE;
  object: MountedObject | null;
};

export type WidgetConfig = {
  showProduct?: ShowProductConfig;
  mountObject?: MountObject;
};

function readShowProduct(config: ShowProductConfig): ShowProductConfig | null {
  const productId = config.productId.trim();
  if (productId === '') {
    return null;
  }
  let cardUrl: URL;
  try {
    cardUrl = new URL(config.cardUrl.trim());
  } catch {
    return null;
  }
  if (cardUrl.protocol !== 'https:') {
    return null;
  }
  return { productId, cardUrl: cardUrl.toString() };
}

function readMountedObject(value: unknown): MountedObject | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as { id?: unknown; fields?: unknown };
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    return null;
  }
  if (record.fields === null || typeof record.fields !== 'object' || Array.isArray(record.fields)) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [key, field] of Object.entries(record.fields)) {
    if (typeof field !== 'string') {
      return null;
    }
    fields[key] = field;
  }
  return { id: record.id.trim(), fields };
}

export function readEvaObjectMessage(value: unknown): EvaObjectMessage | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const message = value as { source?: unknown; type?: unknown; object?: unknown };
  if (message.source !== EVA_WIDGET_SOURCE || message.type !== EVA_OBJECT_MESSAGE_TYPE) {
    return null;
  }
  if (message.object === null) {
    return { source: EVA_WIDGET_SOURCE, type: EVA_OBJECT_MESSAGE_TYPE, object: null };
  }
  const object = readMountedObject(message.object);
  if (!object) {
    return null;
  }
  return { source: EVA_WIDGET_SOURCE, type: EVA_OBJECT_MESSAGE_TYPE, object };
}

export function parseWidgetConfig(config: WidgetConfig): WidgetConfig | null {
  const mountObject = typeof config.mountObject === 'function' ? config.mountObject : undefined;
  if (config.showProduct === undefined) {
    return mountObject ? { mountObject } : {};
  }
  const showProduct = readShowProduct(config.showProduct);
  if (!showProduct) {
    return null;
  }
  return mountObject ? { showProduct, mountObject } : { showProduct };
}

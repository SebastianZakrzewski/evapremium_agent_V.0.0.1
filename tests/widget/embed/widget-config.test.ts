import { describe, expect, it } from 'vitest';
import {
  EVA_OBJECT_MESSAGE_TYPE,
  EVA_WIDGET_SOURCE,
  parseWidgetConfig,
  readEvaObjectMessage,
} from '@widget/embed/widget-config';

describe('widget config', () => {
  it('reads showProduct as a field of the widget object', () => {
    expect(
      parseWidgetConfig({
        showProduct: {
          productId: ' audi-a4 ',
          cardUrl: 'https://shop.example/cards/audi-a4',
        },
      }),
    ).toEqual({
      showProduct: {
        productId: 'audi-a4',
        cardUrl: 'https://shop.example/cards/audi-a4',
      },
    });
  });

  it('accepts a widget object without a product card', () => {
    expect(parseWidgetConfig({})).toEqual({});
  });

  it('rejects a showProduct field that is not a shop card address', () => {
    expect(
      parseWidgetConfig({
        showProduct: { productId: '  ', cardUrl: 'https://shop.example/cards/audi-a4' },
      }),
    ).toBeNull();
    expect(
      parseWidgetConfig({
        showProduct: { productId: 'audi-a4', cardUrl: 'http://shop.example/cards/audi-a4' },
      }),
    ).toBeNull();
    expect(
      parseWidgetConfig({
        showProduct: { productId: 'audi-a4', cardUrl: '/cards/audi-a4' },
      }),
    ).toBeNull();
  });

  it('keeps mountObject on the widget object', () => {
    const mountObject = () => undefined;
    expect(parseWidgetConfig({ mountObject })).toEqual({ mountObject });
  });

  it('reads an object message with a string map and a clear', () => {
    expect(
      readEvaObjectMessage({
        source: EVA_WIDGET_SOURCE,
        type: EVA_OBJECT_MESSAGE_TYPE,
        object: { id: ' sku-1 ', fields: { sku: 'sku-1', variant: 'red' } },
      }),
    ).toEqual({
      source: EVA_WIDGET_SOURCE,
      type: EVA_OBJECT_MESSAGE_TYPE,
      object: { id: 'sku-1', fields: { sku: 'sku-1', variant: 'red' } },
    });
    expect(
      readEvaObjectMessage({
        source: EVA_WIDGET_SOURCE,
        type: EVA_OBJECT_MESSAGE_TYPE,
        object: null,
      }),
    ).toEqual({
      source: EVA_WIDGET_SOURCE,
      type: EVA_OBJECT_MESSAGE_TYPE,
      object: null,
    });
  });

  it('rejects an object message that is not the widget contract', () => {
    expect(readEvaObjectMessage({ source: 'shop', type: EVA_OBJECT_MESSAGE_TYPE, object: null })).toBeNull();
    expect(
      readEvaObjectMessage({
        source: EVA_WIDGET_SOURCE,
        type: EVA_OBJECT_MESSAGE_TYPE,
        object: { id: ' ', fields: { sku: 'sku-1' } },
      }),
    ).toBeNull();
    expect(
      readEvaObjectMessage({
        source: EVA_WIDGET_SOURCE,
        type: EVA_OBJECT_MESSAGE_TYPE,
        object: { id: 'sku-1', fields: { price: 10 } },
      }),
    ).toBeNull();
  });
});

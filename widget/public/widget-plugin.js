(function () {
  var script = document.currentScript;
  if (!script || !script.src) {
    return;
  }
  var widgetId = script.getAttribute('data-eva-widget');
  if (!widgetId) {
    return;
  }
  var config = window.widgetPlugin || {};
  var productId = '';
  var cardUrl = '';
  if (config.showProduct) {
    productId = String(config.showProduct.productId || '').trim();
    try {
      var parsed = new URL(String(config.showProduct.cardUrl || '').trim());
      if (parsed.protocol !== 'https:' || !productId) {
        return;
      }
      cardUrl = parsed.toString();
    } catch (error) {
      return;
    }
  }
  var origin = new URL(script.src).origin;
  var src =
    origin + '/?widget=' + encodeURIComponent(widgetId.trim());
  if (cardUrl) {
    src += '&productId=' + encodeURIComponent(productId);
    src += '&cardUrl=' + encodeURIComponent(cardUrl);
  }
  var host = document.createElement('div');
  host.setAttribute('data-eva-widget-host', widgetId);
  if (cardUrl) {
    host.setAttribute('data-eva-product-id', productId);
    host.setAttribute('data-eva-card-url', cardUrl);
  }
  var frame = document.createElement('iframe');
  frame.src = src;
  frame.title = 'Czat';
  host.appendChild(frame);
  if (script.parentNode) {
    script.parentNode.insertBefore(host, script.nextSibling);
  }
})();

(function () {
  var script = document.currentScript;
  if (!script || !script.src) {
    return;
  }
  var widgetId = script.getAttribute('data-eva-widget');
  if (!widgetId) {
    return;
  }
  var origin = new URL(script.src).origin;
  var host = document.createElement('div');
  host.setAttribute('data-eva-widget-host', widgetId);
  var frame = document.createElement('iframe');
  frame.src = origin + '/?widget=' + encodeURIComponent(widgetId);
  frame.title = 'EVA Premium czat';
  host.appendChild(frame);
  if (script.parentNode) {
    script.parentNode.insertBefore(host, script.nextSibling);
  }
})();

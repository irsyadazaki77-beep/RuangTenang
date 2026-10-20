(function () {
  function logError(payload) {
    try {
      var msg = String(payload.message || '').toLowerCase();
      var stack = String(payload.stack || '').toLowerCase();
      var src = String(payload.source || '').toLowerCase();
      if (
        msg.indexOf('websocket') !== -1 ||
        stack.indexOf('websocket') !== -1 ||
        msg.indexOf('hmr') !== -1 ||
        stack.indexOf('vite/client') !== -1 ||
        src.indexOf('vite/client') !== -1 ||
        msg.indexOf('socket') !== -1
      ) return;

      fetch('/api/v1/client-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  window.onerror = function (message, source, lineno, colno, error) {
    logError({
      type: 'onerror', message: message, source: source, lineno: lineno,
      colno: colno, stack: error ? error.stack : null, url: window.location.href
    });
  };

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    logError({
      type: 'unhandledrejection',
      message: reason ? (reason.message || String(reason)) : 'Unknown rejection',
      stack: reason && reason.stack ? reason.stack : null,
      url: window.location.href
    });
  });
})();

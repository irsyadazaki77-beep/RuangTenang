// RuangCoder Virtual Runtime Service Worker
// Provides sandbox file interception for multi-file ESM, stylesheets, and local assets

const _CACHE_NAME = 'ruangcoder-virtual-v1';
let virtualFiles = {};

self.addEventListener('install', _event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNC_VIRTUAL_FILES') {
    virtualFiles = event.data.files || {};
  }
});

function getMimeType(filename) {
  if (filename.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filename.endsWith('.js') || filename.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (filename.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filename.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filename.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'text/plain; charset=utf-8';
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only intercept requests directed to the virtual sandbox scope
  if (url.pathname.startsWith('/ruangcoder-virtual/')) {
    const rawPath = decodeURIComponent(url.pathname.replace('/ruangcoder-virtual/', ''));
    const cleanPath = rawPath.replace(/^\.?\//, '');
    const targetFile = cleanPath || 'index.html';

    if (virtualFiles && typeof virtualFiles[targetFile] === 'string') {
      const mime = getMimeType(targetFile);
      const response = new Response(virtualFiles[targetFile], {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*'
        }
      });
      event.respondWith(response);
      return;
    }

    // 404 response for missing virtual file
    event.respondWith(
      new Response(`// RuangCoder Virtual Sandbox: File "${targetFile}" not found in virtual workspace.`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    );
  }
});

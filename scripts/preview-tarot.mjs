import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createMinitoolsHandler } from 'file:///G:/cloudflare/myapp/src/features/minitools/routes.mjs';
import { shell } from 'file:///G:/cloudflare/myapp/src/pages/navigation.js';

const previewOrigin = 'http://127.0.0.1:8812';
const workerOrigin = 'http://127.0.0.1:8811';
const mainProject = new URL('file:///G:/cloudflare/myapp/');
const assets = new Map([
  ['/assets/styles/shell.css', ['src/client/styles/shell.css', 'text/css']],
  ['/assets/styles/theme.css', ['src/client/styles/theme.css', 'text/css']],
  ['/assets/shell/theme.js', ['src/client/shell/theme.js', 'text/javascript']],
  ['/assets/shell/navigation.js', ['src/client/shell/navigation.js', 'text/javascript']],
  ['/assets/shell/workspace-layout.js', ['src/client/shell/workspace-layout.js', 'text/javascript']],
  ['/assets/icons/anim/fishbone.svg', ['public/assets/icons/anim/fishbone.svg', 'image/svg+xml']],
  ['/records/hu-shi/hu-shi.svg', ['public/records/hu-shi/hu-shi.svg', 'image/svg+xml']],
]);

// The preview uses only a localhost test binding and serves the host's real shell assets.
const handleMinitools = createMinitoolsHandler({ authorize: async () => {}, shell });
const env = {
  MINITOOLS: {
    fetch(request) {
      const source = new URL(request.url);
      const target = new URL(workerOrigin);
      target.pathname = source.pathname;
      target.search = source.search;
      const headers = new Headers(request.headers);
      headers.set('Accept-Encoding', 'identity');
      // The production binding keeps the public origin. Local HTTP uses a second port.
      if (headers.get('Origin') === previewOrigin) headers.set('Origin', workerOrigin);
      return fetch(target, { method: request.method, headers, body:request.body, duplex:'half', redirect:'manual', signal:request.signal });
    },
  },
};

async function dispatch(request) {
  const { pathname } = new URL(request.url);
  if (!['GET', 'HEAD'].includes(request.method) && pathname !== '/minitools/api/reading') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (pathname === '/') return Response.redirect(`${previewOrigin}/minitools/`, 302);
  const asset = assets.get(pathname);
  if (asset) {
    const [file, type] = asset;
    return new Response(await readFile(new URL(file, mainProject)), {
      headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' },
    });
  }
  return await handleMinitools(request, env) ?? new Response('Not found', { status: 404 });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, previewOrigin);
    if (url.origin !== previewOrigin || req.headers.host !== '127.0.0.1:8812') {
      res.writeHead(400).end();
      return;
    }
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    const response = await dispatch(new Request(url, {
      method:req.method, headers:req.headers, signal:controller.signal,
      body:req.method==='POST' ? req : undefined, duplex:'half',
    }));
    const body = req.method === 'HEAD' ? null : Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, Object.fromEntries(response.headers)).end(body);
  } catch (error) {
    console.error(error.message);
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }).end('本地预览资源暂不可用。');
  }
}).listen(8812, '127.0.0.1', () => console.log(`Ready: ${previewOrigin}/minitools/`));

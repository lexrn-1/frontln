// Servidor de pruebas: archivos compilados y proxy local. No es un servicio de producto.
import http from 'node:http';
import net from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../dist/integration/browser/', import.meta.url));
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let port = url.pathname.startsWith('/socket.io/')
    ? 20992
    : /^\/api\/v1\/rooms\/[^/]+\/messages$/.test(url.pathname)
      ? 20881
      : url.pathname.startsWith('/api/') || url.pathname.startsWith('/q/')
        ? 20880
        : null;
  if (port) {
    const proxy = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, origin: 'http://localhost:4200' },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxy.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(proxy);
    return;
  }
  try {
    let name = decodeURIComponent(url.pathname);
    if (name.includes('..')) {
      res.writeHead(400);
      res.end();
      return;
    }
    if (!path.extname(name)) name = '/index.html';
    const data = await readFile(path.join(root, name));
    const ext = path.extname(name);
    res.writeHead(200, {
      'Content-Type':
        {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
        }[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/socket.io/')) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(20992, '127.0.0.1', () => {
    const headers = { ...req.headers, origin: 'http://localhost:4200' };
    upstream.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n')}\r\n\r\n`
    );
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
});
server.listen(4200, '127.0.0.1', () => console.log('Pruebas Angular en http://localhost:4200'));

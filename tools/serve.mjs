#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--port' && /^\d+$/.test(args[1]) && Number(args[1]) >= 1 && Number(args[1]) <= 65535)) {
  console.error('Usage: node tools/serve.mjs [--port 4173]'); process.exit(2);
}
const port = args.length ? Number(args[1]) : 4173;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.litmus': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const reject = (code, message) => { response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : message); };
  if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return reject(405, 'Method not allowed'); }
  try {
    let path = decodeURIComponent((request.url || '/').split('?')[0]);
    if (path.includes('\0') || path.includes('\\') || path.split('/').some((segment) => segment === '.' || segment === '..')) return reject(400, 'Invalid path');
    if (path === '/favicon.ico') { response.writeHead(204); return response.end(); }
    if (path === '/') path = '/web/index.html';
    if (!/^\/(web|dist|examples)\/[a-zA-Z0-9_./-]+$/.test(path) && path !== '/docs/TUTORIAL.md') return reject(404, 'Not found');
    const file = await realpath(resolve(root, `.${path}`));
    if (!file.startsWith(`${root}${sep}`)) return reject(403, 'Forbidden');
    const info = await stat(file);
    if (!info.isFile() || info.size > 16 * 1024 * 1024) return reject(404, 'Not found');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': info.size });
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    reject(error instanceof URIError ? 400 : 404, error instanceof URIError ? 'Invalid path' : 'Not found');
  }
});
server.on('error', (error) => { console.error(`Local preview failed: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`LitmusLab local preview: http://127.0.0.1:${port}/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

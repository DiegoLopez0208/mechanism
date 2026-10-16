import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
// A loopback-only file allowlist, including byte ranges for Chromium seeking.
export async function mediaServer(files) {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname, file = files[name];
    if (name === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><body></body>'); return; }
    if (!file) { res.writeHead(404); res.end(); return; }
    const size = statSync(file).size, type = file.endsWith('.png') ? 'image/png' : 'video/mp4';
    const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    let start = 0, end = size - 1;
    if (m) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), end) : end; }
    if (start > end || start >= size) { res.writeHead(416, { 'content-range': `bytes */${size}` }); res.end(); return; }
    res.writeHead(m ? 206 : 200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': end - start + 1,
      ...(m ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}) });
    const stream = createReadStream(file, { start, end }); stream.pipe(res); res.on('close', () => stream.destroy());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => { server.close(r); server.closeAllConnections(); }) };
}

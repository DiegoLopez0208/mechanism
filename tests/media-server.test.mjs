import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mediaServer } from '../scripts/lib/media-server.mjs';

test('review server serves only its allowlist, byte ranges and bounded end offsets', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-media-test-')), file = path.join(dir, 'clip.mp4');
  fs.writeFileSync(file, '0123456789'); const server = await mediaServer({ '/clip.mp4': file });
  try {
    const full = await fetch(server.url + 'clip.mp4'); assert.equal(full.status, 200); assert.equal(await full.text(), '0123456789');
    const range = await fetch(server.url + 'clip.mp4', { headers: { range: 'bytes=3-6' } });
    assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 3-6/10'); assert.equal(await range.text(), '3456');
    const tail = await fetch(server.url + 'clip.mp4', { headers: { range: 'bytes=8-100' } });
    assert.equal(tail.status, 206); assert.equal(await tail.text(), '89');
    const invalid = await fetch(server.url + 'clip.mp4', { headers: { range: 'bytes=12-' } });
    assert.equal(invalid.status, 416); assert.equal(invalid.headers.get('content-range'), 'bytes */10');
    assert.equal((await fetch(server.url + 'not-allowed.mp4')).status, 404);
  } finally { await server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

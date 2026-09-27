import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { storeImage, readImage, readImageBody } from '../../src/lib/server/images.ts';
import { MAX_IMAGE_BYTES } from '../../src/lib/images.ts';

const directory = await mkdtemp(join(tmpdir(), 'nestate-images-'));
process.env.DATA_DIR = directory;
after(() => rm(directory, { recursive: true, force: true }));

test('images are optimized, stripped of metadata and persisted under unpredictable names', async () => {
  const input = await sharp({ create: { width: 2600, height: 1300, channels: 3, background: '#6f4632' } }).jpeg().withMetadata().toBuffer();
  const saved = await storeImage(input);
  assert.match(saved.filename, /^[a-f0-9-]+\.webp$/);
  assert.deepEqual([saved.width, saved.height], [2400, 1200]);
  const output = await readImage(saved.filename);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.exif, undefined);
  assert.ok(output.length < input.length);
  const second = await storeImage(input);
  assert.notEqual(second.filename, saved.filename);
});

test('unsupported, oversized and corrupt images are rejected and paths cannot escape storage', async () => {
  await assert.rejects(storeImage(Buffer.from('<svg onload="alert(1)"></svg>')), { status: 415 });
  await assert.rejects(storeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)), { status: 413 });
  await assert.rejects(storeImage(Buffer.from([0xff, 0xd8, 0xff, 0, 0])), { status: 400 });
  const huge = await sharp({ create: { width: 9000, height: 8000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(storeImage(huge), { status: 400 });
  for (const filename of ['../nestate.sqlite', '/etc/passwd', 'image.svg', '00000000-0000-0000-0000-000000000000.webp']) assert.equal(await readImage(filename), null);
});

test('body limits apply to streamed bytes even without Content-Length', async () => {
  const data = Buffer.from('hello');
  assert.deepEqual(await readImageBody(new Request('https://example.test', { method: 'POST', body: data })), data);
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } });
  await assert.rejects(readImageBody(new Request('https://example.test', { method: 'POST', body, duplex: 'half' })), { status: 413 });
});

test('50 MiB upload allowance and 48-megapixel iPhone JPEGs are accepted', async () => {
  assert.equal(MAX_IMAGE_BYTES, 50 * 1024 * 1024);
  const input = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: '#d5c0aa' } }).jpeg().toBuffer();
  const saved = await storeImage(input);
  assert.deepEqual([saved.width, saved.height], [2400, 1800]);
});

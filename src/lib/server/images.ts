import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { MAX_IMAGE_BYTES } from '../images.ts';

export class ImageUploadError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const directory = () => resolve(process.env.DATA_DIR || './data', 'uploads');

/** Bound the actual stream too: Content-Length is optional and untrusted. */
export async function readImageBody(request: Request): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('L’image est limitée à 5 Mo.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ImageUploadError('Choisissez une image.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageUploadError('L’image est limitée à 5 Mo.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function storeImage(input: Buffer): Promise<{ filename: string; width: number; height: number }> {
  if (input.length > MAX_IMAGE_BYTES) throw new ImageUploadError('L’image est limitée à 5 Mo.', 413);
  // Reject document formats before decoding, regardless of filename or MIME.
  const raster = input.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP');
  if (!raster) throw new ImageUploadError('Utilisez une image JPEG, PNG ou WebP valide.', 415);
  let output;
  try {
    output = await sharp(input, { limitInputPixels: 25_000_000, failOn: 'warning' })
      .rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  } catch {
    throw new ImageUploadError('Image illisible ou trop grande (25 mégapixels maximum).');
  }
  const filename = `${randomUUID()}.webp`;
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  // Re-encoding strips metadata and ensures only raster pixels are served.
  await writeFile(resolve(directory(), filename), output.data, { flag: 'wx', mode: 0o600 });
  return { filename, width: output.info.width, height: output.info.height };
}

export async function readImage(filename: string): Promise<Buffer | null> {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.webp$/.test(filename)) return null;
  try { return await readFile(resolve(directory(), filename)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

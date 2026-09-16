import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readImage } from '$lib/server/images';

export const GET: RequestHandler = async ({ params }) => {
  const image = await readImage(params.filename);
  if (!image) error(404, 'Image introuvable.');
  return new Response(new Uint8Array(image), { headers: {
    'content-type': 'image/webp',
    'content-length': String(image.byteLength),
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff'
  } });
};

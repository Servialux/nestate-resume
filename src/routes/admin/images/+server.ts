import { base } from '$app/paths';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IMAGE_TYPES } from '$lib/images';
import { ImageUploadError, readImageBody, storeImage } from '$lib/server/images';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ message: 'Reconnectez-vous pour envoyer une image.' }, { status: 401 });
  if (!IMAGE_TYPES.includes(request.headers.get('content-type')?.split(';')[0] ?? '')) {
    return json({ message: 'Utilisez une image JPEG, PNG ou WebP.' }, { status: 415 });
  }
  try {
    const image = await storeImage(await readImageBody(request));
    return json({ ...image, url: `${base}/media/${image.filename}` }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageUploadError) return json({ message: error.message }, { status: error.status });
    console.error('Image upload failed', error);
    return json({ message: 'L’envoi a échoué. Réessayez dans un instant.' }, { status: 500 });
  }
};

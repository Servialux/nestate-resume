import { error, fail, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { getPost, savePost, validatePost, type PostInput } from '$lib/server/posts';
import { getLinkedInSettings, shareOnLinkedIn } from '$lib/server/linkedin';
import { getDb } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
  const settings = getLinkedInSettings();
  const post = params.id === 'nouveau' ? null : getPost(params.id);
  if (params.id !== 'nouveau' && !post) error(404, 'Article introuvable.');
  return { post, linkedinConfigured: settings.configured && settings.enabled && settings.siteUrlConfigured, user: locals.user! };
};

export const actions: Actions = {
  save: async ({ params, request }) => {
    const form = await request.formData();
    const values: PostInput = {
      title: String(form.get('title') ?? ''), excerpt: String(form.get('excerpt') ?? ''),
      content: String(form.get('content') ?? ''), shareLinkedIn: form.get('shareLinkedIn') === 'on',
      intent: String(form.get('intent') ?? 'draft') as PostInput['intent']
    };
    const invalid = validatePost(values);
    if (invalid) return fail(400, { message: invalid, values, success: false });
    const previous = params.id === 'nouveau' ? null : getPost(params.id);
    if (params.id !== 'nouveau' && !previous) error(404, 'Article introuvable.');
    let post;
    try { post = savePost(previous?.id ?? null, values); }
    catch (cause) { return fail(400, { message: cause instanceof Error ? cause.message : 'Enregistrement impossible.', values, success: false }); }
    let message = values.intent === 'publish' ? 'Article publié.' : 'Brouillon enregistré.';
    // Editing a published post must never create a second social post. Retries are explicit.
    if (post.status === 'published' && previous?.status !== 'published' && post.shareLinkedIn && post.linkedinStatus === 'never') {
      try {
        const result = await shareOnLinkedIn(post.id);
        message += result.status === 'sent' ? ' Partagé sur LinkedIn.' : result.error ? ` ${result.error}` : ' Le partage LinkedIn n’a pas été envoyé.';
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message : 'Le partage LinkedIn est indisponible.';
        getDb().prepare("UPDATE posts SET linkedinStatus = 'failed', linkedinError = ? WHERE id = ? AND linkedinStatus = 'never'").run(reason, post.id);
        message += ` ${reason}`;
      }
    }
    if (!previous) redirect(303, `${base}/admin/articles/${post.id}?saved=1`);
    return { message, success: true };
  },
  retryLinkedIn: async ({ params, request }) => {
    const form = await request.formData();
    if (!getPost(params.id)) error(404, 'Article introuvable.');
    try {
      const result = await shareOnLinkedIn(params.id, { confirmUncertain: form.get('confirmUncertain') === 'on' });
      if (result.status === 'failed' || result.status === 'uncertain') return fail(400, { message: result.error || 'Partage non confirmé.', success: false });
      return { message: result.status === 'sent' ? 'Article partagé sur LinkedIn.' : 'Aucun nouveau partage envoyé.', success: true };
    } catch (cause) {
      return fail(400, { message: cause instanceof Error ? cause.message : 'Le partage LinkedIn est indisponible.', success: false });
    }
  }
};

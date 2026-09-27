import { fail } from '@sveltejs/kit';
import { disconnectLinkedIn, getLinkedInSettings, saveLinkedInSettings } from '$lib/server/linkedin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ settings: getLinkedInSettings(), siteUrl: process.env.SITE_URL || '', user: locals.user! });

export const actions: Actions = {
  save: async ({ request }) => {
    const data = await request.formData();
    try {
      saveLinkedInSettings({ accessToken: String(data.get('accessToken') ?? ''), authorUrn: String(data.get('authorUrn') ?? ''),
        apiVersion: String(data.get('apiVersion') ?? ''), enabled: data.get('enabled') === 'on' });
      return { success: true, message: 'Les paramètres LinkedIn ont été enregistrés.' };
    } catch (cause) {
      return fail(400, { success: false, message: cause instanceof Error ? cause.message : 'Impossible d’enregistrer LinkedIn.' });
    }
  },
  disconnect: () => { disconnectLinkedIn(); return { success: true, message: 'LinkedIn déconnecté. Le jeton enregistré a été supprimé.' }; }
};

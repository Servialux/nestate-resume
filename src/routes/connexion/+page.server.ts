import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { authenticateAdmin, createSession, hasAdmin, revokeSession, SESSION_COOKIE, SESSION_MAX_AGE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/admin');
  return { configured: hasAdmin() };
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const form = await request.formData();
    const email = form.get('email');
    const password = form.get('password');
    if (typeof email !== 'string' || typeof password !== 'string') {
      return fail(400, { message: 'Adresse e-mail ou mot de passe incorrect.' });
    }
    const result = authenticateAdmin(email, password, getClientAddress());
    if (result.rateLimited) {
      return fail(429, { message: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }
    if (!result.user) return fail(400, { message: 'Adresse e-mail ou mot de passe incorrect.' });

    revokeSession(cookies.get(SESSION_COOKIE));
    const { token } = createSession(result.user.id);
    cookies.set(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !dev,
      maxAge: SESSION_MAX_AGE
    });
    redirect(303, '/admin');
  }
};

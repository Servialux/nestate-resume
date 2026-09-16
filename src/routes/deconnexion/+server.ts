import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { revokeSession, SESSION_COOKIE } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
  revokeSession(cookies.get(SESSION_COOKIE));
  cookies.delete(SESSION_COOKIE, { path: '/', secure: !dev, httpOnly: true, sameSite: 'lax' });
  redirect(303, '/connexion');
};

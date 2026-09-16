import { base } from '$app/paths';
import { json, type Handle } from '@sveltejs/kit';
import { getSessionUser, SESSION_COOKIE } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  // route.id also works when the application is hosted under a configured base path.
  // Prefix matching covers SvelteKit data requests and private routes that return 404.
  const paths = [event.route.id, event.url.pathname];
  const matches = (prefix: string) => paths.some((path) => path === prefix || path?.startsWith(`${prefix}/`));
  const adminRoute = matches('/admin');
  const authRoute = matches('/connexion') || matches('/deconnexion');
  const privateRoute = adminRoute || authRoute;

  const privateHeaders = { 'cache-control': 'private, no-store' };
  if (privateRoute) event.setHeaders(privateHeaders);
  event.locals.user = getSessionUser(event.cookies.get(SESSION_COOKIE));

  if (privateRoute && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
    if (event.request.headers.get('origin') !== event.url.origin) {
      const message = 'Cette requête doit provenir de ce site.';
      if (event.isDataRequest || event.request.headers.get('accept')?.includes('application/json')) {
        return json({ type: 'error', status: 403, error: { message } }, { status: 403, headers: privateHeaders });
      }
      return new Response(message, { status: 403, headers: { ...privateHeaders, 'content-type': 'text/plain; charset=utf-8' } });
    }
  }
  if (adminRoute && !event.locals.user) {
    const location = `${base}/connexion`;
    // Throwing from this hook bypasses resolve(), which would discard setHeaders.
    // Return SvelteKit's data/action redirect shapes directly to preserve no-store.
    if (event.isDataRequest) return json({ type: 'redirect', location }, { headers: privateHeaders });
    if (event.request.method === 'POST' && event.request.headers.get('accept')?.includes('application/json')) {
      return json({ type: 'redirect', status: 303, location }, { headers: privateHeaders });
    }
    return new Response(null, { status: 303, headers: { ...privateHeaders, location } });
  }

  return resolve(event);
};

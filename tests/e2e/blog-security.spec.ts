import { test, expect } from '@playwright/test';
import { unflatten } from 'devalue';

const origin = 'http://127.0.0.1:4175';
// SvelteKit negotiates */* as a JSON action envelope (HTTP 200). Request the
// native form response explicitly when asserting HTTP redirects and failures.
const formHeaders = { origin, accept: 'text/html' };
const credentials = { email: 'auteur@example.test', password: 'Test-browser-only-2026!' };
const genericError = 'Adresse e-mail ou mot de passe incorrect.';

test('connexion générique, pages privées sans cache et mutations anonymes refusées', async ({ page, request }) => {
  const loginPage = await page.goto('/connexion');
  expect(loginPage?.headers()['cache-control']).toContain('no-store');
  await page.getByLabel(/Adresse e-mail/i).fill('inconnu@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-incorrect');
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await expect(page.getByRole('alert')).toHaveText(genericError);
  await expect(page).toHaveURL(/\/connexion$/);

  // A known address gets the same response as an unknown address; no account enumeration.
  const wrongPassword = await request.post('/connexion', {
    form: { ...credentials, password: 'mot-de-passe-incorrect' }, headers: formHeaders
  });
  expect(wrongPassword.status()).toBe(400);
  expect(await wrongPassword.text()).toContain(genericError);
  expect(wrongPassword.headers()['cache-control']).toContain('no-store');

  const privatePage = await request.get('/admin', { maxRedirects: 0 });
  expect(privatePage.status()).toBe(303);
  expect(privatePage.headers().location).toBe('/connexion');
  expect(privatePage.headers()['cache-control']).toContain('no-store');
  const privateData = await request.get('/admin/__data.json', { maxRedirects: 0 });
  expect(await privateData.json()).toEqual({ type: 'redirect', location: '/connexion' });
  expect(privateData.headers()['cache-control']).toContain('no-store');

  for (const endpoint of ['/admin/articles/nouveau?/save', '/admin/linkedin?/save']) {
    const mutation = await request.post(endpoint, { form: {}, headers: formHeaders, maxRedirects: 0 });
    expect(mutation.status()).toBe(303);
    expect(mutation.headers().location).toBe('/connexion');
    expect(mutation.headers()['cache-control']).toContain('no-store');
  }
});

test('brouillons privés, contrôle Origin et révocation effective après déconnexion', async ({ page, request }, testInfo) => {
  const author = page.context().request;
  const login = await author.post('/connexion', { form: credentials, headers: formHeaders, maxRedirects: 0 });
  expect(login.status()).toBe(303);
  const session = (await page.context().cookies()).find((cookie) => cookie.name === 'nestate_session');
  expect(session).toBeDefined();
  const dashboard = await page.goto('/admin');
  expect(dashboard?.status()).toBe(200);
  expect(dashboard?.headers()['cache-control']).toContain('no-store');

  const draft = await author.post('/admin/articles/nouveau?/save', {
    form: { title: `Brouillon privé ${testInfo.project.name}`, excerpt: 'Résumé privé', content: 'Contenu privé', intent: 'draft' },
    headers: formHeaders, maxRedirects: 0
  });
  expect(draft.status()).toBe(303);
  const editorPath = new URL(draft.headers().location, origin).pathname;
  const draftData = await author.get(`${editorPath}/__data.json`);
  expect(draftData.headers()['cache-control']).toContain('no-store');
  const payload = await draftData.json();
  const editor = payload.nodes
    .map((node: { type?: string; data?: unknown[] } | null) => node?.type === 'data' && node.data ? unflatten(node.data) : null)
    .find((data: { post?: { slug: string } } | null) => data?.post);
  expect(editor?.post.slug).toBeTruthy();
  const publicPath = `/blog/${editor.post.slug}`;
  expect((await request.get(publicPath)).status()).toBe(404);

  const forgedPublish = await author.post(`${editorPath}?/save`, {
    form: { title: 'Publication forcée', excerpt: 'Résumé', content: 'Contenu', intent: 'publish' },
    headers: { ...formHeaders, origin: 'https://autre-site.example' }, maxRedirects: 0
  });
  expect(forgedPublish.status()).toBe(403);
  expect((await request.get(publicPath)).status()).toBe(404);
  // JSON is not covered by SvelteKit's form-only CSRF check; the hook must reject it too.
  const forgedLogout = await author.post('/deconnexion', { data: {}, headers: { origin: 'https://autre-site.example' }, maxRedirects: 0 });
  expect(forgedLogout.status()).toBe(403);
  expect((await author.get('/admin', { maxRedirects: 0 })).status()).toBe(200);

  const logout = await author.post('/deconnexion', { headers: formHeaders, maxRedirects: 0 });
  expect(logout.status()).toBe(303);
  expect((await page.context().cookies()).find((cookie) => cookie.name === 'nestate_session')).toBeUndefined();
  const replay = await request.get('/admin', { headers: { cookie: `nestate_session=${session!.value}` }, maxRedirects: 0 });
  expect(replay.status()).toBe(303);
  expect(replay.headers().location).toBe('/connexion');
});

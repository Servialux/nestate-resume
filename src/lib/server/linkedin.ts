import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { getDb } from './db.ts';

const DEFAULT_API_VERSION = '202603';
const REQUEST_TIMEOUT_MS = 20_000;
const STALE_CLAIM_MS = 120_000;
const TOKEN_KEY = 'linkedin.accessToken';
const SETTINGS_PREFIX = 'linkedin.';
const CLAIM_PREFIX = 'linkedin.claim.';
const UNCERTAIN_MESSAGE = 'Le résultat de cet envoi est inconnu. Vérifiez votre profil LinkedIn avant de confirmer un nouvel essai : un doublon est possible.';
const TOKEN_AAD = Buffer.from('nestate.linkedin.access-token.v1');

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  linkedinStatus: string;
  linkedinUrl: string | null;
  linkedinError: string | null;
};

type Claim = { id: string; startedAt: number };

export type LinkedInSettings = {
  configured: boolean;
  tokenConfigured: boolean;
  authorUrn: string;
  apiVersion: string;
  enabled: boolean;
  siteUrlConfigured: boolean;
};

export type LinkedInShareResult = {
  status: 'sent' | 'pending' | 'skipped' | 'failed' | 'uncertain';
  error?: string;
  url?: string;
};

function readSetting(key: string): string | undefined {
  return (getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}

function writeSetting(key: string, value: string): void {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function validAuthorUrn(value: string): boolean {
  return /^urn:li:person:[A-Za-z0-9_-]{1,128}$/.test(value);
}

function validApiVersion(value: string): boolean {
  return /^20\d{2}(0[1-9]|1[0-2])$/.test(value);
}

function publicSiteUrl(): URL {
  try {
    const url = new URL(process.env.SITE_URL ?? '');
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || (url.port && url.port !== '443') ||
      !hostname.includes('.') || isIP(hostname) !== 0 || hostname.includes(':') ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|lan|home)$/.test(hostname)
    ) throw new Error();
    return url;
  } catch {
    throw new Error('Configurez SITE_URL avec l’adresse HTTPS publique du site (ex. https://votre-domaine.fr) avant de partager sur LinkedIn.');
  }
}

function encryptionKey(): Buffer {
  const configuredKey = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (configuredKey !== undefined && configuredKey !== '') return decodeKey(configuredKey);
  const dataDir = resolve(process.env.DATA_DIR || 'data');
  const keyPath = resolve(dataDir, '.encryption-key');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let stored: string;
  try {
    stored = readFileSync(keyPath, 'utf8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error('La clé de chiffrement LinkedIn est inaccessible sur le serveur.');
    }
    const generated = randomBytes(32).toString('base64');
    try {
      writeFileSync(keyPath, `${generated}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      stored = generated;
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw new Error('Impossible de créer la clé de chiffrement LinkedIn sur le serveur.');
      }
      stored = readFileSync(keyPath, 'utf8').trim();
    }
  }
  return decodeKey(stored);
}

function decodeKey(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error('La clé DATA_ENCRYPTION_KEY doit contenir 32 octets encodés en base64.');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw new Error('La clé DATA_ENCRYPTION_KEY doit contenir 32 octets encodés en base64.');
  }
  return key;
}

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(TOKEN_AAD);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

function decryptToken(value: string): string {
  try {
    const [version, iv, tag, ciphertext, extra] = value.split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext || extra !== undefined) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Le jeton LinkedIn ne peut pas être déchiffré. Vérifiez la clé serveur ou renseignez à nouveau le jeton.');
  }
}

function readClaim(postId: string): Claim | undefined {
  try {
    const claim = JSON.parse(readSetting(CLAIM_PREFIX + postId) ?? 'null') as Claim | null;
    if (claim && typeof claim.id === 'string' && Number.isFinite(claim.startedAt)) return claim;
  } catch { /* Invalid or legacy claims are treated as uncertain, never resent. */ }
  return undefined;
}

/** Reconcile interrupted sends without retrying an external publication. */
export function recoverStaleLinkedInShares(): void {
  transaction(() => {
    const rows = getDb().prepare("SELECT id FROM posts WHERE linkedinStatus = 'pending'").all() as { id: string }[];
    for (const row of rows) {
      const claim = readClaim(row.id);
      if (!claim || Date.now() - claim.startedAt > STALE_CLAIM_MS) {
        getDb().prepare("UPDATE posts SET linkedinStatus = 'uncertain', linkedinError = ? WHERE id = ? AND linkedinStatus = 'pending'").run(UNCERTAIN_MESSAGE, row.id);
      }
    }
  });
}

/** This is the only settings object that may be serialized to the browser. */
export function getLinkedInSettings(): LinkedInSettings {
  recoverStaleLinkedInShares();
  const tokenConfigured = Boolean(readSetting(TOKEN_KEY));
  const authorUrn = readSetting('linkedin.authorUrn') ?? '';
  const apiVersion = readSetting('linkedin.apiVersion') || DEFAULT_API_VERSION;
  let siteUrlConfigured = false;
  try { publicSiteUrl(); siteUrlConfigured = true; } catch { /* Report configuration, never expose environment values. */ }
  return {
    configured: tokenConfigured && validAuthorUrn(authorUrn) && validApiVersion(apiVersion),
    tokenConfigured,
    authorUrn,
    apiVersion,
    enabled: readSetting('linkedin.enabled') === 'true',
    siteUrlConfigured
  };
}

export function saveLinkedInSettings(input: { accessToken?: string; authorUrn: string; apiVersion?: string; enabled: boolean }): LinkedInSettings {
  const authorUrn = input.authorUrn.trim();
  const apiVersion = input.apiVersion?.trim() || DEFAULT_API_VERSION;
  const accessToken = input.accessToken?.trim() ?? '';
  if (authorUrn && !validAuthorUrn(authorUrn)) throw new Error('L’identifiant doit avoir la forme urn:li:person:VOTRE_IDENTIFIANT.');
  if (!validApiVersion(apiVersion)) throw new Error('La version de l’API doit avoir la forme AAAAMM (ex. 202603).');
  if (accessToken && !/^[\x21-\x7e]{16,8192}$/.test(accessToken)) throw new Error('Le jeton LinkedIn doit contenir entre 16 et 8192 caractères, sans espace.');
  const encryptedToken = accessToken ? encryptToken(accessToken) : undefined;
  transaction(() => {
    if (input.enabled && (!authorUrn || (!encryptedToken && !readSetting(TOKEN_KEY)))) {
      throw new Error('Ajoutez le jeton et l’identifiant de votre profil avant d’activer LinkedIn.');
    }
    if (encryptedToken) writeSetting(TOKEN_KEY, encryptedToken);
    writeSetting('linkedin.authorUrn', authorUrn);
    writeSetting('linkedin.apiVersion', apiVersion);
    writeSetting('linkedin.enabled', input.enabled ? 'true' : 'false');
  });
  return getLinkedInSettings();
}

export function disconnectLinkedIn(): void {
  // Claims and post history survive disconnection to preserve duplicate prevention.
  getDb().prepare('DELETE FROM settings WHERE key IN (?, ?, ?, ?)').run(TOKEN_KEY, `${SETTINGS_PREFIX}authorUrn`, `${SETTINGS_PREFIX}apiVersion`, `${SETTINGS_PREFIX}enabled`);
}

function resultFromPost(post: PostRow): LinkedInShareResult {
  if (post.linkedinStatus === 'sent') return { status: 'sent', ...(post.linkedinUrl ? { url: post.linkedinUrl } : {}) };
  if (post.linkedinStatus === 'pending') return { status: 'pending' };
  if (post.linkedinStatus === 'uncertain') return { status: 'uncertain', error: post.linkedinError || UNCERTAIN_MESSAGE };
  return { status: 'skipped' };
}

function finishClaim(postId: string, claimId: string, status: 'sent' | 'failed' | 'uncertain', error: string | null, url: string | null): void {
  transaction(() => {
    if (readClaim(postId)?.id !== claimId) return;
    getDb().prepare('UPDATE posts SET linkedinStatus = ?, linkedinError = ?, linkedinUrl = ? WHERE id = ?').run(status, error, url, postId);
  });
}

function failureMessage(status: number): string {
  if (status === 401) return 'Le jeton LinkedIn est expiré ou invalide. Remplacez-le dans les réglages, puis réessayez.';
  if (status === 403) return 'LinkedIn a refusé l’accès. Vérifiez le droit w_member_social et l’identifiant du profil associé au jeton.';
  if (status === 429) return 'La limite d’envoi LinkedIn est atteinte. Attendez avant de réessayer manuellement.';
  return `LinkedIn a refusé la publication (HTTP ${status}). Vérifiez les réglages et le contenu avant de réessayer.`;
}

function commentaryText(value: string): string {
  // The Posts API parses "little" markup even for plain text. Escape complete
  // characters before applying its length limit, without cutting an escape pair.
  let result = '';
  for (const character of value) {
    const escaped = /[|{}@\[\]()<>#\\*_~]/.test(character) ? `\\${character}` : character;
    if (result.length + escaped.length > 3000) break;
    result += escaped;
  }
  return result;
}

export async function shareOnLinkedIn(postId: string, options: { confirmUncertain?: boolean } = {}): Promise<LinkedInShareResult> {
  recoverStaleLinkedInShares();
  const post = getDb().prepare('SELECT * FROM posts WHERE id = ?').get(postId) as PostRow | undefined;
  if (!post) throw new Error('Article introuvable.');
  if (post.status !== 'published') throw new Error('Publiez l’article sur le blog avant de le partager sur LinkedIn.');
  if (post.linkedinStatus === 'sent' || post.linkedinStatus === 'pending' || (post.linkedinStatus === 'uncertain' && options.confirmUncertain !== true)) return resultFromPost(post);

  const settings = getLinkedInSettings();
  if (!settings.enabled) throw new Error('Activez le connecteur LinkedIn dans les réglages.');
  if (!settings.configured) throw new Error('Renseignez le jeton et l’identifiant de votre profil LinkedIn.');
  const source = new URL(`/blog/${encodeURIComponent(post.slug)}`, publicSiteUrl()).href;
  const accessToken = decryptToken(readSetting(TOKEN_KEY)!);
  const claim: Claim = { id: randomUUID(), startedAt: Date.now() };
  const claimed = transaction(() => {
    const allowed = options.confirmUncertain === true ? "('never', 'failed', 'uncertain')" : "('never', 'failed')";
    const result = getDb().prepare(`UPDATE posts SET linkedinStatus = 'pending', linkedinError = NULL WHERE id = ? AND status = 'published' AND linkedinStatus IN ${allowed}`).run(postId);
    if (Number(result.changes) !== 1) return false;
    writeSetting(CLAIM_PREFIX + postId, JSON.stringify(claim));
    return true;
  });
  if (!claimed) {
    const current = getDb().prepare('SELECT * FROM posts WHERE id = ?').get(postId) as PostRow | undefined;
    return current ? resultFromPost(current) : { status: 'skipped' };
  }

  const payload = {
    author: settings.authorUrn,
    commentary: commentaryText([post.title, post.excerpt, source].filter(Boolean).join('\n\n')),
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { article: { source, title: post.title.slice(0, 399), description: post.excerpt.slice(0, 4085) } },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  let response: Response;
  try {
    response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Linkedin-Version': settings.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // A transport failure can occur after LinkedIn committed the post.
    finishClaim(postId, claim.id, 'uncertain', UNCERTAIN_MESSAGE, null);
    return { status: 'uncertain', error: UNCERTAIN_MESSAGE };
  }

  // Never store upstream bodies: they can contain token or request details.
  if (response.status === 201) {
    const postUrn = response.headers.get('x-restli-id');
    const url = postUrn && /^urn:li:(?:share|ugcPost):\d+$/.test(postUrn)
      ? `https://www.linkedin.com/feed/update/${postUrn}/`
      : null;
    finishClaim(postId, claim.id, 'sent', null, url);
    return { status: 'sent', ...(url ? { url } : {}) };
  }
  // HTTP 408 and server-side errors may also hide a successful creation.
  if (response.status >= 400 && response.status < 500 && response.status !== 408) {
    const error = failureMessage(response.status);
    finishClaim(postId, claim.id, 'failed', error, null);
    return { status: 'failed', error };
  }
  finishClaim(postId, claim.id, 'uncertain', UNCERTAIN_MESSAGE, null);
  return { status: 'uncertain', error: UNCERTAIN_MESSAGE };
}

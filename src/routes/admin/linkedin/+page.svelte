<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  type Settings = { configured: boolean; authorUrn: string; apiVersion: string; enabled: boolean; tokenConfigured: boolean; siteUrlConfigured?: boolean };
  let { data, form }: { data: { settings: Settings; siteUrl: string; user?: { email: string } }; form: { message?: string; success?: boolean } | null } = $props();
  let pending = $state(false);
  let accessToken = $state('');
</script>

<svelte:head><title>Connexion LinkedIn — Espace auteur</title></svelte:head>

<BlogShell admin userEmail={data.user?.email}>
  <a class="blog-back" href={`${base}/admin`}><span aria-hidden="true"><Icon name="arrow-left" /></span> Mes articles</a>
  <div class="blog-page-heading"><div><span class="blog-kicker">Votre réseau, au fil des articles</span><h1 class="blog-title">Le blog.<br /><span>Puis LinkedIn.</span></h1><p class="blog-intro">Connectez votre profil pour partager automatiquement vos nouveaux articles lors de leur publication.</p></div></div>
  {#if form?.message}<div class="blog-notice" class:blog-notice-error={!form.success} class:blog-notice-success={form.success} role={form.success ? 'status' : 'alert'}>{form.message}</div>{/if}
  <div class="blog-settings-grid">
    <section class="blog-panel" aria-labelledby="settings-title">
      <div class="blog-connection-state"><h2 id="settings-title">Connexion au profil</h2><span class="blog-badge" class:blog-badge-published={data.settings.configured && data.settings.enabled}><span class="blog-dot" aria-hidden="true"></span>{data.settings.configured ? data.settings.enabled ? 'Partage activé' : 'Partage désactivé' : 'À configurer'}</span></div>
      <form method="POST" action="?/save" class="blog-form" aria-busy={pending} use:enhance={() => { pending = true; return async ({ result, update }) => { try { await update({ reset: false }); if (result.type === 'success') accessToken = ''; } finally { pending = false; } }; }}>
        <div class="blog-field"><label for="accessToken">Jeton d’accès LinkedIn</label><input type="password" id="accessToken" name="accessToken" bind:value={accessToken} autocomplete="new-password" spellcheck="false" placeholder={data.settings.tokenConfigured ? 'Un jeton est enregistré' : 'Collez votre jeton d’accès'} aria-describedby="token-help" /><p id="token-help" class="blog-field-help">{data.settings.tokenConfigured ? 'Laissez ce champ vide pour conserver le jeton actuel. Collez un nouveau jeton pour le renouveler.' : 'Le jeton est conservé chiffré sur le serveur et ne sera jamais réaffiché ici.'}</p></div>
        <div class="blog-field"><label for="authorUrn">Identifiant du profil auteur</label><input type="text" id="authorUrn" name="authorUrn" value={data.settings.authorUrn} placeholder="urn:li:person:VOTRE_IDENTIFIANT" autocomplete="off" spellcheck="false" aria-describedby="author-help" /><p id="author-help" class="blog-field-help">Format : <code>urn:li:person:</code> suivi de votre identifiant de membre LinkedIn.</p></div>
        <div class="blog-field"><label for="apiVersion">Version de l’API LinkedIn</label><input type="text" id="apiVersion" name="apiVersion" value={data.settings.apiVersion} required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" aria-describedby="version-help" /><p id="version-help" class="blog-field-help">Format AAAAMM. Utilisez une version encore prise en charge par LinkedIn.</p></div>
        <label class="blog-check"><input type="checkbox" name="enabled" checked={data.settings.enabled} /><span>Activer le connecteur LinkedIn<small>Chaque article possède sa propre option de partage. Les articles existants ne sont pas partagés automatiquement.</small></span></label>
        <button class="blog-button blog-button-primary" type="submit" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer la connexion'} <span aria-hidden="true"><Icon name="arrow-up-right" /></span></button>
      </form>
      {#if data.settings.tokenConfigured}
        <div class="blog-settings-footer"><p>Déconnecter LinkedIn supprime le jeton enregistré. Vos articles et vos posts déjà partagés restent en place.</p><form method="POST" action="?/disconnect" use:enhance={() => { pending = true; return async ({ update }) => { try { await update(); accessToken = ''; } finally { pending = false; } }; }}><button class="blog-button blog-button-small blog-button-subtle" type="submit" disabled={pending}>Déconnecter LinkedIn</button></form></div>
      {/if}
    </section>
    <aside class="blog-panel" aria-labelledby="linkedin-help-title">
      <span class="blog-kicker">Première connexion</span><h2 id="linkedin-help-title">Préparer l’accès LinkedIn</h2>
      <p>LinkedIn demande une application développeur et un jeton autorisé pour publier sur votre profil personnel.</p>
      <ol class="blog-help-list">
        <li>Créez votre application sur le <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">portail développeur LinkedIn <Icon name="external-link" /><span class="sr-only"> (nouvel onglet)</span></a> et activez le produit <strong>Share on LinkedIn</strong>.</li>
        <li>Autorisez votre propre compte avec OAuth et la permission <code>w_member_social</code>, puis récupérez le <strong>jeton d’accès</strong>. Une clé d’application seule ne permet pas de publier.</li>
        <li>Pour retrouver votre identifiant, activez <strong>Sign In with LinkedIn using OpenID Connect</strong> et les permissions <code>openid profile</code>. La réponse de <code>GET https://api.linkedin.com/v2/userinfo</code> contient le champ <code>sub</code>. Préfixez sa valeur par <code>urn:li:person:</code>.</li>
        <li>Enregistrez la connexion ici. Dans votre article, cochez <strong>Partager à la publication</strong>, puis publiez.</li>
      </ol>
      <div class="blog-notice" style="margin-bottom:0"><p><strong>Le jeton expire.</strong> Renouvelez-le depuis LinkedIn lorsqu’il arrive à expiration, puis remplacez-le ici. En cas d’échec, l’article reste publié et vous pouvez relancer son partage depuis l’éditeur.</p></div>
      <div class="blog-settings-footer"><p><strong>Adresse publique des articles</strong></p>{#if data.siteUrl}<p class="blog-url">{data.siteUrl}</p>{:else}<p>Configurez <code>SITE_URL</code> sur le serveur avec l’adresse HTTPS publique du site pour que LinkedIn partage des liens accessibles.</p>{/if}{#if data.settings.siteUrlConfigured === false && data.siteUrl}<p>L’adresse configurée doit être une URL HTTPS publique valide avant de partager.</p>{/if}</div>
    </aside>
  </div>
</BlogShell>

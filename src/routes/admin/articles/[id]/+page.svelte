<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  import ArticleContent from '$lib/components/ArticleContent.svelte';
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
  import type { Article } from '$lib/blog';

  type Values = { title: string; excerpt: string; content: string; shareLinkedIn: boolean };
  let { data, form }: { data: { post: Article | null; linkedinConfigured: boolean; user?: { email: string } }; form: { message?: string; success?: boolean; values?: Values } | null } = $props();
  const initial = untrack(() => form?.values ?? data.post);
  let lastLoaded = initial;
  let title = $state(initial?.title ?? '');
  let excerpt = $state(initial?.excerpt ?? '');
  let content = $state(initial?.content ?? '');
  let shareLinkedIn = $state(initial?.shareLinkedIn ?? false);
  let tab = $state<'write' | 'preview'>('write');
  let pending = $state(false);
  let uploading = $state(false);
  let confirming = $state(false);
  const isPublished = $derived(data.post?.status === 'published');
  const dirty = $derived(title !== (data.post?.title ?? '') || excerpt !== (data.post?.excerpt ?? '') || content !== (data.post?.content ?? '') || shareLinkedIn !== (data.post?.shareLinkedIn ?? false));
  const notice = $derived(form?.message ?? (page.url.searchParams.has('saved') ? 'Article enregistré.' : ''));
  const linkedinLabels = { never: 'Non partagé', pending: 'Partage en cours', sent: 'Partagé sur LinkedIn', failed: 'Échec du partage', uncertain: 'Partage à vérifier' };
  function navigateTabs(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    tab = event.key === 'Home' ? 'write' : event.key === 'End' ? 'preview' : tab === 'write' ? 'preview' : 'write';
    document.getElementById(`${tab}-tab`)?.focus();
  }
  $effect(() => {
    const values = form?.values ?? data.post;
    // Bindings preserve text entered before hydration. Only a new server result
    // should replace the editor, never the effect's first run on the same data.
    if (values === lastLoaded) return;
    lastLoaded = values;
    title = values?.title ?? '';
    excerpt = values?.excerpt ?? '';
    content = values?.content ?? '';
    shareLinkedIn = values?.shareLinkedIn ?? false;
  });
  beforeNavigate((navigation) => {
    if ((!dirty && !uploading) || pending) return;
    // SvelteKit triggers the browser's native warning for document unloads.
    if (navigation.type === 'leave' || !window.confirm('Quitter cet article ? Vos modifications non enregistrées seront perdues.')) navigation.cancel();
  });
</script>

<svelte:head><title>{data.post ? `Modifier : ${data.post.title}` : 'Nouvel article'} — Espace auteur</title></svelte:head>

<BlogShell admin userEmail={data.user?.email}>
  <a class="blog-back" href={`${base}/admin`}><span aria-hidden="true"><Icon name="arrow-left" /></span> Mes articles</a>
  <div class="blog-editor-heading"><h1>{data.post ? 'Faire évoluer vos idées.' : 'Une nouvelle page.'}</h1><span class="blog-badge" class:blog-badge-published={isPublished}><span class="blog-dot" aria-hidden="true"></span>{isPublished ? 'Publié' : 'Brouillon'}</span></div>
  {#if notice}<div class="blog-notice" class:blog-notice-error={form?.success === false} class:blog-notice-success={form?.success !== false} role={form?.success === false ? 'alert' : 'status'}>{notice}</div>{/if}
  <form method="POST" action="?/save" class="blog-editor-grid" aria-busy={pending || uploading} use:enhance={({ cancel }) => { if (uploading) { cancel(); return; } pending = true; return async ({ update }) => { try { await update({ reset: false }); } finally { pending = false; } }; }}>
    <div class="blog-form">
      {#if data.post}<input type="hidden" name="id" value={data.post.id} />{/if}
      <div class="blog-field"><label for="title">Titre</label><input id="title" name="title" bind:value={title} placeholder="Une idée, un retour d’expérience…" maxlength="160" required /><p class="blog-field-help">Un titre clair, qui donne envie d’aller plus loin.</p></div>
      <div class="blog-field"><label for="excerpt">Résumé</label><textarea id="excerpt" name="excerpt" bind:value={excerpt} rows="3" maxlength="500" placeholder="En quelques phrases, ce que votre lecteur va découvrir." aria-describedby="excerpt-help"></textarea><p id="excerpt-help" class="blog-field-help blog-char-count"><span>Affiché sur le blog et dans le partage LinkedIn.</span><span>{excerpt.length}/500</span></p></div>
      <div>
        <div class="blog-editor-tabs" role="tablist" aria-label="Mode de l’éditeur"><button id="write-tab" type="button" role="tab" aria-selected={tab === 'write'} aria-controls="write-panel" tabindex={tab === 'write' ? 0 : -1} onkeydown={navigateTabs} onclick={() => tab = 'write'}>Écrire</button><button id="preview-tab" type="button" role="tab" aria-selected={tab === 'preview'} aria-controls="preview-panel" tabindex={tab === 'preview' ? 0 : -1} onkeydown={navigateTabs} onclick={() => tab = 'preview'}>Aperçu</button></div>
        <div id="write-panel" role="tabpanel" aria-labelledby="write-tab" hidden={tab !== 'write'} tabindex="0">
          <MarkdownEditor bind:value={content} bind:uploading disabled={pending} />
        </div>
        <div id="preview-panel" role="tabpanel" aria-labelledby="preview-tab" hidden={tab !== 'preview'} class="blog-preview" tabindex="0">
          <h2 class="blog-preview-title">{title || 'Le titre de votre article'}</h2>
          {#if excerpt}<p class="blog-preview-excerpt">{excerpt}</p>{/if}
          {#if content}<ArticleContent {content} />{:else}<p class="blog-preview-empty">Votre article prendra forme ici au fil de l’écriture.</p>{/if}
        </div>
      </div>
    </div>
    <aside class="blog-panel blog-editor-aside" aria-label="Publication de l’article">
      <div><h2>Publication</h2><p class="blog-field-help" aria-live="polite">{dirty ? 'Modifications non enregistrées.' : data.post ? 'Votre article est enregistré.' : 'Votre article n’est pas encore enregistré.'}</p></div>
      <div class="blog-editor-actions">
        <button class="blog-button blog-button-primary" type="submit" name="intent" value="publish" disabled={pending || uploading}>{pending ? 'Enregistrement…' : isPublished ? 'Enregistrer les modifications' : 'Publier l’article'} <span aria-hidden="true"><Icon name="arrow-up-right" /></span></button>
        {#if isPublished}<button class="blog-button blog-button-subtle" type="submit" name="intent" value="unpublish" disabled={pending || uploading}>Remettre en brouillon</button><a class="blog-button blog-button-subtle" href={`${base}/blog/${data.post?.slug}`} target="_blank" rel="noreferrer">Voir l’article <span aria-hidden="true"><Icon name="external-link" /></span><span class="sr-only"> (nouvel onglet)</span></a>
        {:else}<button class="blog-button blog-button-subtle" type="submit" name="intent" value="draft" disabled={pending || uploading}>Enregistrer le brouillon</button>{/if}
      </div>
      <hr />
      <div><h2>LinkedIn</h2><label class="blog-check"><input type="checkbox" name="shareLinkedIn" bind:checked={shareLinkedIn} /><span>Partager à la publication<small>Le titre, le résumé et le lien de l’article seront publiés sur votre profil.</small></span></label></div>
      {#if !data.linkedinConfigured}<p class="blog-field-help"><a href={`${base}/admin/linkedin`}>Configurer LinkedIn</a> pour activer le partage.</p>{/if}
      {#if isPublished}<p class="blog-field-help">Les modifications de l’article ne créent pas de nouveau post LinkedIn.</p>{/if}
      {#if data.post?.linkedinStatus === 'sent'}<p class="blog-field-help">Remettre en brouillon masque l’article sur le site. Le post LinkedIn reste en ligne.</p>{/if}
    </aside>
  </form>
  {#if data.post && isPublished}
    <div class="blog-panel" style="margin-top:28px">
      <div class="blog-connection-state"><h2>Partage LinkedIn</h2><span class="blog-badge" class:blog-badge-published={data.post.linkedinStatus === 'sent'}>{linkedinLabels[data.post.linkedinStatus]}</span></div>
      {#if data.post.linkedinError}<div class="blog-notice blog-notice-error" role="status">{data.post.linkedinError}</div>{/if}
      {#if data.post.linkedinUrl}<a class="blog-button blog-button-small" href={data.post.linkedinUrl} target="_blank" rel="noreferrer">Voir le post LinkedIn <span aria-hidden="true"><Icon name="external-link" /></span><span class="sr-only"> (nouvel onglet)</span></a>{/if}
      {#if data.post.linkedinStatus === 'never' || data.post.linkedinStatus === 'failed' || data.post.linkedinStatus === 'uncertain'}
        <form method="POST" action="?/retryLinkedIn" class="blog-form" use:enhance={({ cancel }) => { if (uploading) { cancel(); return; } pending = true; return async ({ update }) => { try { await update({ reset: false }); } finally { pending = false; confirming = false; } }; }}>
          {#if data.post.linkedinStatus === 'uncertain'}<label class="blog-check"><input type="checkbox" name="confirmUncertain" required bind:checked={confirming} /><span>J’ai vérifié mon profil LinkedIn : ce post n’a pas été publié.<small>Une réponse incertaine peut cacher un envoi réussi. Cette vérification évite un doublon.</small></span></label>{/if}
          <div><button class="blog-button blog-button-small" type="submit" disabled={pending || uploading || !data.linkedinConfigured || dirty || (data.post.linkedinStatus === 'uncertain' && !confirming)}>{pending ? 'Partage en cours…' : data.post.linkedinStatus === 'never' ? 'Partager sur LinkedIn' : 'Réessayer le partage'} <span aria-hidden="true"><Icon name="arrow-up-right" /></span></button></div>
          {#if dirty}<p class="blog-field-help">Enregistrez vos modifications avant de partager l’article.</p>{/if}
          {#if !data.linkedinConfigured}<p class="blog-field-help"><a href={`${base}/admin/linkedin`}>Configurez la connexion LinkedIn</a> avant de partager.</p>{/if}
        </form>
      {/if}
    </div>
  {/if}
</BlogShell>

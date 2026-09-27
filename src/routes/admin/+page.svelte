<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  import type { Article } from '$lib/blog';
  let { data }: { data: { posts: Article[]; user: { email: string } } } = $props();
  const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(value));
  const linkedinLabels = { never: 'Non partagé', pending: 'Partage en cours', sent: 'Partagé sur LinkedIn', failed: 'Échec du partage', uncertain: 'Partage à vérifier' };
  const published = $derived(data.posts.filter((post) => post.status === 'published').length);
</script>

<svelte:head><title>Mes articles — Espace auteur</title></svelte:head>

<BlogShell admin userEmail={data.user.email}>
  <div class="blog-page-heading">
    <div><span class="blog-kicker">Espace auteur</span><h1 class="blog-title">Vos idées,<br /><span>en toutes lettres.</span></h1><p class="blog-intro">{data.posts.length ? `${published} article${published > 1 ? 's' : ''} publié${published > 1 ? 's' : ''} · ${data.posts.length - published} brouillon${data.posts.length - published > 1 ? 's' : ''}` : 'Votre prochain article commence ici.'}</p></div>
    <div class="blog-toolbar"><a class="blog-button" href={`${base}/admin/linkedin`}>LinkedIn <span aria-hidden="true"><Icon name="arrow-up-right" /></span></a><a class="blog-button blog-button-primary" href={`${base}/admin/articles/nouveau`}>Nouvel article <Icon name="plus" /></a></div>
  </div>
  {#if data.posts.length}
    <div class="blog-admin-list">
      {#each data.posts as post}
        <article class="blog-admin-row">
          <div><div class="blog-admin-badges"><span class="blog-badge" class:blog-badge-published={post.status === 'published'}><span class="blog-dot" aria-hidden="true"></span>{post.status === 'published' ? 'Publié' : 'Brouillon'}</span>{#if post.status === 'published' || post.linkedinStatus !== 'never'}<span class="blog-badge">{linkedinLabels[post.linkedinStatus]}</span>{/if}</div><h2><a href={`${base}/admin/articles/${post.id}`}>{post.title}</a></h2><p>Modifié le {date(post.updatedAt)}</p></div>
          <a class="blog-button blog-button-small" href={`${base}/admin/articles/${post.id}`}>Modifier <span aria-hidden="true"><Icon name="arrow-up-right" /></span><span class="sr-only"> {post.title}</span></a>
        </article>
      {/each}
    </div>
  {:else}
    <div class="blog-empty"><span class="blog-empty-mark" aria-hidden="true">Aa.</span><h2>Une idée mérite d’être partagée.</h2><p>Rédigez votre premier article à votre rythme. Enregistrez-le en brouillon, puis publiez-le quand il est prêt.</p><a class="blog-text-link" href={`${base}/admin/articles/nouveau`}>Écrire mon premier article <span aria-hidden="true"><Icon name="arrow-up-right" /></span></a></div>
  {/if}
</BlogShell>

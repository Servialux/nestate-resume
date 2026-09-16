<script lang="ts">
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  import ArticleContent from '$lib/components/ArticleContent.svelte';
  import type { Article } from '$lib/blog';
  import { resume } from '$lib/resume';
  let { data }: { data: { post: Article; canonicalUrl: string } } = $props();
  const author = resume.basics?.name ?? 'Mon portfolio';
  const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(value));
  const readTime = $derived(Math.max(1, Math.ceil(data.post.content.trim().split(/\s+/).length / 200)));
</script>

<svelte:head>
  <title>{data.post.title} — {author}</title>
  <meta name="description" content={data.post.excerpt} />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:title" content={data.post.title} />
  <meta property="og:description" content={data.post.excerpt} />
  <meta property="og:url" content={data.canonicalUrl} />
  {#if data.post.publishedAt}<meta property="article:published_time" content={data.post.publishedAt} />{/if}
  <meta property="article:author" content={author} />
</svelte:head>

<BlogShell>
  <article class="blog-article">
    <a class="blog-back" href={`${base}/blog`}><span aria-hidden="true">←</span> Tous les articles</a>
    <span class="blog-kicker">Le carnet de bord</span>
    <h1 class="blog-title">{data.post.title}</h1>
    <div class="blog-article-meta"><span>{author}</span><span aria-hidden="true">·</span><time datetime={data.post.publishedAt ?? data.post.createdAt}>{date(data.post.publishedAt ?? data.post.createdAt)}</time><span aria-hidden="true">·</span><span>{readTime} min de lecture</span></div>
    <p class="blog-article-lead">{data.post.excerpt}</p>
    <ArticleContent content={data.post.content} />
    <div class="blog-article-end"><span>Merci de votre lecture.</span><a href={`${base}/blog`}>Retour au blog <span aria-hidden="true">↗</span></a></div>
  </article>
</BlogShell>

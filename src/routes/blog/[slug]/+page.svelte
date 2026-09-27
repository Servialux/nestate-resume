<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  import { page } from '$app/state';
  import { absoluteUrl } from '$lib/seo';
  import Icon from '$lib/components/Icon.svelte';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  import ArticleContent from '$lib/components/ArticleContent.svelte';
  import type { Article } from '$lib/blog';
  import { resume } from '$lib/resume';
  let { data }: { data: { post: Article; canonicalUrl: string; socialImage?: { src: string; alt: string } } } = $props();
  const author = resume.basics?.name ?? 'Mon portfolio';
  const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(value));
  const readTime = $derived(Math.max(1, Math.ceil(data.post.content.trim().split(/\s+/).length / 200)));
</script>

<Seo title={`${data.post.title} — ${author}`} description={data.post.excerpt}
  path={`/blog/${data.post.slug}`} type="article" image={data.socialImage?.src}
  imageAlt={data.socialImage?.alt || undefined} publishedAt={data.post.publishedAt} updatedAt={data.post.updatedAt}
  structuredData={{ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', '@id': `${data.canonicalUrl}#article`, headline: data.post.title,
      description: data.post.excerpt, url: data.canonicalUrl, mainEntityOfPage: data.canonicalUrl,
      inLanguage: 'fr-FR', datePublished: data.post.publishedAt ?? data.post.createdAt, dateModified: data.post.updatedAt,
      image: absoluteUrl(data.socialImage?.src ?? `${page.data.site.basePath}/images/social-preview.png`, page.data.site.url),
      author: { '@type': 'Person', '@id': `${page.data.site.url}${page.data.site.basePath}/#person`, name: author, url: `${page.data.site.url}${page.data.site.basePath}/` } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${page.data.site.url}${page.data.site.basePath}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${page.data.site.url}${page.data.site.basePath}/blog` },
      { '@type': 'ListItem', position: 3, name: data.post.title, item: data.canonicalUrl }
    ] }
  ] }} />

<BlogShell>
  <article class="blog-article">
    <a class="blog-back" href={`${base}/blog`}><span aria-hidden="true"><Icon name="arrow-left" /></span> Tous les articles</a>
    <span class="blog-kicker">Le carnet de bord</span>
    <h1 class="blog-title">{data.post.title}</h1>
    <div class="blog-article-meta"><span>{author}</span><span aria-hidden="true">·</span><time datetime={data.post.publishedAt ?? data.post.createdAt}>{date(data.post.publishedAt ?? data.post.createdAt)}</time><span aria-hidden="true">·</span><span>{readTime} min de lecture</span></div>
    <p class="blog-article-lead">{data.post.excerpt}</p>
    <ArticleContent content={data.post.content} />
    <div class="blog-article-end"><span>Merci de votre lecture.</span><a href={`${base}/blog`}>Retour au blog <span aria-hidden="true"><Icon name="arrow-up-right" /></span></a></div>
  </article>
</BlogShell>

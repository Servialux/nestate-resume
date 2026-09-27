<script lang="ts">
  import { page } from '$app/state';
  import { absoluteUrl, metaDescription, serializeJsonLd } from '$lib/seo';
  import { resume } from '$lib/resume';

  let { title, description, path, type = 'website', image,
    imageAlt = 'Alexandre Ambiehl — développement, architecture et intelligence artificielle',
    publishedAt, updatedAt, structuredData }:
    { title: string; description: string; path: string; type?: 'website' | 'article'; image?: string;
      imageAlt?: string; publishedAt?: string | null; updatedAt?: string; structuredData?: unknown } = $props();
  const canonical = $derived(absoluteUrl(`${page.data.site.basePath}${path}`, page.data.site.url));
  const socialImage = $derived(absoluteUrl(image ?? `${page.data.site.basePath}/images/social-preview.png`, page.data.site.url));
  const summary = $derived(metaDescription(description));
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={summary} />
  <meta name="author" content={resume.basics?.name} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content={type} />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:site_name" content={`${resume.basics?.name} — CV & carnet de bord`} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={summary} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={socialImage} />
  <meta property="og:image:alt" content={imageAlt} />
  {#if !image}
    <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={summary} />
  <meta name="twitter:image" content={socialImage} />
  <meta name="twitter:image:alt" content={imageAlt} />
  {#if type === 'article'}
    <meta property="article:author" content={resume.basics?.name} />
    {#if publishedAt}<meta property="article:published_time" content={publishedAt} />{/if}
    {#if updatedAt}<meta property="article:modified_time" content={updatedAt} />{/if}
  {/if}
  {#if structuredData}
    {@html `<script type="application/ld+json">${serializeJsonLd(structuredData)}</script>`}
  {/if}
</svelte:head>

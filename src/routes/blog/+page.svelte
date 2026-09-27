<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  import type { Article } from '$lib/blog';
  import { resume } from '$lib/resume';
  let { data }: { data: { posts: Article[] } } = $props();
  const author = resume.basics?.name ?? 'Mon portfolio';
  const date = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(value)) : '';
  const readTime = (content: string) => Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
</script>

<Seo title={`Blog — ${author}`} path="/blog"
  description={`Le carnet de bord de ${author}. Réflexions, retours d’expérience et explorations autour du développement et de l’IA.`}
  structuredData={{ '@context': 'https://schema.org', '@type': 'Blog', name: `Le carnet de bord de ${author}`,
    url: `${page.data.site.url}${page.data.site.basePath}/blog`, inLanguage: 'fr-FR',
    author: { '@type': 'Person', '@id': `${page.data.site.url}${page.data.site.basePath}/#person`, name: author, url: `${page.data.site.url}${page.data.site.basePath}/` },
    blogPost: data.posts.map((post) => ({ '@type': 'BlogPosting', headline: post.title,
      url: `${page.data.site.url}${page.data.site.basePath}/blog/${post.slug}`, datePublished: post.publishedAt })) }} />

<BlogShell>
  <span class="blog-kicker">Le carnet de bord</span>
  <h1 class="blog-title">Des idées.<br /><span>Du terrain.</span></h1>
  <p class="blog-intro">Réflexions, retours d’expérience et explorations autour du développement et de l’IA.</p>
  {#if data.posts.length}
    <div class="blog-list-topline"><span>Derniers articles</span><span>{data.posts.length} publication{data.posts.length > 1 ? 's' : ''}</span></div>
    <div>
      {#each data.posts as post}
        <article class="blog-post-card">
          <div class="blog-post-date"><time datetime={post.publishedAt ?? post.createdAt}>{date(post.publishedAt ?? post.createdAt)}</time><span>{readTime(post.content)} min de lecture</span></div>
          <div><h2><a href={`${base}/blog/${post.slug}`}>{post.title}</a></h2><p>{post.excerpt}</p></div>
          <span class="blog-post-arrow" aria-hidden="true"><Icon name="arrow-up-right" /></span>
        </article>
      {/each}
    </div>
  {:else}
    <div class="blog-empty"><span class="blog-empty-mark" aria-hidden="true">Aa.</span><h2>La première page reste à écrire.</h2><p>Les prochains articles prendront place ici. En attendant, découvrez mon parcours et les sujets qui m’animent.</p><a class="blog-text-link" href={`${base}/`}>Découvrir mon CV <span aria-hidden="true"><Icon name="arrow-up-right" /></span></a></div>
  {/if}
</BlogShell>

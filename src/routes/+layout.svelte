<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { isDemo } from '$lib/resume';
  let { children, data } = $props();
  const publicPage = $derived(['/', '/blog', '/blog/[slug]'].includes(page.route.id ?? ''));
  const indexable = $derived(data.site.indexable && publicPage && page.status < 400 && !isDemo);
</script>

<svelte:head>
  <meta name="robots" content={indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'} />
</svelte:head>

{@render children()}

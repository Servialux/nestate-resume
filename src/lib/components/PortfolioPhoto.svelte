<script lang="ts">
  import { base } from '$app/paths';
  import { imageUrl, type PortfolioImage } from '$lib/resume';

  let { image, portrait = false }: { image: PortfolioImage; portrait?: boolean } = $props();
  let failed = $state(false);
  const source = $derived(imageUrl(image.src));
</script>

{#if source && !failed}
  <img
    src={source.startsWith('/') ? `${base}${source}` : source}
    alt={image.alt}
    class:portrait-photo={portrait}
    class:project-photo={!portrait}
    width={portrait ? 1000 : 900}
    height={portrait ? 1250 : 600}
    loading={portrait ? 'eager' : 'lazy'}
    fetchpriority={portrait ? 'high' : 'auto'}
    decoding="async"
    onerror={() => failed = true}
  />
{:else}
  <span class="photo-fallback">Image indisponible</span>
{/if}

<script lang="ts">
  import { base } from '$app/paths';
  import { imageUrl, type PortfolioImage } from '$lib/resume';

  let { image, portrait = false }: { image: PortfolioImage; portrait?: boolean } = $props();
  let failed = $state(false);
  const variants = $derived((image.variants ?? []).flatMap((variant) => {
    const url = imageUrl(variant.src);
    return url && variant.width > 0 ? [`${url.startsWith('/') ? `${base}${url}` : url} ${variant.width}w`] : [];
  }).join(', '));
  const source = $derived(imageUrl(image.src));
</script>

{#if source && !failed}
  <img
    src={source.startsWith('/') ? `${base}${source}` : source}
    srcset={variants || undefined}
    sizes={variants ? (portrait ? '(max-width: 720px) 90vw, (max-width: 1100px) 40vw, 480px' : '90vw') : undefined}
    alt={image.alt}
    class:portrait-photo={portrait}
    class:project-photo={!portrait}
    width={image.width ?? (portrait ? 1000 : 900)}
    height={image.height ?? (portrait ? 1250 : 600)}
    loading={portrait ? 'eager' : 'lazy'}
    fetchpriority={portrait ? 'high' : 'auto'}
    decoding="async"
    onerror={() => failed = true}
  />
{:else}
  <span class="photo-fallback">Image indisponible</span>
{/if}

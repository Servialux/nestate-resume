<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';

  let interactive = $state(false);
  let isLight = $state(false);

  onMount(() => {
    const preference = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => {
      const choice = document.documentElement.dataset.theme;
      isLight = choice ? choice === 'light' : preference.matches;
    };
    sync();
    interactive = true;
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  });

  function toggleTheme() {
    isLight = getComputedStyle(document.documentElement).colorScheme !== 'light';
    const theme = isLight ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = isLight ? '#fffcf8' : '#0b0706';
    });
    try { localStorage.setItem('portfolio-theme', theme); } catch { /* Switching still works without storage. */ }
  }
</script>

<button class="theme-toggle" type="button" disabled={!interactive} onclick={toggleTheme}
  aria-label={isLight ? 'Passer au mode sombre' : 'Passer au mode clair'}
  title={isLight ? 'Passer au mode sombre' : 'Passer au mode clair'}>
  <Icon name="sun" class="theme-icon-sun" />
  <Icon name="moon" class="theme-icon-moon" />
</button>

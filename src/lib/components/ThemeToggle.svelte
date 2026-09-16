<script lang="ts">
  import { onMount } from 'svelte';

  let isLight = $state(false);

  onMount(() => {
    const preference = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => {
      const choice = document.documentElement.dataset.theme;
      isLight = choice ? choice === 'light' : preference.matches;
    };
    sync();
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

<button class="theme-toggle" type="button" onclick={toggleTheme}
  aria-label={isLight ? 'Passer au mode sombre' : 'Passer au mode clair'}
  title={isLight ? 'Passer au mode sombre' : 'Passer au mode clair'}>
  <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
  </svg>
  <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
  </svg>
</button>

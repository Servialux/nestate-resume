<script lang="ts">
  import type { Snippet } from 'svelte';
  import { base } from '$app/paths';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { resume } from '$lib/resume';
  import '$lib/blog.css';

  let { children, admin = false, userEmail = '' }: { children: Snippet; admin?: boolean; userEmail?: string } = $props();
  const name = resume.basics?.name ?? 'Mon portfolio';
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
</script>

<a class="skip-link" href="#contenu">Aller au contenu</a>
<div class="blog-shell">
  <header class="blog-header">
    <a class="brand" href={`${base}/`} aria-label={`${name} — retour au CV`}>
      <span class="brand-mark">{initials}<span>.</span></span>
      <span class="brand-caption">{name}<br />CV & carnet de bord</span>
    </a>
    <div class="blog-header-actions">
      <nav class="blog-nav" aria-label="Navigation principale">
        <a href={`${base}/`}>CV</a>
        <a href={`${base}/blog`} aria-current={admin ? undefined : 'page'}>Blog</a>
        <a href={`${base}/admin`} aria-current={admin ? 'page' : undefined}>Espace auteur <span aria-hidden="true">↗</span></a>
      </nav>
      <ThemeToggle />
    </div>
  </header>
  {#if admin && userEmail}
    <div class="blog-account-bar"><span>Connecté · {userEmail}</span><form method="POST" action={`${base}/deconnexion`}><button type="submit" class="blog-text-link">Se déconnecter</button></form></div>
  {/if}
  <main id="contenu" class="blog-main">{@render children()}</main>
  <footer class="blog-footer"><span>{name}<span class="footer-dot">.</span></span><a href={`${base}/`}>Revenir au CV <span aria-hidden="true">↗</span></a></footer>
</div>

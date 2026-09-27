<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import BlogShell from '$lib/components/BlogShell.svelte';
  let { data, form }: { data: { configured: boolean }; form: { message?: string } | null } = $props();
  let pending = $state(false);
</script>

<svelte:head><title>Connexion — Espace auteur</title></svelte:head>

<BlogShell admin>
  <div class="blog-login">
    <span class="blog-kicker">Espace auteur</span><h1 class="blog-title">À vous<br /><span>d’écrire.</span></h1>
    <p class="blog-intro">Connectez-vous pour rédiger vos articles, les publier et les partager sur LinkedIn.</p>
    {#if !data.configured}
      <div class="blog-notice"><p><strong>Le compte auteur n’est pas encore configuré.</strong></p><p>Sur le serveur, lancez <code>npm run admin:create</code> pour créer votre compte privé, puis revenez vous connecter ici.</p></div>
      <a class="blog-button" href={`${base}/`}>Retour au CV <span aria-hidden="true"><Icon name="arrow-up-right" /></span></a>
    {:else}
      {#if form?.message}<div class="blog-notice blog-notice-error" role="alert">{form.message}</div>{/if}
      <form class="blog-form blog-panel" method="POST" use:enhance={() => { pending = true; return async ({ update }) => { try { await update({ reset: false }); } finally { pending = false; } }; }} aria-busy={pending}>
        <div class="blog-field"><label for="email">Adresse e-mail</label><input type="email" id="email" name="email" autocomplete="username" required placeholder="vous@exemple.fr" /></div>
        <div class="blog-field"><label for="password">Mot de passe</label><input type="password" id="password" name="password" autocomplete="current-password" required /></div>
        <button class="blog-button blog-button-primary" type="submit" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'} <span aria-hidden="true"><Icon name="arrow-up-right" /></span></button>
      </form>
      <p class="blog-field-help" style="margin-top:20px">Un espace privé pour gérer votre blog. L’accès est réservé au propriétaire du CV.</p>
    {/if}
  </div>
</BlogShell>

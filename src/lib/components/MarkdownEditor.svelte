<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { tick } from 'svelte';
  import { base } from '$app/paths';
  import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '$lib/images';

  let { value = $bindable(''), uploading = $bindable(false), disabled = false }:
    { value: string; uploading?: boolean; disabled?: boolean } = $props();
  let textarea: HTMLTextAreaElement;
  let imagePanel = $state(false);
  let imageDescription = $state('');
  let message = $state('');
  let failed = $state(false);
  const tools = [
    { label: 'Titre', before: '## ', after: '', placeholder: 'Titre de section', block: true },
    { label: 'Gras', before: '**', after: '**', placeholder: 'Texte en gras' },
    { label: 'Italique', before: '*', after: '*', placeholder: 'Texte en italique' },
    { label: 'Lien', before: '[', after: '](https://exemple.fr)', placeholder: 'Texte du lien' },
    { label: 'Liste', before: '- ', after: '', placeholder: 'Premier élément\n- Deuxième élément', block: true },
    { label: 'Citation', before: '> ', after: '', placeholder: 'Votre citation', block: true },
    { label: 'Code', before: '```\n', after: '\n```', placeholder: 'Votre code', block: true },
    { label: 'Tableau', before: '', after: '', placeholder: '| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Valeur 1 | Valeur 2 |\n| Valeur 3 | Valeur 4 |', block: true }
  ];

  async function insert(text: string, start = textarea.selectionStart, end = textarea.selectionEnd, selection?: [number, number]) {
    if (value.length - (end - start) + text.length > 100_000) {
      failed = true;
      message = 'Le contenu est limité à 100 000 caractères. Libérez de la place avant d’insérer cet élément.';
      return;
    }
    value = value.slice(0, start) + text + value.slice(end);
    await tick();
    textarea.focus();
    textarea.setSelectionRange(start + (selection?.[0] ?? text.length), start + (selection?.[1] ?? text.length));
  }

  function format(tool: typeof tools[number]) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || tool.placeholder;
    const prefix = tool.block && start > 0 ? '\n\n' : '';
    const suffix = tool.block ? '\n\n' : '';
    const offset = prefix.length + tool.before.length;
    void insert(prefix + tool.before + selected + tool.after + suffix, start, end, [offset, offset + selected.length]);
  }

  async function upload(file?: File) {
    if (!file || uploading || disabled) return;
    failed = false;
    message = '';
    if (!IMAGE_TYPES.includes(file.type)) { failed = true; message = 'Choisissez une image JPEG, PNG ou WebP.'; return; }
    if (file.size > MAX_IMAGE_BYTES) { failed = true; message = 'L’image est limitée à 50 Mo.'; return; }
    // Keep room for the image syntax before storing a new file.
    if (value.length > 99_000) { failed = true; message = 'Libérez de la place dans le contenu avant d’ajouter une image.'; return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const alt = (imageDescription.trim() || file.name.replace(/\.[^.]+$/, '') || 'Illustration')
      .slice(0, 300).replace(/[\\`*{}[\]()#+!_<>|]/g, '\\$&').replace(/[\r\n]/g, ' ');
    uploading = true;
    message = 'Envoi de l’image…';
    try {
      const response = await fetch(`${base}/admin/images`, {
        method: 'POST', headers: { 'content-type': file.type, accept: 'application/json' }, body: file
      });
      const result = await response.json();
      if (result.type === 'redirect' || response.status === 401) throw new Error('Votre session a expiré. Copiez votre texte puis reconnectez-vous.');
      if (!response.ok || typeof result.url !== 'string') throw new Error(result.message || 'L’envoi a échoué. Réessayez.');
      // Re-enable the field before restoring its focus/selection.
      uploading = false;
      await insert(`\n\n![${alt}](${result.url})\n\n`, start, end);
      message = 'Image ajoutée au contenu. Enregistrez l’article pour conserver cette modification.';
      imageDescription = '';
      imagePanel = false;
    } catch (error) {
      failed = true;
      message = error instanceof Error ? error.message : 'L’envoi a échoué. Réessayez.';
    } finally { uploading = false; }
  }

  function pasteImage(event: ClipboardEvent) {
    const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
    if (file) { event.preventDefault(); void upload(file); }
  }
</script>

<div class="blog-markdown-editor">
  <div class="blog-format-toolbar" role="group" aria-label="Mise en forme Markdown">
    {#each tools as tool}
      <button type="button" onclick={() => format(tool)} disabled={disabled || uploading} title={`Insérer : ${tool.label}`}>{tool.label}</button>
    {/each}
    <button type="button" class="blog-image-toggle" aria-expanded={imagePanel} aria-controls="image-upload-panel" onclick={async () => { imagePanel = !imagePanel; if (imagePanel) { await tick(); document.getElementById('image-description')?.focus(); } }} disabled={disabled || uploading}><Icon name="image" /> Image</button>
  </div>
    <div class="blog-image-panel" id="image-upload-panel" hidden={!imagePanel}>
      <div class="blog-field"><label for="image-description">Description de l’image</label><input id="image-description" bind:value={imageDescription} maxlength="300" placeholder="Décrivez l’image pour les lecteurs d’écran" disabled={uploading || disabled} /></div>
      <div class="blog-field"><label for="article-image">Importer une image</label><input id="article-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || disabled} onchange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-describedby="image-help" /></div>
      <p class="blog-field-help" id="image-help">JPEG, PNG ou WebP · 50 Mo maximum. Pour une photo HEIC/HEIF, choisissez un export JPEG. Les images sont optimisées et accessibles par leur lien, même avant publication.</p>
    </div>
  {#if message}<p class="blog-upload-message" class:blog-upload-error={failed} role={failed ? 'alert' : 'status'}>{message}</p>{/if}
  <div class="blog-field">
    <label for="content">Contenu de l’article</label>
    <textarea bind:this={textarea} class="blog-editor-content" id="content" name="content" bind:value maxlength="100000" placeholder="Commencez à écrire…" aria-describedby="content-help" readonly={uploading || disabled} onpaste={pasteImage}></textarea>
    <p class="blog-field-help" id="content-help">Markdown : titres, **gras**, *italique*, liens, listes, citations, code et tableaux. Insérez une image avec le bouton Image ou collez-la directement dans le texte.</p>
  </div>
  <details class="blog-markdown-help"><summary>Guide Markdown</summary>
    <p>Une ligne vide sépare les paragraphes. L’onglet Aperçu montre le rendu final.</p>
    <pre>{'## Titre\n\n**Gras**, *italique*, ~~barré~~ et `code`\n\n[Texte du lien](https://exemple.fr)\n![Description de l’image](/media/image.webp)\n\n1. Première étape\n2. Deuxième étape\n\n> Une citation\n\n| Fonction | Disponible |\n| --- | ---: |\n| Tableaux | Oui |\n| Images | Oui |\n\n```js\nconst message = "Bonjour";\n```'}</pre>
  </details>
</div>

<script lang="ts">
  import { renderMarkdown } from '$lib/markdown';
  let { content }: { content: string } = $props();
  const html = $derived(renderMarkdown(content));
</script>

<!-- Only the shared renderer can produce HTML: authored HTML is escaped. -->
<div class="blog-prose">{@html html}</div>

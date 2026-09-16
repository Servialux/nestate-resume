<script lang="ts">
  let { content }: { content: string } = $props();
  type Block = { kind: 'paragraph' | 'h2' | 'h3' | 'quote' | 'code' | 'list'; text: string; items?: string[] };

  // Render text with Svelte escaping. Authored HTML is always displayed as text.
  function parse(source: string): Block[] {
    const blocks: Block[] = [];
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index++; continue; }
      if (line.startsWith('```')) {
        const code: string[] = [];
        index++;
        while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
        if (index < lines.length) index++;
        blocks.push({ kind: 'code', text: code.join('\n') });
      } else if (/^#{2,3}\s/.test(line)) {
        blocks.push({ kind: line.startsWith('###') ? 'h3' : 'h2', text: line.replace(/^#{2,3}\s+/, '') });
        index++;
      } else if (/^[-*]\s/.test(line)) {
        const items: string[] = [];
        while (index < lines.length && /^[-*]\s/.test(lines[index])) items.push(lines[index++].replace(/^[-*]\s+/, ''));
        blocks.push({ kind: 'list', text: '', items });
      } else if (/^>\s?/.test(line)) {
        const quote: string[] = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ''));
        blocks.push({ kind: 'quote', text: quote.join('\n') });
      } else {
        const paragraph: string[] = [line];
        index++;
        while (index < lines.length && lines[index].trim() && !/^(#{2,3}\s|[-*]\s|>|```)/.test(lines[index])) paragraph.push(lines[index++]);
        blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      }
    }
    return blocks;
  }
  const blocks = $derived(parse(content));
</script>

<div class="blog-prose">
  {#each blocks as block}
    {#if block.kind === 'h2'}<h2>{block.text}</h2>
    {:else if block.kind === 'h3'}<h3>{block.text}</h3>
    {:else if block.kind === 'code'}<pre><code>{block.text}</code></pre>
    {:else if block.kind === 'quote'}<blockquote><p>{block.text}</p></blockquote>
    {:else if block.kind === 'list'}<ul>{#each block.items ?? [] as item}<li>{item}</li>{/each}</ul>
    {:else}<p>{block.text}</p>{/if}
  {/each}
</div>

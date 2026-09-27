<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import ArrowDownRight from '@lucide/svelte/icons/arrow-down-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Download from '@lucide/svelte/icons/download';
  import Plus from '@lucide/svelte/icons/plus';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Printer from '@lucide/svelte/icons/printer';
  import ImagePlus from '@lucide/svelte/icons/image-plus';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Mail from '@lucide/svelte/icons/mail';
  import Save from '@lucide/svelte/icons/save';

  const icons = { 'arrow-up-right': ArrowUpRight, 'arrow-down-right': ArrowDownRight,
    'arrow-left': ArrowLeft, 'arrow-up': ArrowUp, download: Download, plus: Plus,
    sun: Sun, moon: Moon, printer: Printer, image: ImagePlus,
    'external-link': ExternalLink, mail: Mail, save: Save };
  let { name, size = '1.15em', class: className = '' }:
    { name: keyof typeof icons; size?: number | string; class?: string } = $props();
  const Component = $derived(icons[name]);
</script>

<Component {size} strokeWidth={1.8} class={`ui-icon ${className}`} aria-hidden="true" focusable="false" />

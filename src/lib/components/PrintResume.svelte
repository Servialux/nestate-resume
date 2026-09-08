<script lang="ts">
  import { resume } from '$lib/resume';
  import { renderPrintResume } from '$lib/print-resume';
  import '$lib/print-resume.css';
</script>

<div class="print-resume">
  {@html renderPrintResume(resume)}
</div>

<style>
  .print-resume { display:none; }
  @media print { .print-resume { display:block; } }
</style>

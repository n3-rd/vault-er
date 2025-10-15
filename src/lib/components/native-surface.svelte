<script lang="ts">
  let { class: className = '', padded = true, children } = $props();
</script>

<div
  class={`rounded-2xl border border-black/10 bg-white/80 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/10 ${padded ? 'p-6' : ''} ${className}`}
>
  {@render children?.()}
</div>

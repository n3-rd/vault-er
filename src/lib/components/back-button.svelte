<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";
    let { text, href = "/" } = $props();

</script>
<button
    class="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-black/70 shadow-sm transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/15 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
    onclick={() => goto(href)}
>
    <Icon icon="stash:caret-left-light" width="18" height="18" class="text-black/50 dark:text-white/60" />
    <span>{text}</span>
</button>

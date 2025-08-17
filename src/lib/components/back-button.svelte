<script>
    import { goto } from "$app/navigation";
    import Icon from "@iconify/svelte";
    let { text, href = "/" } = $props();

</script>
<button
    class="back flex items-center my-4 cursor-pointer hover:opacity-80 rounded px-2 w-fit"
    onclick={() => goto(href)}
>
    <Icon icon="stash:caret-left-light" width="24" height="24" />
    {text}
</button>
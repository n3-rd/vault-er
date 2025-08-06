<script lang="ts">
    import { getCurrentSpace, listContents } from "$lib/auth-store";
    import { Button } from "$lib/components/ui/button/index";
    import { copyToClipboard } from "$lib/utils";

    import Icon from "@iconify/svelte";

    let currentSpace: Space | null = $state(null);
    let spaceContents = $state(null);

    $effect(async () => {
        await getCurrentSpace().then((space) => {
            currentSpace = space;
            console.log("currentSpace", currentSpace);
        });
        await listContents().then((contents) => {
            spaceContents = contents;
            console.log("contents", spaceContents);
        });
    });
</script>

<div class="flex items-center justify-between">
    <div class="flex items-start gap-2">
        <h1 class="text-2xl font-bold flex flex-col gap-1">
            <span class="text-2xl font-bold flex items-center gap-2"
                >{currentSpace?.name}
                <span class="text-sm text-muted-foreground">
                    {#if spaceContents}
                  {`(${spaceContents?.size})`}
                    {/if}
                    </span>
                {#if currentSpace?.access.type === "public"}
                    <Icon icon="fluent-color:globe-20" width="20" height="20" />
                {:else}
                    Private
                {/if}</span
            >

            <span class="text-sm text-muted-foreground flex items-center gap-2">
                {currentSpace?.did()}
                <Icon icon="ic:baseline-content-copy" width="20" height="20" class="cursor-pointer hover:scale-110" 
                onclick={() => copyToClipboard(currentSpace?.did())}
                />
            </span>
        </h1>
        <span> </span>
    </div>

    <Button>
        <Icon icon="mdi:plus" />
    </Button>
</div>

{#if !spaceContents}
    <div class="h-96 w-full flex justify-center items-center">
        <Icon
            icon="fluent-color:arrow-clockwise-dashes-16"
            width="90"
            height="90"
            class="animate-spin"
        />
    </div>
{/if}

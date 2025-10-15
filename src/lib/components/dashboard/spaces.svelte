<script lang="ts">
    import { Button } from "$lib/components/ui/button/index";
    import { Input } from "$lib/components/ui/input/index";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { createSpace, getSpaces } from '$lib/auth-store';
    import Icon from "@iconify/svelte";
    import { goToSpace } from "$lib/utils";
    import { toast } from "svelte-sonner";
    import SearchDialog from "./SearchDialog.svelte";
    import { searchOpen } from "$lib/ui-store";
    import NativeSurface from "$lib/components/native-surface.svelte";

    let spaces: any[] = $state([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let spaceName = $state('');
    let creatingSpace = $state(false);
    let dialogOpen = $state(false);

    async function loadSpaces() {
        loading = true;
        error = null;
        try {
            spaces = await getSpaces();
        } catch (err) {
            error = (err as Error)?.message ?? 'Failed to load spaces';
        } finally {
            loading = false;
        }
    }

    $effect(loadSpaces);
</script>

<div class="flex flex-col gap-4">
    <SearchDialog />
    <NativeSurface>
        <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="text-xl font-semibold text-black/80 dark:text-white/85">Spaces</h2>
            <div class="flex flex-wrap items-center gap-2">
                <Button variant="ghost" class="h-9 rounded-full px-3 text-sm" onclick={() => searchOpen.set(true)}>
                    <Icon icon="fluent:search-24-regular" width="16" height="16" />
                    <span class="ml-2 hidden sm:inline">Search</span>
                </Button>
                <Dialog.Root bind:open={dialogOpen}>
                    <Dialog.Trigger>
                        <Button class="h-9 rounded-full px-4 text-sm font-semibold">
                            <Icon icon="mdi:plus" width="16" height="16" />
                            <span class="ml-2">New Space</span>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="max-w-md">
                        <Dialog.Header>
                            <Dialog.Title>New space</Dialog.Title>
                        </Dialog.Header>
                        <div class="space-y-4">
                            <Input
                                bind:value={spaceName}
                                type="text"
                                placeholder="Optional name"
                            />
                            <Button
                                class="w-full"
                                disabled={creatingSpace}
                                onclick={async () => {
                                    creatingSpace = true;
                                    await createSpace(spaceName)
                                        .then(async () => {
                                            await loadSpaces();
                                            spaceName = '';
                                            toast.success('Space created');
                                            dialogOpen = false;
                                        })
                                        .catch(() => toast.error('Failed to create space'))
                                        .finally(() => creatingSpace = false);
                                }}
                            >
                                {creatingSpace ? 'Creating…' : 'Create'}
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Root>
            </div>
        </header>

        {#if loading}
            <div class="flex flex-col gap-3 py-6">
                {#each Array(3) as _}
                    <div class="h-12 animate-pulse rounded-xl bg-black/10 dark:bg-white/10"></div>
                {/each}
            </div>
        {:else if error}
            <p class="py-6 text-sm text-destructive">Error: {error}</p>
        {:else if spaces.length === 0}
            <div class="flex flex-col items-center gap-2 py-10 text-center text-sm text-black/60 dark:text-white/60">
                <Icon icon="ph:cloud-bold" width="28" height="28" />
                <p>No spaces yet</p>
                <Button class="rounded-full px-4 text-sm" onclick={() => dialogOpen = true}>
                    Create space
                </Button>
            </div>
        {:else}
            <ul class="mt-4 divide-y divide-black/10 dark:divide-white/10">
                {#each spaces as space (space.did())}
                    <li>
                        <button
                            class="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:text-primary"
                            onclick={() => goToSpace(space.did())}
                        >
                            <div>
                                <p class="text-sm font-medium text-black/80 dark:text-white/85">{space.meta()?.name || 'Unnamed Space'}</p>
                                <p class="text-xs text-black/50 dark:text-white/55">{space.did()}</p>
                            </div>
                            <Icon icon="mdi:chevron-right" width="18" height="18" class="text-black/40 dark:text-white/40" />
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </NativeSurface>
</div>

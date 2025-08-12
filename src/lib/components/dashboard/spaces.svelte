<script lang="ts">
    import { Button } from "$lib/components/ui/button/index";
    import { Input } from "$lib/components/ui/input/index";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { createSpace, getSpaces } from '$lib/auth-store'
    import Icon from "@iconify/svelte";
    import { goToSpace } from "$lib/utils";
    import { toast } from "svelte-sonner";

    let spaces: any[] = $state([])
    let loading = $state(true)
    let error = $state<string | null>(null)
    let spaceName = $state('')
    let creatingSpace = $state(false)
    let dialogOpen = $state(false);

    $effect(() => {
        getSpaces()
            .then((spacesData) => {
                spaces = spacesData
                loading = false
            })
            .catch((err) => {
                error = err.message
                loading = false
            })
    })
</script>

<div class="space-y-6">
    <div class="flex w-full items-center justify-between">
        <h2 class="text-2xl font-bold">Spaces</h2>
        <Dialog.Root bind:open={dialogOpen}>
            <Dialog.Trigger>
            
        <Button>New Space</Button>

            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Create a new space</Dialog.Title>
     
              </Dialog.Header>
              <div class="flex flex-col gap-4">
                <Input
                   bind:value={spaceName}
                   type="text"
                   placeholder="Enter a name for your space"
                 />
                 <span class="text-sm text-muted-foreground">Leave empty to autogenerate a name</span>
                 <Button class="w-full"
                 disabled={creatingSpace}
                 onclick={async () =>{
                    creatingSpace = true
                    await createSpace(spaceName).then(async (newSpace) => {
                        console.log('Space created')
                        // Refresh the spaces list to get the updated data
                        const updatedSpaces = await getSpaces()
                        spaces = updatedSpaces
                        spaceName = ''
                        toast.success('Space created')
                        creatingSpace = false
                        dialogOpen = false
                    })
                 }}>
                    {#if creatingSpace}
                    <Icon icon="fluent:spinner-ios-16-filled" width="16" height="16" class="animate-spin" />
                    {:else}
                        Create
                    {/if}
                 </Button>
                     </div>
            </Dialog.Content>
          </Dialog.Root>
    </div>

    {#if loading}
        <div class="flex items-center justify-center py-8">
            <p class="text-muted-foreground">Loading spaces...</p>
        </div>
    {:else if error}
        <div class="flex items-center justify-center py-8">
            <p class="text-destructive">Error: {error}</p>
        </div>
    {:else if spaces.length === 0}
        <div class="flex items-center justify-center py-8">
            <p class="text-muted-foreground">No spaces found</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each spaces as space (space.did())}
                <button
                onclick={() => goToSpace(space.did())}
                class="flex items-center flex-col gap-2 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <Icon icon="fluent-color:cloud-16" width="40" height="40" />
                    <h3 class="font-medium">{space.meta()?.name || 'Unnamed Space'}</h3>
                    <p class="text-xs text-muted-foreground truncate max-w-full">{space.did()}</p>
        </button>
            {/each}
        </div>
    {/if}
</div>
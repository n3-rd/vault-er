<script lang="ts">
    import { getCurrentSpace, listContents, uploadFile } from "$lib/auth-store";
    import { Button } from "$lib/components/ui/button/index";
    import { copyToClipboard, formatBytes, doNotAskExtOpen, setDoNotAskExtOpen } from "$lib/utils";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Table from "$lib/components/ui/table/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { openUrl } from '@tauri-apps/plugin-opener';
    import Icon from "@iconify/svelte";
    import BackButton from "$lib/components/back-button.svelte";
    import { toast } from 'svelte-sonner';

    let currentSpace: Space | null = $state(null);
    // Shape inferred from usage of listContents()
    type SpaceContents = {
        size: number;
        results: Array<{
            cause: string;
            insertedAt: string | number | Date;
            blob: { size: number };
            url?: string;
        }>;
    };
    let spaceContents: SpaceContents | null = $state(null);

    // Controlled dialog state for external navigation
    let confirmOpen = $state(false);
    let pendingUrl: string | null = $state(null);
    let dontAskChecked = $state(false);

    // Upload dialog state
    let uploadOpen = $state(false);
    let uploading = $state(false);
    let fileInput: HTMLInputElement | null = $state(null);

    function deriveExternalUrl(file: { cause: string; url?: string }) {
        if (file.url && /^https?:\/\//.test(file.url)) return file.url;
        // Fallback to public IPFS gateway as heuristic
        return `https://${file.cause}.ipfs.w3s.link`;
    }

    function handleFileClick(file: { cause: string; url?: string }) {
        const url = deriveExternalUrl(file);
        if (doNotAskExtOpen()) {
            openUrl(url);
            return;
        }
        pendingUrl = url;
        dontAskChecked = false;
        confirmOpen = true;
    }

    function confirmNavigate() {
        console.log("opening url", pendingUrl);
        if (!pendingUrl) return;
        if (dontAskChecked) setDoNotAskExtOpen(true);
        openUrl(pendingUrl);
        confirmOpen = false;
        pendingUrl = null;
    }

    async function refreshContents() {
        await listContents().then((contents: any) => {
            spaceContents = contents as SpaceContents;
        });
    }

    function onBrowseClick() {
        fileInput?.click();
    }

    async function onFileChange(e: Event) {
        const target = e.currentTarget as HTMLInputElement;
        const file = target.files && target.files[0];
        if (file) await startUpload(file);
        // reset input so the same file can be selected again later
        if (target) target.value = '';
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file) await startUpload(file);
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
    }

    async function startUpload(file: File) {
        try {
            uploading = true;
            const res = await uploadFile(file);
            toast.success('Upload complete');
            await refreshContents();
            uploadOpen = false;
        } catch (e) {
            console.error(e);
            if ((e as Error)?.message?.includes('not registered')) {
                toast.error('Space not registered. Registering now…');
                try {
                    toast.success('Space registered. Retrying upload…');
                    const res2 = await uploadFile(file);
                    toast.success('Upload complete');
                    await refreshContents();
                    uploadOpen = false;
                    return;
                } catch (e2) {
                    console.error(e2);
                }
            }
            toast.error('Upload failed');
        } finally {
            uploading = false;
        }
    }

    $effect(() => {
        (async () => {
            await getCurrentSpace().then((space) => {
                currentSpace = space;
                console.log("currentSpace", currentSpace);
            });
            await listContents().then((contents: any) => {
                spaceContents = contents as SpaceContents;
                console.log("contents", spaceContents);
            });
        })();
    });
</script>

<BackButton text="Back to spaces" />
<div class="flex items-center justify-between">
    <div class="flex items-start gap-2">
        <h1 class="text-2xl font-bold flex flex-col gap-1">
            <span class="text-2xl font-bold flex items-center gap-2"
                >{currentSpace?.name || "Unnamed space"}
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
                <Icon
                    icon="ic:baseline-content-copy"
                    width="20"
                    height="20"
                    class="cursor-pointer hover:scale-110"
                    onclick={() => currentSpace && copyToClipboard(currentSpace.did())}
                />
            </span>
        </h1>
        <span> </span>
    </div>
    <Dialog.Root bind:open={uploadOpen}>
        <Dialog.Trigger onclick={() => (uploadOpen = true)}>
            <Button>
                <Icon icon="mdi:plus" />
            </Button>
        </Dialog.Trigger>
        <Dialog.Content>
            <Dialog.Header>
                <Dialog.Title>Upload new file</Dialog.Title>
            </Dialog.Header>

            <div
                class="h-44 w-full border-2 border-primary border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer select-none"
                on:click={onBrowseClick}
                on:dragover={handleDragOver}
                on:drop={handleDrop}
                class:opacity-50={uploading}
            >
                <Icon icon="mdi:upload" width="40" height="40" />
                <span class="text-sm text-muted-foreground">
                    {uploading ? 'Uploading…' : 'Drag and drop a file here or click to upload'}
                </span>
                <input
                    bind:this={fileInput}
                    type="file"
                    class="hidden"
                    on:change={onFileChange}
                />
            </div>
        </Dialog.Content>
    </Dialog.Root>
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
{:else if spaceContents && spaceContents.size === 0}
    <div class="h-96 w-full flex justify-center items-center">
        <span class="text-2xl text-muted-foreground"
            >No files in this space
        </span>
    </div>
{:else}
    <Table.Root class="mt-4">
        <Table.Header>
            <Table.Row>
                <Table.Head class="">Root CID</Table.Head>
                <Table.Head class="text-right">Timestamp</Table.Head>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {#each spaceContents.results as file}
                <Table.Row class="cursor-pointer hover:bg-secondary" onclick={() => handleFileClick(file)}>
                    <Table.Cell class="font-medium">{file.cause}</Table.Cell>

                    <Table.Cell class="text-right">
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    {new Date(
                                        file.insertedAt,
                                    ).toLocaleDateString()}
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                    <p>Added at {new Date(file.insertedAt).toLocaleString()}</p>
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </Table.Cell>
                
                </Table.Row>
            {/each}
        </Table.Body>
    </Table.Root>
{/if}

<!-- External navigation confirm dialog -->
<Dialog.Root bind:open={confirmOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Open external link?</Dialog.Title>
            <Dialog.Description class="max-w-[27rem] break-words">
                You are about to open an external URL{pendingUrl ? `: ${pendingUrl}` : ''}.
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex items-center gap-2 mt-2">
            <Checkbox id="dont-ask" bind:checked={dontAskChecked} class="h-4 w-4" />
            <label for="dont-ask" class="text-sm text-muted-foreground">Don't ask again</label>
        </div>
        <Dialog.Footer class="mt-4">
            <Button variant="secondary" class="cursor-pointer" onclick={() => (confirmOpen = false)}>Cancel</Button>
            <Button onclick={() => confirmNavigate()} class="cursor-pointer">Open link</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

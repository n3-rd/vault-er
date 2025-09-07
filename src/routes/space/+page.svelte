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
    import { Skeleton } from "$lib/components/ui/skeleton/index.js";
    import { toast } from 'svelte-sonner';
    import { slide } from "svelte/transition";

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
    let selectedFile: File | null = $state(null);
    let description = $state('');
    let tags = $state<string[]>([]);
    let newTag = $state('');

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

    function onFileChange(e: Event) {
        const target = e.currentTarget as HTMLInputElement;
        const file = target.files && target.files[0];
        if (file) {
            selectedFile = file;
        }
        // reset input so the same file can be selected again later
        if (target) target.value = '';
    }

    function addTag() {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            tags = [...tags, newTag.trim()];
            newTag = '';
        }
    }

    function removeTag(tagToRemove: string) {
        tags = tags.filter(tag => tag !== tagToRemove);
    }

    function handleKeyPress(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    }

    function resetUploadForm() {
        selectedFile = null;
        description = '';
        tags = [];
        newTag = '';
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            selectedFile = file;
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
    }

    async function startUpload() {
        if (!selectedFile) return;
        
        try {
            uploading = true;
            const res = await uploadFile(selectedFile, description, tags);
            toast.success('Upload complete');
            console.log("res", res);
            await refreshContents();
            uploadOpen = false;
            resetUploadForm();
        } catch (e) {
            console.error(e);
            if ((e as Error)?.message?.includes('not registered')) {
                toast.error('Space not registered. Registering now…');
                try {
                    toast.success('Space registered. Retrying upload…');
                    const res2 = await uploadFile(selectedFile!, description, tags);
                    toast.success('Upload complete');
                    console.log("res2", res2);
                    await refreshContents();
                    uploadOpen = false;
                    resetUploadForm();
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
                    {#if spaceContents}

                <span class="text-sm text-muted-foreground" transition:slide>
                        {`(${spaceContents?.size})`}
                </span>
                    {/if}
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

            <div class="space-y-4">
                <button
                    class="h-44 w-full border-2 border-primary border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer select-none"
                    onclick={onBrowseClick}
                    ondragover={handleDragOver}
                    ondrop={handleDrop}
                    class:opacity-50={uploading}
                    disabled={uploading}
                >
                    <Icon icon="mdi:upload" width="40" height="40" />
                    <span class="text-sm text-muted-foreground">
                        {uploading ? 'Uploading…' : 'Drag and drop a file here or click to upload'}
                    </span>
                    <input
                        bind:this={fileInput}
                        type="file"
                        class="hidden"
                        disabled={uploading}
                        onchange={onFileChange}
                    />
                </button>

                {#if selectedFile}
                    <div class="space-y-4">
                        <div>
                            <label class="text-sm font-medium" for="selectedFile">Selected file: {selectedFile.name}</label>
                        </div>

                        <div>
                            <label for="description" class="text-sm font-medium">Description</label>
                            <textarea
                                id="description"
                                bind:value={description}
                                placeholder="Enter file description..."
                                class="w-full mt-1 p-2 border rounded-md resize-none"
                                rows="3"
                            >
                            </textarea>
                        </div>

                        <div>
                            <label class="text-sm font-medium" for="tags">Tags</label>
                            <div class="flex gap-2 mt-1">
                                <input
                                    bind:value={newTag}
                                    onkeypress={handleKeyPress}
                                    placeholder="Add a tag..."
                                    class="flex-1 p-2 border rounded-md"
                                />
                                <Button onclick={addTag} disabled={!newTag.trim()}>Add</Button>
                            </div>
                            {#if tags.length > 0}
                                <div class="flex flex-wrap gap-2 mt-2">
                                    {#each tags as tag}
                                        <span class="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                                            {tag}
                                            <button
                                                onclick={() => removeTag(tag)}
                                                class="hover:text-destructive"
                                            >
                                                <Icon icon="mdi:close" width="14" height="14" />
                                            </button>
                                        </span>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <Dialog.Footer>
                            <Button 
                                onclick={startUpload} 
                                disabled={uploading}
                                class="w-full"
                            >
                                {uploading ? 'Uploading...' : 'Upload File'}
                            </Button>
                        </Dialog.Footer>
                    </div>
                {/if}
            </div>
        </Dialog.Content>
    </Dialog.Root>
</div>


    <Table.Root class="mt-4">
        <Table.Header>
            <Table.Row>
                <Table.Head class="">Root CID</Table.Head>
                <Table.Head class="text-right">Timestamp</Table.Head>
            </Table.Row>
        </Table.Header>
                <Table.Body>
            {#if spaceContents}
                {#if spaceContents.results && spaceContents.results.length > 0}
                    {#each spaceContents.results as file}
                        <Table.Row class="cursor-pointer hover:bg-secondary" onclick={() => handleFileClick(file)}>
                            <Table.Cell class="font-medium">
                                {file.cause}
                            </Table.Cell>
                            <Table.Cell class="text-right">
                                <Tooltip.Provider>
                                    <Tooltip.Root>
                                        <Tooltip.Trigger>
                                            {new Date(file.insertedAt).toLocaleDateString()}
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>
                                            <p>Added at {new Date(file.insertedAt).toLocaleString()}</p>
                                        </Tooltip.Content>
                                    </Tooltip.Root>
                                </Tooltip.Provider>
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={2} class="text-center py-8">
                            <span class="text-muted-foreground">No files in this space</span>
                        </Table.Cell>
                    </Table.Row>
                {/if}
            {:else}
                <!-- Loading skeleton -->
                {#each Array(5) as _, i}
                    <Table.Row>
                        <Table.Cell>
                            <Skeleton class="h-4 w-48 bg-gray-500/50" />
                        </Table.Cell>
                        <Table.Cell class="text-right">
                            <Skeleton class="h-4 w-24 bg-gray-500/50" />
                        </Table.Cell>
                    </Table.Row>
                {/each}
            {/if}
        </Table.Body>
    </Table.Root>

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

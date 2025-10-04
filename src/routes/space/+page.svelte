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
    import QrShareDialog from "$lib/components/qr-share-dialog.svelte";
    import { toast } from 'svelte-sonner';
    import { slide } from "svelte/transition";
    import { getCurrentWebview } from '@tauri-apps/api/webview';
    import { readFile } from '@tauri-apps/plugin-fs';
    import { onMount } from 'svelte';
    import * as ContextMenu from "$lib/components/ui/context-menu/index.js";

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
    let dragEnter = $state(false);

    // QR code sharing dialog state
    let qrOpen = $state(false);
    let qrValue = $state('');
    let qrTitle = $state('');

    // Global drag-drop state for Tauri events
    let isDraggingOver = $state(false);
    let draggedFiles: string[] = $state([]);

    function deriveExternalUrl(file: { cause: string; url?: string }) {
        if (file.url && /^https?:\/\//.test(file.url)) return file.url;
        // Fallback to public IPFS gateway as heuristic
        return `https://${file.cause}.ipfs.w3s.link`;
    }

    function showQrDialog(value: string, title: string) {
        qrValue = value;
        qrTitle = title;
        qrOpen = true;
    }

    function handleQrOpenChange(open: boolean) {
        qrOpen = open;
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

    async function handleDroppedFiles(paths: string[]) {
        // Handle the first dropped file for now
        const filePath = paths[0];
        const fileName = filePath.split('/').pop() || 'unknown';

        try {
            toast.info(`Reading file: ${fileName}`);

            // Read the file content as bytes
            const fileContent = await readFile(filePath);

            // Create a File object from the content
            const file = new File([fileContent], fileName, {
                type: 'application/octet-stream' // You might want to detect MIME type
            });

            // Set the file and open upload dialog
            selectedFile = file;
            uploadOpen = true;

            toast.success(`File "${fileName}" ready for upload`);

        } catch (error) {
            console.error('Error reading dropped file:', error);
            toast.error(`Failed to read file: ${fileName}`);
        }
    }

    async function startUpload() {
        if (!selectedFile) return;

        try {
            uploading = true;
            const res = await uploadFile(selectedFile, description, tags);
            toast.success('Upload complete');
            console.log("res", res);
            await refreshContents();

            // Show QR code for the uploaded file
            if (res?.cid) {
                const fileUrl = deriveExternalUrl({ cause: res.cid });
                showQrDialog(fileUrl, `Share ${selectedFile.name}`);
            }

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

                    // Show QR code for the uploaded file
                    if (res2?.cid) {
                        const fileUrl = deriveExternalUrl({ cause: res2.cid });
                        showQrDialog(fileUrl, `Share ${selectedFile!.name}`);
                    }

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

    onMount(() => {
        let unlisten: (() => void) | null = null;

        getCurrentWebview().onDragDropEvent((event: any) => {
            const { type, paths } = (event as any).payload;

            if (type === 'over') {
                isDraggingOver = true;
            } else if (type === 'drop') {
                isDraggingOver = false;
                draggedFiles = paths || [];
                console.log('Dropped files:', paths);

                // Handle the dropped files
                if (paths && paths.length > 0) {
                    handleDroppedFiles(paths);
                }
            } else if (type === 'leave') {
                isDraggingOver = false;
            }
        }).then((cleanup) => {
            unlisten = cleanup;
        });

        return () => {
            if (unlisten) unlisten();
        };
    });

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

<!-- Drag overlay -->
{#if isDraggingOver}
    <div class="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
        <div class="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center">
            <Icon icon="mdi:upload" width="48" height="48" class="mx-auto mb-4 text-primary" />
            <p class="text-lg font-medium">Drop files here to upload</p>
            <p class="text-sm text-muted-foreground mt-2">
                {#if draggedFiles.length > 0}
                    {draggedFiles.length} file{draggedFiles.length === 1 ? '' : 's'} ready to upload
                {:else}
                    Drag files from your file system
                {/if}
            </p>
        </div>
    </div>
{/if}

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
                <Icon
                    icon="mdi:qrcode"
                    width="20"
                    height="20"
                    class="cursor-pointer hover:scale-110"
                    onclick={() => currentSpace && showQrDialog(currentSpace.did(), 'Share Space DID')}
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
                    class={`h-44 w-full border-2 border-primary border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer select-none ${dragEnter ? 'border-primary' : 'border-dashed'}`}
                    ondragenter={() => dragEnter = true}
                    ondragleave={() => dragEnter = false}
                    onclick={onBrowseClick}
                    ondragover={handleDragOver}
                    ondrop={handleDrop}
                    class:opacity-50={uploading}
                    disabled={uploading}
                >
                    <Icon icon="mdi:upload" width="40" height="40" />
                    <span class="text-sm text-muted-foreground">
                        {uploading ? 'Uploading…' : draggedFiles.length > 0 ? 'Dropped files ready to upload' : 'Drag and drop a file here or click to upload'}
                    </span>
                    <input
                        bind:this={fileInput}
                        type="file"
                        class="hidden"
                        disabled={uploading || draggedFiles.length > 0}
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
                            <ContextMenu.Root>
                                <ContextMenu.Trigger>
                                    <Table.Cell class="font-medium flex items-center gap-2">
                                        <button onclick={(e) => { e.stopPropagation(); handleFileClick(file); }} class="text-left hover:underline focus:outline-none focus:underline">
                                            {file.cause}
                                        </button>
                                    </Table.Cell>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                  <ContextMenu.Item onclick={() => showQrDialog(`${file.cause}.ipfs.w3s.link`, `Share ${file.cause}`)} class="flex items-center justify-between"><span>Show QR Code</span> <Icon icon="mdi:qrcode" width="16" height="16" /></ContextMenu.Item>
                                  <ContextMenu.Item onclick={() => copyToClipboard(file.cause, 'Copied CID to clipboard')} class="flex items-center justify-between"><span>Copy CID</span> <Icon icon="ic:baseline-content-copy" width="16" height="16" /></ContextMenu.Item>
                                  <ContextMenu.Item onclick={() => copyToClipboard(deriveExternalUrl(file), 'Copied URL to clipboard')} class="flex items-center justify-between"><span>Copy URL</span> <Icon icon="ic:baseline-content-copy" width="16" height="16" /></ContextMenu.Item>
                                </ContextMenu.Content>
                              </ContextMenu.Root>
                        
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



<!-- QR code sharing dialog -->
<QrShareDialog
    open={qrOpen}
    value={qrValue}
    title={qrTitle}
    onOpenChange={handleQrOpenChange}
/>

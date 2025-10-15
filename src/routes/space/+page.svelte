<script lang="ts">
    import { getCurrentSpace, listContents, uploadFile } from "$lib/auth-store";
    import { Button } from "$lib/components/ui/button/index";
    import { copyToClipboard, formatBytes, doNotAskExtOpen, setDoNotAskExtOpen } from "$lib/utils";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { openUrl } from '@tauri-apps/plugin-opener';
    import Icon from "@iconify/svelte";
    import BackButton from "$lib/components/back-button.svelte";
    import QrShareDialog from "$lib/components/qr-share-dialog.svelte";
    import { toast } from 'svelte-sonner';
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

    const fileCount = $derived(spaceContents?.results ? spaceContents.results.length : 0);
    const totalBytes = $derived(
        spaceContents?.results
            ? spaceContents.results.reduce((acc, file) => acc + (file?.blob?.size ?? 0), 0)
            : 0
    );
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

{#if isDraggingOver}
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-white/25 bg-white/85 px-12 py-10 text-center shadow-2xl dark:border-white/20 dark:bg-white/10">
            <Icon icon="mdi:upload" width="48" height="48" class="text-black/50 dark:text-white/70" />
            <p class="text-lg font-semibold text-black/80 dark:text-white/85">Drop to upload</p>
            <p class="text-sm text-black/55 dark:text-white/60">
                {#if draggedFiles.length > 0}
                    {draggedFiles.length} file{draggedFiles.length === 1 ? '' : 's'} detected
                {:else}
                    Files will upload directly into this space
                {/if}
            </p>
        </div>
    </div>
{/if}

<div class="flex flex-col gap-8">
    <section class="relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/85 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur-md transition-transform duration-200 dark:border-white/15 dark:bg-white/10">
        <div class="pointer-events-none absolute -left-16 top-[-4rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(185,0,0,0.22)_0%,_transparent_70%)] blur-3xl"></div>
        <div class="pointer-events-none absolute right-[-4rem] bottom-[-5rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,107,107,0.28)_0%,_transparent_72%)] blur-3xl"></div>
        <div class="relative flex flex-col gap-6 px-8 py-10">
            <div class="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-primary shadow-sm transition-colors dark:border-primary/40 dark:bg-white/10 dark:text-primary-foreground">
                <Icon icon={currentSpace?.access.type === "public" ? "fluent:globe-16-filled" : "mdi:lock-outline"} width="16" height="16" />
                {currentSpace?.access.type === "public" ? 'Public space' : 'Private space'}
            </div>
            <div class="space-y-3">
                <h1 class="text-3xl font-semibold text-black/85 sm:text-4xl dark:text-white/90">
                    {currentSpace?.name || 'Unnamed space'}
                </h1>
                <p class="max-w-xl text-sm text-black/60 dark:text-white/60">
                    Your files stay in sync and feel native wherever you open Vault-er.
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex min-w-0 max-w-full items-center gap-2 rounded-[1rem] border border-black/10 bg-white/90 px-3 py-2 text-xs font-medium text-black/70 shadow-sm transition dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                    <span class="max-w-[16rem] truncate md:max-w-[22rem]">{currentSpace?.did()}</span>
                    <button
                        class="rounded-full border border-primary/20 bg-primary/10 p-1 text-primary transition hover:bg-primary/20 dark:border-primary/40 dark:bg-primary/15 dark:hover:bg-primary/25"
                        onclick={() => currentSpace && copyToClipboard(currentSpace.did())}
                    >
                        <Icon icon="ic:baseline-content-copy" width="16" height="16" />
                    </button>
                    <button
                        class="rounded-full border border-primary/20 bg-primary/10 p-1 text-primary transition hover:bg-primary/20 dark:border-primary/40 dark:bg-primary/15 dark:hover:bg-primary/25"
                        onclick={() => currentSpace && showQrDialog(currentSpace.did(), 'Share Space DID')}
                    >
                        <Icon icon="mdi:qrcode" width="16" height="16" />
                    </button>
                </div>
                {#if fileCount > 0}
                    <span class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition dark:border-primary/30 dark:bg-primary/20 dark:text-primary-foreground">
                        <Icon icon="mdi:folder" width="16" height="16" />
                        {fileCount} item{fileCount === 1 ? '' : 's'}
                    </span>
                {/if}
            </div>
        </div>
    </section>

    <section class="rounded-[1.5rem] border border-black/5 bg-white/80 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <header class="flex flex-col gap-4 border-b border-black/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div>
                <h2 class="text-xl font-semibold text-black/80 dark:text-white/90">Files in this space</h2>
                <p class="text-sm text-black/55 dark:text-white/55">{fileCount} item{fileCount === 1 ? '' : 's'} • {formatBytes(totalBytes)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <Button variant="ghost" class="rounded-full px-3 text-sm text-primary dark:text-primary-foreground" onclick={refreshContents}>
                    <Icon icon="mdi:refresh" width="16" height="16" />
                    <span class="ml-2">Refresh</span>
                </Button>
                <Button variant="ghost" class="rounded-full px-3 text-sm text-primary dark:text-primary-foreground" onclick={() => currentSpace && showQrDialog(currentSpace.did(), 'Share Space DID')}>
                    <Icon icon="mdi:share-variant" width="16" height="16" />
                    <span class="ml-2">Share space</span>
                </Button>
                <Dialog.Root bind:open={uploadOpen}>
                    <Dialog.Trigger asChild>
                        <Button class="rounded-full px-4 text-sm font-semibold shadow-md">
                            <Icon icon="mdi:upload" width="16" height="16" />
                            <span class="ml-2">{uploading ? 'Uploading…' : 'Upload file'}</span>
                        </Button>
                    </Dialog.Trigger>
                    <Dialog.Content class="sm:max-w-xl rounded-[1.5rem] border border-black/10 bg-white/95 p-0 shadow-2xl dark:border-white/15 dark:bg-neutral-950">
                        <Dialog.Header class="border-b border-black/5 px-6 py-5 dark:border-white/10">
                            <Dialog.Title>Upload a new file</Dialog.Title>
                            <Dialog.Description>
                                Files are encrypted locally before heading to the distributed network.
                            </Dialog.Description>
                        </Dialog.Header>
                        <div class="space-y-5 px-6 py-6">
                            <button
                                class={`group relative flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition ${dragEnter ? 'border-primary bg-primary/5 text-primary' : 'border-black/10 bg-white/80 text-black/60 dark:border-white/15 dark:bg-white/10 dark:text-white/60'}`}
                                ondragenter={() => dragEnter = true}
                                ondragleave={() => dragEnter = false}
                                onclick={onBrowseClick}
                                ondragover={handleDragOver}
                                ondrop={handleDrop}
                                class:opacity-70={uploading}
                                disabled={uploading}
                            >
                                <Icon icon="mdi:tray-arrow-up" width="40" height="40" class="text-current" />
                                <span class="text-sm font-medium">
                                    {uploading
                                        ? 'Uploading…'
                                        : draggedFiles.length > 0
                                        ? 'Dropped files ready to upload'
                                        : 'Drop files here or browse'}
                                </span>
                                <span class="text-xs text-black/45 group-hover:text-black/60 dark:text-white/45 dark:group-hover:text-white/60">
                                    {selectedFile ? selectedFile.name : 'Supports any file type'}
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
                                <div class="rounded-2xl border border-black/10 bg-white/85 p-5 shadow-inner dark:border-white/15 dark:bg-white/10">
                                    <div class="mb-4 space-y-1">
                                        <p class="text-sm font-medium text-black/75 dark:text-white/75">Selected file</p>
                                        <p class="text-xs text-black/55 dark:text-white/60">{selectedFile.name}</p>
                                    </div>
                                    <div class="space-y-4">
                                        <div class="space-y-2">
                                            <label for="description" class="text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">Description</label>
                                            <textarea
                                                id="description"
                                                bind:value={description}
                                                placeholder="Add context for collaborators…"
                                                class="h-24 w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-black/40 focus:ring-0 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                                            ></textarea>
                                        </div>
                                        <div class="space-y-2">
                                            <label class="text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">Tags</label>
                                            <div class="flex flex-wrap items-center gap-2">
                                                <input
                                                    bind:value={newTag}
                                                    onkeypress={handleKeyPress}
                                                    placeholder="Add a tag"
                                                    class="flex-1 rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-black/40 focus:ring-0 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                                                />
                                                <Button variant="ghost" class="rounded-full px-4 text-sm" onclick={addTag} disabled={!newTag.trim()}>
                                                    Add
                                                </Button>
                                            </div>
                                            {#if tags.length > 0}
                                                <div class="mt-2 flex flex-wrap gap-2">
                                                    {#each tags as tag}
                                                        <span class="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-xs font-medium text-black/65 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                                                            {tag}
                                                            <button
                                                                class="rounded-full border border-transparent p-1 hover:border-black/20 hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/20"
                                                                onclick={() => removeTag(tag)}
                                                            >
                                                                <Icon icon="mdi:close" width="12" height="12" />
                                                            </button>
                                                        </span>
                                                    {/each}
                                                </div>
                                            {/if}
                                        </div>
                                        <div class="pt-2">
                                            <Button class="h-11 w-full rounded-full text-sm font-semibold shadow-md" onclick={startUpload} disabled={uploading}>
                                                {uploading ? 'Uploading…' : 'Upload'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </Dialog.Content>
                </Dialog.Root>
            </div>
        </header>

        {#if !spaceContents}
            <div class="space-y-3 px-6 py-10">
                {#each Array(4) as _}
                    <div class="h-14 animate-pulse rounded-2xl bg-black/5 dark:bg-white/10"></div>
                {/each}
            </div>
        {:else if fileCount === 0}
            <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Icon icon="ph:folder-open-duotone" width="52" height="52" class="text-black/30 dark:text-white/40" />
                <div>
                    <p class="text-lg font-medium text-black/70 dark:text-white/80">No files yet</p>
                    <p class="text-sm text-black/55 dark:text-white/60">Upload your first file to populate this space.</p>
                </div>
                <Button class="rounded-full px-5 text-sm font-semibold shadow-md" onclick={() => uploadOpen = true}>
                    Upload file
                </Button>
            </div>
        {:else}
            <div class="max-h-[55vh] overflow-y-auto">
                <ul class="divide-y divide-black/5 dark:divide-white/10">
                    {#each spaceContents.results as file (file.cause)}
                        <ContextMenu.Root>
                            <ContextMenu.Trigger asChild>
                                <button
                                    type="button"
                                    class="group grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_auto] items-center gap-4 px-6 py-4 text-left transition hover:bg-white hover:shadow-sm focus-visible:bg-white/90 dark:hover:bg-white/15"
                                    onclick={() => handleFileClick(file)}
                                >
                                    <div>
                                        <p class="truncate text-sm font-medium text-black/80 group-hover:text-black dark:text-white/85 dark:group-hover:text-white">
                                            {file.cause}
                                        </p>
                                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/50 dark:text-white/55">
                                            <span>{formatBytes(file.blob?.size ?? 0)}</span>
                                            <span>•</span>
                                            <Tooltip.Provider>
                                                <Tooltip.Root>
                                                    <Tooltip.Trigger class="cursor-help underline decoration-dotted underline-offset-2">
                                                        {new Date(file.insertedAt).toLocaleDateString()}
                                                    </Tooltip.Trigger>
                                                    <Tooltip.Content>
                                                        <p>Added at {new Date(file.insertedAt).toLocaleString()}</p>
                                                    </Tooltip.Content>
                                                </Tooltip.Root>
                                            </Tooltip.Provider>
                                        </div>
                                    </div>
                                    <div class="hidden truncate text-sm text-black/55 lg:block dark:text-white/55">
                                        {deriveExternalUrl(file).replace(/^https?:\/\//, '')}
                                    </div>
                                    <div class="ml-auto flex items-center gap-2 text-xs font-semibold text-primary dark:text-primary-foreground">
                                        <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 transition group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground dark:border-primary/30 dark:bg-primary/20">
                                            Open
                                        </span>
                                        <Icon icon="mdi:arrow-top-right" width="16" height="16" />
                                    </div>
                                </button>
                            </ContextMenu.Trigger>
                            <ContextMenu.Content>
                                <ContextMenu.Item onclick={() => showQrDialog(deriveExternalUrl(file), `Share ${file.cause}`)} class="flex items-center justify-between gap-4">
                                    <span>Show QR code</span>
                                    <Icon icon="mdi:qrcode" width="16" height="16" />
                                </ContextMenu.Item>
                                <ContextMenu.Item onclick={() => copyToClipboard(file.cause, 'Copied CID to clipboard')} class="flex items-center justify-between gap-4">
                                    <span>Copy CID</span>
                                    <Icon icon="ic:baseline-content-copy" width="16" height="16" />
                                </ContextMenu.Item>
                                <ContextMenu.Item onclick={() => copyToClipboard(deriveExternalUrl(file), 'Copied URL to clipboard')} class="flex items-center justify-between gap-4">
                                    <span>Copy URL</span>
                                    <Icon icon="ic:baseline-content-copy" width="16" height="16" />
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Root>
                    {/each}
                </ul>
            </div>
        {/if}
    </section>
</div>

<!-- External navigation confirm dialog -->
<Dialog.Root bind:open={confirmOpen}>
    <Dialog.Content class="max-w-md rounded-[1.5rem] border border-black/10 bg-white/95 p-0 shadow-2xl dark:border-white/15 dark:bg-neutral-950">
        <Dialog.Header class="border-b border-black/5 px-6 py-5 text-left dark:border-white/10">
            <Dialog.Title>Open external link?</Dialog.Title>
            <Dialog.Description class="max-w-[27rem] break-words text-sm text-black/60 dark:text-white/60">
                You are about to open an external URL{pendingUrl ? `: ${pendingUrl}` : ''}.
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex items-center gap-2 px-6 py-4">
            <Checkbox id="dont-ask" bind:checked={dontAskChecked} class="h-4 w-4" />
            <label for="dont-ask" class="text-sm text-black/60 dark:text-white/60">Don't ask again</label>
        </div>
        <div class="flex justify-end gap-2 border-t border-black/5 px-6 py-4 dark:border-white/10">
            <Button variant="ghost" class="rounded-full px-4 text-sm" onclick={() => (confirmOpen = false)}>
                Cancel
            </Button>
            <Button class="rounded-full px-4 text-sm font-semibold shadow-md" onclick={() => confirmNavigate()}>
                Open link
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>



<!-- QR code sharing dialog -->
<QrShareDialog
    open={qrOpen}
    value={qrValue}
    title={qrTitle}
    onOpenChange={handleQrOpenChange}
/>

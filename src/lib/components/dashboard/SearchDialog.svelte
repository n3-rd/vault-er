<script lang="ts">
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index';
  import Input from '../ui/input/input.svelte';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import Icon from '@iconify/svelte';
  import { searchOpen } from '$lib/ui-store';
  import { getSpaces, waitForAuthReady } from '$lib/auth-store';
  import {
    listIndexedUploads,
    searchIndexedUploads,
    type IndexedFile,
  } from '$lib/indexer';
  import {
    copyToClipboard,
    formatBytes,
    goToSpace,
    openExternalUrl,
  } from '$lib/utils';

  let activeTab = $state('spaces');
  let searchQuery = $state('');

  let allSpaces: any[] = $state([]);
  let filteredSpaces: any[] = $state([]);
  let loadingSpaces = $state(false);
  let spacesError: string | null = $state(null);

  let uploadResults: IndexedFile[] = $state([]);
  let loadingUploads = $state(false);
  let uploadsError: string | null = $state(null);
  let lastQuery = '';

  const getSpaceMeta = (space: any) =>
    (typeof space?.meta === 'function' ? space.meta() : space?.meta) ?? {};

  const getSpaceName = (space: any): string =>
    getSpaceMeta(space)?.name ?? '';

  const getSpaceDid = (space: any): string => {
    if (!space) return '';
    if (typeof space.did === 'function') return space.did();
    return space.did ?? '';
  };

  const matchesSpace = (space: any, query: string): boolean => {
    if (!query) return true;
    const name = getSpaceName(space).toLowerCase();
    const did = getSpaceDid(space).toLowerCase();
    return name.includes(query) || did.includes(query);
  };

  const formatTimestamp = (
    value: Date | string | number | undefined
  ): string => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const handleOpenSpace = async (space: any) => {
    const did = getSpaceDid(space);
    if (!did) return;
    searchOpen.set(false);
    await goToSpace(did);
  };

  const handleCopyCid = async (cid: string) => {
    await copyToClipboard(cid, 'CID copied to clipboard');
  };

  const handleOpenCid = (cid: string) => {
    if (!cid) return;
    openExternalUrl(`https://${cid}.ipfs.w3s.link`);
    searchOpen.set(false);
  };

  const loadSpaces = async () => {
    loadingSpaces = true;
    spacesError = null;
    try {
      await waitForAuthReady();
      const spaces = await getSpaces();
      allSpaces = spaces ?? [];
      filteredSpaces =
        searchQuery.trim().length === 0
          ? allSpaces
          : allSpaces.filter((space) =>
              matchesSpace(space, searchQuery.trim().toLowerCase())
            );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load spaces';
      spacesError = message;
      allSpaces = [];
      filteredSpaces = [];
    } finally {
      loadingSpaces = false;
    }
  };

  const loadUploads = async (query: string) => {
    const normalized = query.trim().toLowerCase();
    loadingUploads = true;
    uploadsError = null;
    const requestKey = normalized;
    lastQuery = requestKey;

    try {
      const results =
        normalized.length > 0
          ? await searchIndexedUploads(normalized, { limit: 50 })
          : await listIndexedUploads({ limit: 50 });

      if (lastQuery === requestKey) {
        uploadResults = results;
      }
    } catch (error) {
      if (lastQuery === requestKey) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to read indexed uploads';
        uploadsError = message;
        uploadResults = [];
      }
    } finally {
      if (lastQuery === requestKey) {
        loadingUploads = false;
      }
    }
  };

  onMount(() => {
    void loadSpaces();
    void loadUploads('');

    const unsubscribe = searchOpen.subscribe((isOpen) => {
      if (isOpen) {
        void loadSpaces();
        void loadUploads(searchQuery);
      }
    });

    return () => {
      unsubscribe();
    };
  });

  $effect(() => {
    const query = searchQuery.trim();
    const normalized = query.toLowerCase();
    const spaces = allSpaces;

    filteredSpaces = normalized.length
      ? spaces.filter((space) => matchesSpace(space, normalized))
      : spaces;

    if (normalized !== lastQuery) {
      void loadUploads(query);
    }
  });
</script>

<Dialog.Root bind:open={$searchOpen}>
  <Dialog.Content class="sm:max-w-2xl rounded-[1.5rem] border border-black/10 bg-white/95 p-0 shadow-2xl dark:border-white/15 dark:bg-neutral-950">
    <Dialog.Header class="border-b border-black/5 px-6 py-5 dark:border-white/10">
      <Dialog.Title>Quick search</Dialog.Title>
      <Dialog.Description>
        Find spaces or recently indexed uploads.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-5 px-6 py-6">
      <Input
        class="w-full"
        bind:value={searchQuery}
        type="search"
        placeholder="Search by space name, DID, file name, CID, or tag"
        autocomplete="off"
      />

      <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List class="grid grid-cols-2 rounded-xl bg-black/5 p-1 text-sm font-medium dark:bg-white/10">
          <Tabs.Trigger value="spaces" class="rounded-lg px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-black dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-white">
            Spaces
          </Tabs.Trigger>
          <Tabs.Trigger value="uploads" class="rounded-lg px-3 py-2 data-[state=active]:bg-white data-[state=active]:text-black dark:data-[state=active]:bg-white/20 dark:data-[state=active]:text-white">
            Uploads
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="spaces" class="space-y-3">
          {#if loadingSpaces}
            <div class="space-y-2">
              {#each Array(3) as _, index}
                <div class="h-12 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" aria-hidden="true"></div>
              {/each}
            </div>
          {:else if spacesError}
            <p class="text-sm text-destructive">{spacesError}</p>
          {:else if filteredSpaces.length === 0}
            <p class="text-sm text-black/60 dark:text-white/60">
              No spaces matched your search.
            </p>
          {:else}
            <ul class="space-y-2">
              {#each filteredSpaces as space, index (getSpaceDid(space) || index)}
                <li>
                  <button
                    class="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-left transition hover:border-primary/40 hover:text-primary dark:border-white/15 dark:bg-white/10 dark:hover:border-primary/40"
                    onclick={() => handleOpenSpace(space)}
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-black/85 dark:text-white/90">
                        {getSpaceName(space) || 'Unnamed space'}
                      </p>
                      <p class="truncate text-xs text-black/55 dark:text-white/60">
                        {getSpaceDid(space)}
                      </p>
                    </div>
                    <Icon icon="mdi:arrow-top-right" width="18" height="18" class="text-black/40 dark:text-white/60" />
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </Tabs.Content>

        <Tabs.Content value="uploads" class="space-y-3">
          {#if loadingUploads}
            <div class="space-y-2">
              {#each Array(4) as _, index}
                <div class="h-20 animate-pulse rounded-xl bg-black/10 dark:bg-white/10" aria-hidden="true"></div>
              {/each}
            </div>
          {:else if uploadsError}
            <p class="text-sm text-destructive">{uploadsError}</p>
          {:else if uploadResults.length === 0}
            <p class="text-sm text-black/60 dark:text-white/60">
              No indexed uploads yet. Upload a file to populate the local index.
            </p>
          {:else}
            <ul class="space-y-3">
              {#each uploadResults as upload (upload.cid)}
                <li class="space-y-3 rounded-xl border border-black/10 bg-white/85 px-4 py-4 shadow-sm transition dark:border-white/15 dark:bg-white/10">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 space-y-1">
                      <p class="truncate text-sm font-semibold text-black/85 dark:text-white/90">
                        {upload.name}
                      </p>
                      <p class="truncate text-xs text-black/55 dark:text-white/60">
                        {upload.cid}
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="rounded-full"
                        title="Copy CID"
                        onclick={() => handleCopyCid(upload.cid)}
                      >
                        <Icon icon="mdi:content-copy" width="18" height="18" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="rounded-full"
                        title="Open via gateway"
                        onclick={() => handleOpenCid(upload.cid)}
                      >
                        <Icon icon="mdi:open-in-new" width="18" height="18" />
                      </Button>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-white/60">
                    {#if upload.spaceName || upload.spaceDid}
                      <span class="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
                        <Icon icon="mdi:database" width="14" height="14" class="text-black/50 dark:text-white/60" />
                        {upload.spaceName ?? upload.spaceDid}
                      </span>
                    {/if}
                    {#if typeof upload.size === 'number'}
                      <span class="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
                        <Icon icon="mdi:file-outline" width="14" height="14" class="text-black/50 dark:text-white/60" />
                        {formatBytes(upload.size)}
                      </span>
                    {/if}
                    {#if upload.mimeType}
                      <span class="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
                        <Icon icon="mdi:tag-outline" width="14" height="14" class="text-black/50 dark:text-white/60" />
                        {upload.mimeType}
                      </span>
                    {/if}
                    <span class="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 dark:bg-white/10">
                      <Icon icon="mdi:clock-outline" width="14" height="14" class="text-black/50 dark:text-white/60" />
                      Updated {formatTimestamp(upload.updatedAt)}
                    </span>
                  </div>

                  {#if upload.tags && upload.tags.length}
                    <div class="flex flex-wrap gap-2">
                      {#each upload.tags as tag, tagIndex (`${upload.cid}-${tagIndex}-${tag}`)}
                        <span class="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs text-black/70 dark:border-white/20 dark:bg-white/5 dark:text-white/70">
                          #{tag}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </Dialog.Content>
</Dialog.Root>

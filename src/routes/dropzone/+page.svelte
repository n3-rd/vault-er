<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { listen as listenEvent } from '@tauri-apps/api/event';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  import { uploadFile, waitForAuthReady, getCurrentSpace, getSpaces, setSpace, authStore } from '$lib/auth-store';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import '../../app.css';
  import Shape1 from '$lib/components/shapes/shape1.svelte';
  import { LogOut, Upload, FolderOpen, X, Check } from 'lucide-svelte';

  let isDragging = $state(false);
  let picking = $state(false);
  let uploading = $state(false);
  let uploadSuccess = $state(false);
  let currentSpace = $state<any>(null);
  let availableSpaces = $state<any[]>([]);
  let checkingSpace = $state(true);
  let isAuthenticated = $derived($authStore.client !== null);

  async function pathToFile(path: string): Promise<File> {
    const bytes = await readFile(path);
    const name = path.split(/[/\\]/).pop() ?? 'upload.bin';
    return new File([bytes], name);
  }

  async function ensureSpaceSelected(): Promise<boolean> {
    try {
      await waitForAuthReady();
      
      const spaces = await getSpaces();
      availableSpaces = spaces;
      
      if (spaces.length === 0) {
        toast.error('No spaces available');
        return false;
      }
      
      const space = await getCurrentSpace();
      if (space) {
        currentSpace = space;
        return true;
      }
      
      if (spaces.length > 0) {
        await setSpace(spaces[0].did());
        currentSpace = spaces[0];
        return true;
      }
      
      return false;
    } catch (e: any) {
      console.error('Space check error:', e);
      return false;
    }
  }

  async function handleSpaceSelection(space: any) {
    try {
      await setSpace(space.did());
      currentSpace = space;
      toast.success(`Selected space: ${space.meta()?.name || 'Unnamed'}`);
    } catch (e: any) {
      toast.error('Failed to set space');
    }
  }

  async function handlePaths(paths: string[]) {
    if (uploading) {
      toast.error('Upload already in progress');
      return;
    }

    if (paths.length === 0) return;

    const hasSpace = await ensureSpaceSelected();
    if (!hasSpace) {
      toast.error('Please select a space first');
      return;
    }

    uploading = true;
    let successCount = 0;
    
    try {
      await waitForAuthReady();
      
      for (const path of paths) {
        try {
          const file = await pathToFile(path);
          const indexed = await uploadFile(file);
          successCount++;
        } catch (e: any) {
          const errorMsg = e?.message ?? String(e);
          toast.error(`Failed: ${errorMsg}`);
        }
      }
      
      if (successCount > 0) {
        uploadSuccess = true;
        setTimeout(() => {
          uploadSuccess = false;
        }, 3000);
      }
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      toast.error('Not authenticated');
    } finally {
      uploading = false;
    }
  }

  async function openFilePicker() {
    if (picking || uploading || uploadSuccess) return;
    
    picking = true;
    try {
      const result = await open({
        multiple: true,
        title: 'Select Files to Upload'
      });
      
      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        await handlePaths(paths);
      }
    } catch (e: any) {
      console.error('File picker error:', e);
      toast.error('Failed to open file picker');
    } finally {
      picking = false;
    }
  }

  async function openMainApp() {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow');
    const windows = await getAllWebviewWindows();
    const mainWindow = windows.find(w => w.label === 'main');
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
    }
  }

  async function quitApp() {
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(0);
  }

  onMount(() => {
    let unlisteners: (() => void)[] = [];

    (async () => {
      try {
        await ensureSpaceSelected();
      } catch (e) {
        console.error(e);
      } finally {
        checkingSpace = false;
      }

      const { listen } = await import('@tauri-apps/api/event');
      
      const unlistenDragOver = await listen('tauri://drag-over', () => isDragging = true);
      const unlistenDragLeave = await listen('tauri://drag-leave', () => isDragging = false);
      const unlistenDragDrop = await listen<string[]>('tauri://drag-drop', async (event) => {
        isDragging = false;
        await handlePaths(event.payload);
      });
      const unlistenFilePicker = await listenEvent('open-file-picker', openFilePicker);
      
      // Auto-hide on blur
      const window = getCurrentWindow();
      const unlistenBlur = await window.listen('tauri://blur', async () => {
        if (!picking && !uploading) {
           await window.hide();
        }
      });

      unlisteners.push(unlistenDragOver, unlistenDragLeave, unlistenDragDrop, unlistenFilePicker, unlistenBlur);
    })();

    return () => {
      unlisteners.forEach(fn => fn());
    };
  });
</script>

<svelte:head>
  <title>Vault-er Tray</title>
</svelte:head>

<div class="h-screen w-screen bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden select-none">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20 drag-region" data-tauri-drag-region>
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full {isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}"></div>
      <span class="font-medium text-sm tracking-tight">Vault-er</span>
    </div>
    <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors" onclick={quitApp} title="Quit">
      <X class="w-3.5 h-3.5" />
    </Button>
  </div>

  <!-- Main Content -->
  <div class="flex-1 p-3 flex flex-col gap-2">
    {#if !isAuthenticated}
      <div class="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-1">
          <LogOut class="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 class="font-medium text-sm">Authentication Required</h3>
          <p class="text-xs text-muted-foreground mt-1">Please login in the main app to continue</p>
        </div>
        <Button onclick={openMainApp} size="sm" class="w-full">Open Vault-er</Button>
      </div>
    {:else}
      <!-- Drop Zone -->
      <div 
        role="button"
        tabindex="0"
        class="flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center p-2 transition-all duration-200 group relative overflow-hidden
        {isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
        {uploading ? 'opacity-50 cursor-wait' : uploadSuccess ? 'border-emerald-500/50 bg-emerald-500/5' : 'cursor-pointer'}"
        onclick={openFilePicker}
        onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
      >
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        {#if uploading}
          <Shape1 color="#D0BCFF" className="w-8 h-8 spin-slow mb-2" />
          <p class="text-xs text-muted-foreground font-medium animate-pulse">Uploading...</p>
        {:else if uploadSuccess}
          <div class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
            <Check class="w-4 h-4 text-emerald-500" />
          </div>
          <p class="text-xs text-emerald-600 font-medium animate-in fade-in slide-in-from-bottom-2">Upload Complete</p>
        {:else}
          <div class="w-8 h-8 rounded-full bg-background border shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200">
            <Upload class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p class="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">Drop files or click</p>
        {/if}
      </div>

      <!-- Space Selector -->
      <div class="space-y-1.5">
        <label for="space-select" class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">Target Space</label>
        <div class="relative">
          <select
            id="space-select"
            value={currentSpace?.did() || ''}
            onchange={(e) => {
              const selectedDid = e.currentTarget.value;
              const space = availableSpaces.find(s => s.did() === selectedDid);
              if (space) handleSpaceSelection(space);
            }}
            disabled={uploading || availableSpaces.length === 0}
            class="w-full pl-3 pr-8 py-2 bg-background border border-border rounded-lg text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow shadow-sm"
          >
            {#if !currentSpace}
              <option value="">Select a space...</option>
            {/if}
            {#each availableSpaces as space}
              <option value={space.did()}>
                {space.meta()?.name || 'Unnamed Space'}
              </option>
            {/each}
          </select>
          <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" size="sm" class="w-full text-xs h-9 shadow-sm hover:bg-secondary/80" onclick={openMainApp}>
          <FolderOpen class="w-3.5 h-3.5 mr-2 opacity-70" />
          Open App
        </Button>
        <Button variant="ghost" size="sm" class="w-full text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onclick={quitApp}>
          <LogOut class="w-3.5 h-3.5 mr-2 opacity-70" />
          Quit
        </Button>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: transparent;
  }
</style>

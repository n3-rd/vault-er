<script lang="ts">
  import { onMount } from 'svelte';
  import { listen as listenEvent } from '@tauri-apps/api/event';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readFile } from '@tauri-apps/plugin-fs';
  import { uploadFile, waitForAuthReady, getCurrentSpace, getSpaces, setSpace, authStore } from '$lib/auth-store';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import '../../app.css';
  import Shape1 from '$lib/components/shapes/shape1.svelte';

  let log: string[] = $state([]);
  let isDragging = $state(false);
  let picking = $state(false);
  let uploading = $state(false);
  let currentSpace = $state<any>(null);
  let availableSpaces = $state<any[]>([]);
  let checkingSpace = $state(true);
  let isAuthenticated = $derived($authStore.client !== null);

  function addLog(msg: string) {
    log = [...log, `${new Date().toLocaleTimeString()}: ${msg}`];
    const el = document.getElementById('log');
    if (el) {
      setTimeout(() => (el.scrollTop = el.scrollHeight), 10);
    }
  }

  async function pathToFile(path: string): Promise<File> {
    const bytes = await readFile(path);
    const name = path.split(/[/\\]/).pop() ?? 'upload.bin';
    return new File([bytes], name);
  }

  async function ensureSpaceSelected(): Promise<boolean> {
    try {
      // Wait for auth to be ready first
      await waitForAuthReady();
      
      const spaces = await getSpaces();
      availableSpaces = spaces;
      
      if (spaces.length === 0) {
        addLog('❌ No spaces available');
        return false;
      }
      
      const space = await getCurrentSpace();
      if (space) {
        currentSpace = space;
        addLog(`✓ Current space: ${space.meta()?.name || 'Unnamed'}`);
        return true;
      }
      
      // Auto-select first space if none selected
      if (spaces.length > 0) {
        await setSpace(spaces[0].did());
        currentSpace = spaces[0];
        addLog(`✓ Selected space: ${spaces[0].meta()?.name || 'Unnamed'}`);
        return true;
      }
      
      return false;
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      addLog(`❌ Space error: ${errorMsg}`);
      console.error('Space check error:', e);
      return false;
    }
  }

  async function handleSpaceSelection(space: any) {
    try {
      await setSpace(space.did());
      currentSpace = space;
      addLog(`✓ Selected space: ${space.meta()?.name || 'Unnamed'}`);
    } catch (e: any) {
      toast.error('Failed to set space');
      addLog(`❌ Failed to set space`);
    }
  }

  async function handlePaths(paths: string[]) {
    if (uploading) {
      toast.error('Upload already in progress');
      return;
    }

    if (paths.length === 0) return;

    // I did this to make sure the space is selected
    const hasSpace = await ensureSpaceSelected();
    if (!hasSpace) {
      addLog('⚠️ Please select a space first');
      return;
    }

    uploading = true;
    let successCount = 0;
    
    try {
      await waitForAuthReady();
      
      for (const path of paths) {
        try {
          const file = await pathToFile(path);
          addLog(`⏫ Uploading: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          
          const cid = await uploadFile(file);
          
          addLog(`✅ ${file.name} → ${cid.slice(0, 12)}...`);
          toast.success(`Uploaded ${file.name}`);
          successCount++;
        } catch (e: any) {
          const errorMsg = e?.message ?? String(e);
          addLog(`❌ ${path.split(/[/\\]/).pop()}: ${errorMsg}`);
          toast.error(`Failed: ${errorMsg}`);
        }
      }
      
      if (successCount > 0) {
        addLog(`🎉 Uploaded ${successCount}/${paths.length} file(s)`);
        // Auto-hide after success
        setTimeout(async () => {
          const window = getCurrentWindow();
          await window.hide();
        }, 2000);
      }
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      addLog(`❌ Auth error: ${errorMsg}`);
      toast.error('Not authenticated. Please login first.');
    } finally {
      uploading = false;
    }
  }

  async function openFilePicker() {
    if (picking || uploading) return;
    
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
      const errorMsg = e?.message ?? String(e);
      addLog(`❌ File picker: ${errorMsg}`);
      toast.error('Failed to open file picker');
    } finally {
      picking = false;
    }
  }

  onMount(() => {
    let unlisteners: (() => void)[] = [];

    // Initialize async setup
    (async () => {
      try {
        addLog('🔄 Initializing...');
        const success = await ensureSpaceSelected();
        if (!success) {
          addLog('⚠️ Please login in the main app first');
        }
      } catch (e: any) {
        console.error('Space check error:', e);
        addLog(`❌ Init error: ${e?.message ?? String(e)}`);
      } finally {
        checkingSpace = false;
      }

      // Listen for file drop events from Tauri
      const { listen } = await import('@tauri-apps/api/event');
      
      const unlistenDragOver = await listen('tauri://drag-over', () => {
        isDragging = true;
      });
      
      const unlistenDragLeave = await listen('tauri://drag-leave', () => {
        isDragging = false;
      });
      
      const unlistenDragDrop = await listen<string[]>('tauri://drag-drop', async (event) => {
        isDragging = false;
        await handlePaths(event.payload);
      });

      // Listen for file picker event from tray menu
      const unlistenFilePicker = await listenEvent('open-file-picker', () => {
        openFilePicker();
      });

      unlisteners.push(unlistenDragOver, unlistenDragLeave, unlistenDragDrop, unlistenFilePicker);
    })();

    return () => {
      unlisteners.forEach(fn => fn());
    };
  });
</script>

<svelte:head>
  <title>Drop Zone - Vault-er</title>
</svelte:head>

<div class="h-screen w-screen bg-card/95 backdrop-blur-xl border-2 border-dashed border-border rounded-[20px] flex flex-col items-center justify-center p-6 transition-all duration-200 {isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : ''} {uploading ? 'border-green-500/60' : ''}">
  
  <button
    onclick={async () => {
      const window = getCurrentWindow();
      await window.hide();
    }}
    class="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 hover:bg-destructive/80 transition-colors flex items-center justify-center text-foreground hover:text-destructive-foreground"
    title="Close"
  >
    ✕
  </button>

  <div class="text-center flex-1 flex flex-col items-center justify-center">
    <div class="text-6xl mb-4 {uploading ? '' : isDragging ? '' : 'animate-bounce'}">
      {#if uploading}
        <Shape1 color="#D0BCFF" className="w-16 h-16 spin-slow" />
      {:else if isDragging}
        📥
      {:else}
        ☁️
      {/if}
    </div>
    
    <h3 class="text-xl font-semibold mb-3">Drop Zone</h3>
    
    {#if !isAuthenticated}
      <div class="text-center mb-4">
        <p class="text-sm text-destructive mb-2">
          Not authenticated
        </p>
        <p class="text-xs text-muted-foreground mb-3">
          Please login in the main app
        </p>
        <Button 
          onclick={async () => {
            checkingSpace = true;
            await ensureSpaceSelected();
            checkingSpace = false;
          }}
          variant="outline"
          size="sm"
        >
          Retry
        </Button>
      </div>
    {:else if checkingSpace}
      <p class="text-sm text-muted-foreground mb-4">Checking spaces...</p>
    {:else}
      <p class="text-sm text-muted-foreground mb-3">
        {#if uploading}
          Uploading files...
        {:else}
          Drag files here to upload
        {/if}
      </p>
      
      <!-- Space picker -->
      {#if availableSpaces.length > 0}
        <div class="w-full max-w-xs mb-4">
          <label for="space-select" class="text-xs text-muted-foreground block mb-2">Upload to:</label>
          <select
            id="space-select"
            value={currentSpace?.did() || ''}
            onchange={(e) => {
              const selectedDid = e.currentTarget.value;
              const space = availableSpaces.find(s => s.did() === selectedDid);
              if (space) handleSpaceSelection(space);
            }}
            disabled={uploading}
            class="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      {:else if !checkingSpace}
        <div class="text-center mb-4">
          <p class="text-sm text-destructive mb-2">
            No spaces available
          </p>
          <Button 
            onclick={async () => {
              checkingSpace = true;
              await ensureSpaceSelected();
              checkingSpace = false;
            }}
            variant="outline"
            size="sm"
            class="text-xs"
          >
            Retry
          </Button>
        </div>
      {/if}
    {/if}
    
    <Button 
      onclick={openFilePicker}
      disabled={picking || uploading || !currentSpace}
      variant="default"
      class="w-full max-w-xs"
    >
      {picking ? 'Opening...' : 'Choose files'}
    </Button>
  </div>
  
  {#if log.length > 0}
    <div class="w-full max-h-28 overflow-y-auto bg-secondary/50 rounded-xl p-3 mt-4" id="log">
      {#each log as line}
        <div class="text-xs text-foreground/90 font-mono py-0.5 truncate">{line}</div>
      {/each}
    </div>
  {/if}
</div>


<style>
  /* Ensure scrollbar styling matches theme */
  #log::-webkit-scrollbar {
    width: 6px;
  }

  #log::-webkit-scrollbar-track {
    background: transparent;
  }

  #log::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  #log::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }
</style>

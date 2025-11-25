<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index";
    import Icon from "@iconify/svelte";
    import { copyToClipboard } from "$lib/utils";
    import { toast } from 'svelte-sonner';
    import { mode } from "mode-watcher";
    // @ts-ignore - svelte-qrcode types not available
    import QrCode from "svelte-qrcode";

    interface Props {
        open: boolean;
        value: string;
        title: string;
        onOpenChange?: (open: boolean) => void;
    }

    let { open, value, title, onOpenChange }: Props = $props();

    function handleCopy() {
        copyToClipboard(value);
    }
</script>

<Dialog.Root bind:open={open} onOpenChange={onOpenChange}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="line-clamp-1 text-ellipsis break-all">{title}</Dialog.Title>
            <Dialog.Description>
                Scan this QR code to share or access this {value.includes('did:') ? 'space' : 'file'}
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col items-center gap-4 p-4">
            {#if value}
                <div class="overflow-hidden rounded-xl bg-white dark:bg-black p-2">
                    <QrCode 
                        {value} 
                        size={200} 
                        background={mode.current === 'dark' ? '#000' : '#fff6f8'} 
                        color={mode.current === 'dark' ? '#FC5259' : '#b90000'} 
                    />
                </div>
                <div class="text-center">
                    <p class="max-w-[300px] break-all text-sm text-black/80 dark:text-white/90">
                        {value}
                    </p>
                    <Button
                        variant="outline"
                        class="mt-2"
                        onclick={handleCopy}
                    >
                        <Icon icon="ic:baseline-content-copy" width="16" height="16" class="mr-2" />
                        Copy
                    </Button>
                </div>
            {/if}
        </div>
        <Dialog.Footer>
            <Button onclick={()=>{
                if (onOpenChange) {
                    onOpenChange(false);
                }
                open = false;
            }}>Close</Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

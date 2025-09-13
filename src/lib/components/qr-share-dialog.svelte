<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index";
    import Icon from "@iconify/svelte";
    import { copyToClipboard } from "$lib/utils";
    import { toast } from 'svelte-sonner';
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
                <QrCode {value} size={200} background="#fff6f8" color="#b90000" />
                <div class="text-center">
                    <p class="text-sm text-muted-foreground break-all max-w-[300px]">
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

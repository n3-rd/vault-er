<script lang="ts">
    import { onDestroy } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import { login } from "$lib/auth";
    import { authStore, type AuthState } from "$lib/auth-store";
    import Icon from "@iconify/svelte";
    import ModeToggle from "$lib/components/mode-toggle.svelte";

    let email = "";
    let isLoading = false;

    let authState: AuthState = { client: null, loading: false, emailSent: false, emailSentTo: null };
    const unsubscribe = authStore.subscribe((state) => {
        authState = state;
    });

    onDestroy(() => {
        unsubscribe();
    });

    async function handleSubmit() {
        isLoading = true;
        const controller = new AbortController();
        const signal = controller.signal;

        try {
            // This promise simulates an email verification notification.
            // It waits 4 seconds to show a toast message unless aborted or email verification not needed.
            const verifyEmailModal = new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    if (!signal.aborted && authState.emailSent) {
                        toast.info(
                            "We sent a verification link to your email!",
                        );
                    }
                    resolve();
                }, 4000);

                // Listen for the abort signal to cancel the timeout and resolve the promise.
                signal.addEventListener("abort", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            await Promise.all([login(email), verifyEmailModal]);
            controller.abort();
            toast.success("Login successful");
            goto("/");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Login failed",
            );
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="relative flex min-h-[calc(100vh-8rem)] w-full items-center justify-center px-4 py-10">
    <div class="absolute top-4 right-4">
        <ModeToggle />
    </div>
    <div class="pointer-events-none absolute -top-16 right-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(185,0,0,0.25)_0%,_transparent_70%)] blur-2xl"></div>
    <div class="pointer-events-none absolute -bottom-20 left-12 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,107,107,0.28)_0%,_transparent_70%)] blur-2xl"></div>

    <div class="relative grid w-full max-w-4xl gap-8 rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10 md:grid-cols-[1.15fr_1fr]">
        <div class="flex flex-col justify-between gap-10">
            <div class="space-y-4">
                <span class="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-black/60 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                    Vault-er
                </span>
                <h1 class="text-3xl font-semibold text-black/85 md:text-4xl dark:text-white/90">
                    Sign in to your native vault
                </h1>
                <p class="text-sm text-black/60 md:text-base dark:text-white/60">
                    Experience a desktop-class interface with secure, passwordless access to your decentralized storage.
                </p>
            </div>
            <div class="grid gap-3 rounded-2xl border border-black/10 bg-white/90 p-5 text-sm text-black/65 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <div class="flex items-center gap-3">
                    <Icon icon="mdi:package-variant-closed" width="20" height="20" class="text-primary" />
                    Built with Storacha for decentralized storage
                </div>
                <div class="flex items-center gap-3">
                    <Icon icon="mdi:school" width="20" height="20" class="text-primary" />
                    Developed during PLDG Cohort 4
                </div>
            </div>
        </div>

        <form
            on:submit|preventDefault={handleSubmit}
            class="flex items-center"
        >
            <div class="w-full rounded-[1.5rem] border border-black/10 bg-white/95 p-7 shadow-lg shadow-black/10 dark:border-white/10 dark:bg-neutral-950">
                <div class="space-y-6">
                    <div class="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/55">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            bind:value={email}
                            placeholder="you@example.com"
                            required
                            class="h-12 rounded-xl border border-black/10 bg-white/90 px-4 text-sm outline-none transition focus:border-black/40 focus:ring-0 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        class="h-12 w-full rounded-full bg-black text-sm font-semibold text-white shadow-lg shadow-black/25 transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                        {#if isLoading}
                            {#if authState.emailSent}
                                <span class="inline-flex items-center gap-2">
                                    <Icon icon="svg-spinners:3-dots-fade" width="20" height="20" />
                                    Email sent
                                </span>
                            {:else}
                                <span class="inline-flex items-center gap-2">
                                    <Icon icon="svg-spinners:blocks-scale" width="20" height="20" />
                                    Checking…
                                </span>
                            {/if}
                        {:else}
                            Continue with email
                        {/if}
                    </Button>
                    <p class="text-xs text-black/45 dark:text-white/50">
                        We’ll email you a secure link. No passwords to remember.
                    </p>
                </div>
            </div>
        </form>
    </div>
</div>

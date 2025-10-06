<script lang="ts">
    import { onDestroy } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import { login } from "$lib/auth";
    import { authStore, type AuthState } from "$lib/auth-store";
    import Shape1 from "$lib/components/shapes/shape1.svelte";

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

<div
    class="h-[85vh] w-screen flex items-center justify-center relative px-4 sm:px-6 lg:px-8"
>
    <Shape1
        className="absolute -top-12 -right-12 spin-slow"
        color="#D0BCFF"
        height={200}
        width={200}
    />
    <div class="w-full max-w-md lg:max-w-lg xl:max-w-xl space-y-6">
        <div class="flex flex-col gap-6 w-full">
            <h1
                class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase"
            >
                Secure <span class="text-primary">decentralized</span> <br /> file
                sharing
            </h1>
            <p class="text-base sm:text-lg lg:text-xl text-muted-foreground">
                Share files with friends and family securely and privately.
            </p>
        </div>

        <form
            on:submit|preventDefault={handleSubmit}
            class="space-y-4 sm:space-y-6"
        >
            <div>
                <Label htmlFor="email" className="text-sm sm:text-base"
                    >Email</Label
                >
                <Input
                    id="email"
                    type="email"
                    bind:value={email}
                    placeholder="Enter your email"
                    required
                    class="h-10 sm:h-12 text-sm sm:text-base"
                />
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                class="w-full h-10 sm:h-12 text-sm sm:text-base"
            >
                {#if isLoading}
                    {#if authState.emailSent}
                        <span class="inline-flex items-center gap-2">
                            <Shape1 className="spin-slow" color="#D0BCFF" height={20} width={20} />
                            Email sent
                        </span>
                    {:else}
                        Logging in...
                    {/if}
                {:else}
                    Login
                {/if}
            </Button>
        </form>
    </div>
</div>

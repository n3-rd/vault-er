import { getCurrentSpace, waitForAuthReady } from '$lib/auth-store';
import type { PageLoad } from './$types';
import { goto } from '$app/navigation';

export const load: PageLoad = async () => {
    try {
        await waitForAuthReady()
        const currentSpace = await getCurrentSpace()
        return { currentSpace: currentSpace as Space }
    } catch (e) {
        goto('/')
        return {}
    }
}
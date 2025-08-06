import { getCurrentSpace, listContents } from '$lib/auth-store';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    const currentSpace = await getCurrentSpace()

    return { currentSpace: currentSpace as Space }
}
import { writable, get } from 'svelte/store'
import { create } from '@storacha/client'
import { load } from '@tauri-apps/plugin-store'
import { generate } from 'yet-another-name-generator'
import { CID } from 'multiformats/cid'
import { indexUpload } from './indexer'

export type AuthState = {
  client: any | null
  loading: boolean
  emailSent: boolean
  emailSentTo: string | null
}

export const authStore = writable<AuthState>({
  client: null,
  loading: true,
  emailSent: false,
  emailSentTo: null
})

// Initialize auth with timeout and better error handling
;(async () => {
  const timeout = setTimeout(() => {
    console.warn('Auth initialization timed out, falling back to unauthenticated state')
    authStore.update(state => ({ ...state, loading: false }))
  }, 10000) // 10 second timeout

  try {
    const c = await create()
    const store = await load('auth.json')
    const email = await store.get('email')
    if (email) {
      try {
        await Promise.race([
          c.login(email as `${string}@${string}`),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Login timeout')), 5000)
          )
        ])
        clearTimeout(timeout)
        authStore.update(state => ({ ...state, client: c, loading: false }))
      } catch (e) {
        console.error('Login failed or timed out:', e)
        try {
          await store.delete('email')
          await store.save()
        } catch (storeError) {
          console.error('Failed to clear stored email:', storeError)
        }
        clearTimeout(timeout)
        authStore.update(state => ({ ...state, loading: false }))
      }
    } else {
      clearTimeout(timeout)
      authStore.update(state => ({ ...state, loading: false }))
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
    clearTimeout(timeout)
    authStore.update(state => ({ ...state, loading: false }))
  }
})()

export const login = async (email: string) => {
  console.log('Login function called with email:', email)
  try {
    const c = await create()
    console.log('Storacha client created')
    
    authStore.update(state => ({ 
      ...state, 
      emailSent: true, 
      emailSentTo: email 
    }))
    
    console.log('About to call c.login()')
    const account = await c.login(email as `${string}@${string}`)
    console.log('Login initiated, account:', account)
    
    account.plan.wait().then(async () => {
      console.log('Plan selection completed')
      const store = await load('auth.json')
      await store.set('email', email)
      await store.save()
      
      authStore.update(state => ({
        ...state,
        client: c,
        emailSent: false,
        emailSentTo: null
      }))
    }).catch((error) => {
      console.error('Plan selection error:', error)
      authStore.update(state => ({
        ...state,
        emailSent: false,
        emailSentTo: null
      }))
    })
    
  } catch (error) {
    console.error('Login error:', error)
    if (error && typeof error === 'object' && 'toString' in error) {
      const errorStr = error.toString()
      if (errorStr.includes('network') || errorStr.includes('timeout')) {
        authStore.update(state => ({
          ...state,
          emailSent: false,
          emailSentTo: null
        }))
      }
    }
  }
}

export const resetEmailSent = () => {
  console.log('Resetting email sent state')
  authStore.update(state => ({
    ...state,
    emailSent: false,
    emailSentTo: null
  }))
}

// File operations using the authenticated client
export const uploadFile = async (file: File, description?: string, tags?: string[]) => {
  const { client } = get(authStore);
  if (!client) throw new Error("Not authenticated");

  const space = await client.currentSpace();
  if (!space) throw new Error("No space selected");

  // Validate space registration
  const info = await client.capability.space.info(space.did());
  if (!info?.providers?.length) throw new Error("Space not registered with a provider");

  // Upload with shard callback
  const cidObj = await client.uploadFile(file, {
    onShardStored: (meta) => console.log("Shard stored:", meta.cid.toString()),
  });
  const contentCID = cidObj.toString();

  // Retrieve upload details including shard CIDs
  const details = await client.capability.upload.get(cidObj);
  const shardCids = (details.shards ?? details.blobs ?? []).map((c: any) => c.toString());

  // Convert to proper CID instances if needed
  const contentCidInst = CID.parse(contentCID);
  const shardCidInsts = shardCids.map(s => CID.parse(s));

  // (Optional) Re-register the upload explicitly if you used low-level APIs
  // await client.capability.upload.add(contentCidInst, shardCidInsts);

  // Persist metadata
  await indexUpload(
    contentCID,
    file.name,
    space.did(),
    description,
    tags,
    shardCids
  );

  return contentCID;
};

export const downloadFile = async (fileId: string) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const result = await client.download(fileId)
    return result
  } catch (error) {
    console.error('Download error:', error)
    throw error
  }
}

export const listFiles = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const files = await client.list()
    return files
  } catch (error) {
    console.error('List files error:', error)
    throw error
  }
}

export const shareFile = async (fileId: string, email: string, permissions: string[] = ['read']) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  try {
    const result = await client.share(fileId, {
      email,
      permissions
    })
    return result
  } catch (error) {
    console.error('Share file error:', error)
    throw error
  }
} 

export const getSpaces = async () => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.spaces()
}

export const setSpace = async (spaceId: string) => {
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.setCurrentSpace(spaceId)
}

export const waitForAuthReady = (timeoutMs = 10000) =>
  new Promise<void>((resolve, reject) => {
    const state = get(authStore)
    if (!state.loading) return resolve()
    let unsub: (() => void) | null = null
    const timeout = setTimeout(() => {
      if (unsub) unsub()
      reject(new Error('Auth init timeout'))
    }, timeoutMs)
    unsub = authStore.subscribe((s) => {
      if (!s.loading) {
        clearTimeout(timeout)
        if (unsub) unsub()
        resolve()
      }
    })
  })

export const getCurrentSpace = async () => {
  await waitForAuthReady()
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  return client.currentSpace()
}

export const listContents = async () => {
  await waitForAuthReady()
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }

  // Prefer uploads listing over raw blob listing so we show root CIDs
  const uploads = await client.capability.upload.list()
  // Map to the expected shape used by the UI
  const results = (uploads?.results ?? []).map((u: any) => {
    const root = u?.root?.toString?.() ?? u?.root ?? u?.cid ?? ''
    const insertedAt = u?.insertedAt ?? u?.inserted_at ?? Date.now()
    // Size may not be present on upload list; fall back to 0
    const size = u?.size ?? u?.bytes ?? 0
    return {
      cause: root,
      insertedAt,
      blob: { size },
      url: root ? `https://${root}.ipfs.w3s.link` : undefined,
    }
  })
  return { size: uploads?.size ?? results.length, results }
}

export const createSpace = async (name?: string) => {
  const state = get(authStore)
  const store = await load('auth.json')
  const email = await store.get('email')
  if (!email || typeof email !== 'string') {
    throw new Error('No email found to register space. Please login again.')
  }
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }
  
  // Get the account from the login process
  const account = await client.login(email as `${string}@${string}`)
  await account.plan.wait() // Wait for plan setup

  return client.createSpace(name || generate(), { account }).then(async (space: any) => {
    await setSpace(space.did())
    return space
  })
}


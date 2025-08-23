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

// Initialize auth
;(async () => {
  try {
    const c = await create()
    const store = await load('auth.json')
    const email = await store.get('email')
    if (email) {
      try {
        await c.login(email as `${string}@${string}`)
        authStore.update(state => ({ ...state, client: c, loading: false }))
      } catch (e) {
        console.error('Login failed or timed out:', e)
        await store.delete('email')
        await store.save()
        authStore.update(state => ({ ...state, loading: false }))
      }
    } else {
      authStore.update(state => ({ ...state, loading: false }))
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
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
  const state = get(authStore)
  const { client } = state
  if (!client) {
    throw new Error('Not authenticated')
  }

  // Ensure a current space is set and registered with a provider
  const space = await client.currentSpace()
  if (!space) {
    throw new Error('No space selected. Choose a space before uploading.')
  }
  try {
    const info = await client.capability.space.info(space.did())
    if (!info || !info.providers || info.providers.length === 0) {
      throw new Error('Current space is not registered with a provider.')
    }
  } catch (e) {
    throw new Error('Current space is not registered (space/info failed). Please register the space and try again.')
  }

  try {
    const cid = await client.uploadFile(file)
    console.log("indexing upload", cid.toString(), file.name, space.did(), description, tags)
    indexUpload(cid.toString(), file.name, space.did(), description, tags)
    return cid.toString();
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

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


const temporary = new Set([502, 503, 504])
let recovery: Promise<void> | undefined

export function connect(maxWait = 120_000, healthUrl = '/api/health'): Promise<void> {
  if (recovery) return recovery
  recovery = (async () => {
    const deadline = Date.now() + maxWait
    let delay = 1000
    while (Date.now() < deadline) {
      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(Math.max(1, Math.min(15_000, deadline - Date.now()))), cache: 'no-store', credentials: 'omit' })
        if (response.status === 200) {
          const body = await response.text()
          if (!body.trimStart().startsWith('<') && JSON.parse(body)?.status === 'ok') return
        }
        if (response.status !== 200 && !temporary.has(response.status)) throw new Error(`Server returned HTTP ${response.status}`)
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Server returned')) throw error
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, Math.max(0, deadline - Date.now()))))
      delay = Math.min(delay * 2, 10_000)
    }
    throw new Error('The marketplace server is unavailable. Please try again.')
  })().finally(() => { recovery = undefined })
  return recovery
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if ((options.method ?? 'GET').toUpperCase() !== 'GET') {
    const response = await fetch(url, options)
    const body = await response.clone().text()
    if (body.trimStart().startsWith('<')) throw new Error('The server returned an invalid response. Please try again.')
    return response
  }
  options.signal?.throwIfAborted()
  const deadline = Date.now() + 120_000
  let delay = 1000
  while (Date.now() < deadline) {
  options.signal?.throwIfAborted()
  let response: Response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(Math.max(1, Math.min(15_000, deadline - Date.now())))]) })
    if (!temporary.has(response.status)) {
      const body = await response.clone().text()
      if (body.trimStart().startsWith('<')) throw new Error('HTML startup response')
      JSON.parse(body)
      return response
    }
  } catch (error) {
    if (options.signal?.aborted) throw error
  }
  if (Date.now() >= deadline) break
  options.signal?.throwIfAborted()
  await new Promise(resolve => setTimeout(resolve, Math.min(delay, Math.max(0, deadline - Date.now()))))
  delay = Math.min(delay * 2, 10_000)
  }
  throw new Error('The marketplace server is unavailable. Please try again.')
}

let startup: Promise<void> | undefined
export function initializeMarketplace(): Promise<void> {
  if (startup) return startup
  startup = (async () => {
    const controller = new AbortController()
    const deadline = Date.now() + 120_000
    const timeout = setTimeout(() => controller.abort(), 120_000)
    try {
      const configResponse = await apiFetch('/runtime-config.json', { signal: controller.signal })
      if (!configResponse.ok) throw new Error('Unable to load server configuration.')
      const config = await configResponse.json() as { backendOrigin?: string }
      let healthUrl = '/api/health'
      if (config.backendOrigin) {
        const origin = new URL(config.backendOrigin)
        if (origin.protocol !== 'https:' || origin.origin !== config.backendOrigin) throw new Error('Invalid backend origin.')
        healthUrl = `${origin.origin}/api/health`
      }
      controller.signal.throwIfAborted()
      await connect(Math.max(1, deadline - Date.now()), healthUrl)
      await Promise.all(['/api/home', '/api/auth/me', '/api/products', '/api/products/filters'].map(async url => {
        const response = await apiFetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error('Unable to load initial marketplace data.')
      }))
    } finally { clearTimeout(timeout) }
  })().finally(() => { startup = undefined })
  return startup
}

const temporary = new Set([502, 503, 504])
let recovery: Promise<void> | undefined

export function connect(maxWait = 120_000): Promise<void> {
  if (recovery) return recovery
  recovery = (async () => {
    const deadline = Date.now() + maxWait
    let delay = 1000
    while (Date.now() < deadline) {
      try {
        const response = await fetch('/api/health', { signal: AbortSignal.timeout(Math.min(15_000, deadline - Date.now())), cache: 'no-store' })
        if (response.ok) return
        if (!temporary.has(response.status)) throw new Error(`Server returned HTTP ${response.status}`)
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
  if ((options.method ?? 'GET').toUpperCase() !== 'GET') return fetch(url, options)
  options.signal?.throwIfAborted()
  const deadline = Date.now() + 120_000
  let delay = 1000
  while (Date.now() < deadline) {
  let response: Response
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(Math.max(1, Math.min(15_000, deadline - Date.now())))]) })
    if (!temporary.has(response.status)) return response
  } catch (error) {
    if (options.signal?.aborted) throw error
  }
  if (Date.now() >= deadline) break
  await connect(Math.max(1, deadline - Date.now()))
  options.signal?.throwIfAborted()
  await new Promise(resolve => setTimeout(resolve, Math.min(delay, Math.max(0, deadline - Date.now()))))
  delay = Math.min(delay * 2, 10_000)
  }
  throw new Error('The marketplace server is unavailable. Please try again.')
}

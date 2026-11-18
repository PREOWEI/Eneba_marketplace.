import { apiFetch as fetch } from '../connection'

export async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers },
  })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'The request could not be completed.')
  return data
}

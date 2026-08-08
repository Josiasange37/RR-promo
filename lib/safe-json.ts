/**
 * lib/safe-json.ts
 *
 * Client-side helper: parse a fetch response as JSON WITHOUT throwing a
 * SyntaxError when the server returns something that isn't JSON (e.g. a
 * Next.js HTML error page, a 502 from the host, an empty body). The fetch
 * callers below only read `.success` off the result, so returning an empty
 * object is the safe failure mode — no console JSON.parse noise.
 */
export async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text()
    const trimmed = text.trim()
    if (!trimmed) return {}
    return JSON.parse(trimmed)
  } catch {
    return {}
  }
}

/** Convenience for `fetch(...)` + safeJson. */
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  const res = await fetch(input, init)
  return safeJson(res)
}
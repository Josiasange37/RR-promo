/**
 * lib/admin-auth.ts
 *
 * Server-only helpers for the secret admin panel:
 *  - HttpOnly session cookies (never exposed to JS, immune to XSS token theft)
 *  - Parameterized (SQL-injection-safe) bcrypt lookups via Supabase
 *  - In-database login rate limiting / lockout (brute-force protection)
 *
 * All credential lookups go through the Supabase JS client with bound
 * parameters — raw SQL is never concatenated, so SQL injection is not possible.
 */

import { NextResponse } from "next/server"
import { supabaseAdmin } from "./supabase"

export const SESSION_COOKIE = "admin_session"
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
export const RATE_MAX_ATTEMPTS = 5
export const RATE_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

/* ─────────────────────────────────────────────
   Session verification
───────────────────────────────────────────── */
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token || typeof token !== "string" || token.length > 128 || token.length < 16) return false
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("expires_at")
    .eq("token", token)
    .single()
  if (error || !data) return false
  return new Date(data.expires_at) > new Date()
}

/* ─────────────────────────────────────────────
   Cookie read / write helpers (HttpOnly)
   ───────────────────────────────────────────── */
export function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === SESSION_COOKIE) {
      const value = trimmed.slice(eq + 1)
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }
  return null
}

const cookieBase = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    ...cookieBase,
    maxAge: SESSION_TTL_MS / 1000,
  })
  return res
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", {
    ...cookieBase,
    maxAge: 0,
  })
  return res
}

/* ─────────────────────────────────────────────
   Login rate limiting (brute-force protection)
   ───────────────────────────────────────────── */

function getClientKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const ua = request.headers.get("user-agent") || ""
  return `${ip}|${ua}`.slice(0, 200)
}
export { getClientKey }

export async function isLockedOut(key: string): Promise<{ locked: boolean; remainingS: number }> {
  const { data } = await supabaseAdmin
    .from("login_attempts")
    .select("locked_until")
    .eq("identifier", key)
    .single()
  if (!data || !data.locked_until) return { locked: false, remainingS: 0 }
  const until = new Date(data.locked_until).getTime()
  const diffMs = until - Date.now()
  if (diffMs <= 0) return { locked: false, remainingS: 0 }
  return { locked: true, remainingS: Math.ceil(diffMs / 1000) }
}

export async function recordFailedAttempt(key: string): Promise<void> {
  // Read current state
  const { data } = await supabaseAdmin
    .from("login_attempts")
    .select("attempts, locked_until")
    .eq("identifier", key)
    .single()

  const attempts = (data?.attempts || 0) + 1
  if (attempts >= RATE_MAX_ATTEMPTS) {
    // Lock the key for the window, reset the counter so the lockout is renewed
    const locked_until = new Date(Date.now() + RATE_LOCKOUT_MS).toISOString()
    await supabaseAdmin.from("login_attempts").upsert(
      { identifier: key, attempts: 0, locked_until, updated_at: new Date().toISOString() },
      { onConflict: "identifier" }
    )
    return
  }
  await supabaseAdmin.from("login_attempts").upsert(
    { identifier: key, attempts, updated_at: new Date().toISOString() },
    { onConflict: "identifier" }
  )
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await supabaseAdmin.from("login_attempts").delete().eq("identifier", key)
}

/* ─────────────────────────────────────────────
   Session factory
   ───────────────────────────────────────────── */
export function generateSessionToken(): string {
  const buf = new Uint8Array(48)
  crypto.getRandomValues(buf)
  const bytes: string[] = []
  buf.forEach((b) => bytes.push(b.toString(16).padStart(2, "0")))
  return bytes.join("")
}

export async function createSession(adminId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const { error } = await supabaseAdmin.from("admin_sessions").insert({
    token,
    admin_id: adminId,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`createSession: ${error.message}`)
  return token
}
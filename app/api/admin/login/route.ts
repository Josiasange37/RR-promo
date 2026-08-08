import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import {
  attachSessionCookie,
  createSession,
  getClientKey,
  isLockedOut,
  recordFailedAttempt,
  clearLoginAttempts,
} from "@/lib/admin-auth"
import { verifyTotp } from "@/lib/totp"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, code } = body

    // Validate inputs — reject anything suspicious
    if (
      !username ||
      typeof username !== "string" ||
      username.length > 64 ||
      (typeof password !== "string" && password !== undefined && password !== null) ||
      (typeof code !== "string" && code !== undefined && code !== null)
    ) {
      return NextResponse.json({ success: false, error: "Identifiants invalides." }, { status: 400 })
    }

    // Sanitize: only alphanumeric and underscore allowed for username (no injection vectors)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ success: false, error: "Identifiants invalides." }, { status: 400 })
    }

    // Brute-force protection — lock this client/session window if too many failures
    const key = getClientKey(request)
    const lock = await isLockedOut(key)
    if (lock.locked) {
      return NextResponse.json(
        { success: false, error: `Trop de tentatives. Réessayez dans ${Math.ceil(lock.remainingS / 60)} min.` },
        { status: 429 }
      )
    }

// Parameterized lookup via Supabase (100% SQL-injection safe).
    // Try the extended schema (2FA columns) first; if the migration hasn't run,
    // fall back to the base schema so the panel keeps working.
    let admin: any = null
    {
      const extended = await supabaseAdmin
        .from("admins")
        .select("id, username, label, password_hash, is_owner, totp_secret, totp_enrolled")
        .eq("username", username)
        .single()
      if (extended.data) {
        admin = extended.data
      } else {
        const base = await supabaseAdmin
          .from("admins")
          .select("id, username, label, password_hash")
          .eq("username", username)
          .single()
        if (base.data) {
          admin = { ...base.data, is_owner: false, totp_secret: null, totp_enrolled: false }
        } else if (extended.error) {
          // A hard error other than "not found" — not found is handled below.
          console.error("Admin lookup error:", extended.error.message)
        }
      }
    }

    if (!admin) {
      // Constant-time dummy hash to prevent user-enumeration via timing
      await bcrypt.compare("dummy_password_to_prevent_timing_attack", "$2b$12$dummyhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
      await recordFailedAttempt(key)
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 })
    }

    let valid = false

    if (admin.totp_enrolled) {
      // Primary factor: 6-digit authenticator code.
      const codeOk = typeof code === "string" && code.length > 0 && verifyTotp(code, admin.totp_secret ?? "")
      // Recovery fallback for the owner(s): a valid password still works.
      const ownerPasswordOk =
        admin.is_owner &&
        typeof password === "string" &&
        password.length > 0 &&
        (await bcrypt.compare(password, admin.password_hash))
      valid = codeOk || ownerPasswordOk
    } else {
      // Not yet enrolled → password bootstrap (kept until an authenticator is assigned).
      valid =
        typeof password === "string" &&
        password.length >= 8 &&
        (await bcrypt.compare(password, admin.password_hash))
    }

    if (!valid) {
      await recordFailedAttempt(key)
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 })
    }

    // Success — clear lockout and create session
    await clearLoginAttempts(key)
    const token = await createSession(admin.id)

    const res = NextResponse.json({ success: true, totp: admin.totp_enrolled })
    return attachSessionCookie(res, token)
  } catch (error: any) {
    console.error("Admin login error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
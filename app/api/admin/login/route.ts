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

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate inputs — reject anything suspicious
    if (
      !username ||
      !password ||
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length > 64 ||
      password.length > 128 ||
      password.length < 8
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

    // Parameterized lookup via Supabase (100% SQL-injection safe)
    const { data: admin, error } = await supabaseAdmin
      .from("admins")
      .select("id, username, password_hash")
      .eq("username", username)
      .single()

    if (error || !admin) {
      // Constant-time dummy hash to prevent user-enumeration via timing
      await bcrypt.compare("dummy_password_to_prevent_timing_attack", "$2b$12$dummyhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
      await recordFailedAttempt(key)
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 })
    }

    // Constant-time bcrypt comparison — immune to timing attacks
    const isValid = await bcrypt.compare(password, admin.password_hash)
    if (!isValid) {
      await recordFailedAttempt(key)
      return NextResponse.json({ success: false, error: "Identifiants incorrects." }, { status: 401 })
    }

    // Success — clear lockout and create session
    await clearLoginAttempts(key)
    const token = await createSession(admin.id)

    const res = NextResponse.json({ success: true })
    return attachSessionCookie(res, token)
  } catch (error: any) {
    console.error("Admin login error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
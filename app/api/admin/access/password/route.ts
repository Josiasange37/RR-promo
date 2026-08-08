import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/** Generate a random 18-char password (letters, digits, symbols). */
function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
  const bytes = crypto.randomBytes(18)
  let out = ""
  for (let i = 0; i < 18; i++) out += chars[bytes[i] % chars.length]
  return out
}

/**
 * Administratively reset an admin's password and return it once. Used as a
 * recovery path for accounts temporarily without an authenticator.
 */
export async function POST(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { adminId } = body
    if (!adminId || typeof adminId !== "string" || adminId.length > 64) {
      return NextResponse.json({ success: false, error: "Cible invalide." }, { status: 400 })
    }

    const plain = randomPassword()
    const hash = await bcrypt.hash(plain, 12)

    const { error: updateError } = await supabaseAdmin
      .from("admins")
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq("id", adminId)
    if (updateError) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({ success: true, adminId, newPassword: plain })
  } catch (error: any) {
    console.error("Admin password reset error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
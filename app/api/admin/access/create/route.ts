import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

export const dynamic = "force-dynamic"

function strongPassword(len = 32) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789!@#$%^&*_-+=?"
  const bytes = randomBytes(len)
  let pw = ""
  for (let i = 0; i < len; i++) pw += charset[bytes[i] % charset.length]
  return pw
}

/** Create a new admin account (owner only). The generated password is shown once. */
export async function POST(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const username = String(body.username ?? "").trim()
    const label = body.label ? String(body.label).trim().slice(0, 80) : null

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { success: false, error: "Nom d'utilisateur invalide (lettres, chiffres et _ uniquement)." },
        { status: 400 }
      )
    }

    const { data: exists, error: existsError } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("username", username)
      .maybeSingle()
    if (!existsError && exists) {
      return NextResponse.json({ success: false, error: "Ce nom d'utilisateur existe déjà." }, { status: 409 })
    }

    const password = strongPassword()
    const passwordHash = await bcrypt.hash(password, 12)

    const { data: created, error } = await supabaseAdmin
      .from("admins")
      .insert({ username, password_hash: passwordHash, label, is_owner: false, totp_enrolled: false })
      .select("id, username, label")
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      admin: created,
      password,
    })
  } catch (error: any) {
    console.error("Admin create error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
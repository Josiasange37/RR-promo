import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"
import { verifyTotp } from "@/lib/totp"

export const dynamic = "force-dynamic"

/**
 * Phase 2 — verify a 6-digit code from the freshly provisioned authenticator.
 * On success the admin is marked as TOTP-enrolled (password no longer accepted
 * for them, except owner recovery fallback).
 */
export async function POST(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { adminId, code } = body
    if (!adminId || typeof adminId !== "string" || adminId.length > 64) {
      return NextResponse.json({ success: false, error: "Cible invalide." }, { status: 400 })
    }
    if (!code || typeof code !== "string" || !/^[0-9]{6}$/.test(code.trim())) {
      return NextResponse.json({ success: false, error: "Code à 6 chiffres requis." }, { status: 400 })
    }

    const { data: target, error } = await supabaseAdmin
      .from("admins")
      .select("id, username, totp_secret")
      .eq("id", adminId)
      .single()
    if (error || !target) {
      return NextResponse.json({ success: false, error: "Administrateur introuvable." }, { status: 404 })
    }
    if (!target.totp_secret) {
      return NextResponse.json({ success: false, error: "Aucun secret en attente. Relancez l'enrôlement." }, { status: 400 })
    }

    if (!verifyTotp(code, target.totp_secret)) {
      return NextResponse.json({ success: false, error: "Code incorrect. Vérifiez l'heure de votre téléphone." }, { status: 401 })
    }

    const { error: updateError } = await supabaseAdmin
      .from("admins")
      .update({ totp_enrolled: true, updated_at: new Date().toISOString() })
      .eq("id", target.id)
    if (updateError) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({ success: true, username: target.username })
  } catch (error: any) {
    console.error("Admin totp confirm error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
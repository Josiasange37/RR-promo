import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"
import { generateTotpSecret, buildOtpauthUri, generateQrDataUrl } from "@/lib/totp"

export const dynamic = "force-dynamic"

/**
 * Phase 1 — generate a fresh TOTP secret for an admin and hand back the
 * otpauth URI + QR so the authenticator app can be provisioned. The secret is
 * stored immediately but the admin is NOT marked enrolled until a code from
 * the new app has been verified (see /confirm).
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

    const { data: target, error } = await supabaseAdmin
      .from("admins")
      .select("id, username, label")
      .eq("id", adminId)
      .single()
    if (error || !target) {
      return NextResponse.json({ success: false, error: "Administrateur introuvable." }, { status: 404 })
    }

    const secret = generateTotpSecret()
    const { error: updateError } = await supabaseAdmin
      .from("admins")
      .update({ totp_secret: secret, totp_enrolled: false })
      .eq("id", target.id)
    if (updateError) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    const account = target.label || target.username
    const otpauthUri = buildOtpauthUri(secret, account)
    const qrDataUrl = await generateQrDataUrl(otpauthUri)

    return NextResponse.json({
      success: true,
      adminId: target.id,
      account,
      secret,
      otpauthUri,
      qrDataUrl,
    })
  } catch (error: any) {
    console.error("Admin enroll error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
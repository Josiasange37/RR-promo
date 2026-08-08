import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * Revoke TOTP for an admin — clears their secret and enrolment so they fall
 * back to password login (used when they lose their authenticator device).
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

    const { error } = await supabaseAdmin
      .from("admins")
      .update({ totp_secret: null, totp_enrolled: false })
      .eq("id", adminId)
    if (error) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Admin totp revoke error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** List all admins + the identity of the current session holder (owner only). */
export async function GET(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const { data: rows, error } = await supabaseAdmin
      .from("admins")
      .select("id, username, label, is_owner, totp_enrolled")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    const admins = (rows ?? []).map((row: any) => ({
      id: row.id,
      username: row.username,
      label: row.label,
      isOwner: row.is_owner,
      totpEnrolled: row.totp_enrolled,
    }))

    return NextResponse.json({
      success: true,
      current: { id: me.id, username: me.username, isOwner: me.is_owner },
      admins,
    })
  } catch {
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
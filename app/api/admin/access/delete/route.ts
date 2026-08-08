import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** Delete an admin account (owner only). Self-deletion and last-owner deletion are blocked. */
export async function POST(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const adminId = body.adminId
    if (!adminId || typeof adminId !== "string" || adminId.length > 64) {
      return NextResponse.json({ success: false, error: "Cible invalide." }, { status: 400 })
    }

    const { data: target, error } = await supabaseAdmin
      .from("admins")
      .select("id, username, is_owner")
      .eq("id", adminId)
      .single()
    if (error || !target) {
      return NextResponse.json({ success: false, error: "Administrateur introuvable." }, { status: 404 })
    }

    if (target.id === me.id) {
      return NextResponse.json({ success: false, error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 })
    }

    if (target.is_owner) {
      const { count } = await supabaseAdmin.from("admins").select("id", { count: "exact" }).eq("is_owner", true)
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ success: false, error: "Impossible de supprimer le dernier propriétaire." }, { status: 400 })
      }
    }

    const { error: deleteError } = await supabaseAdmin.from("admins").delete().eq("id", target.id)
    if (deleteError) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Admin delete error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireOwner } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** Promote an admin to owner, or demote one back to a regular admin (owner only).
 *  Self-demotion and last-owner demotion are blocked. */
export async function POST(request: Request) {
  try {
    const me = await requireOwner(request)
    if (!me) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const adminId = body.adminId
    const makeOwner = body.makeOwner === true || body.makeOwner === false ? body.makeOwner : body.isOwner

    if (!adminId || typeof adminId !== "string" || adminId.length > 64 || typeof makeOwner !== "boolean") {
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

    if (target.id === me.id && !makeOwner) {
      return NextResponse.json({ success: false, error: "Vous ne pouvez pas retirer vos propres droits de propriétaire." }, { status: 400 })
    }

    if (target.is_owner && !makeOwner) {
      const { count } = await supabaseAdmin.from("admins").select("id", { count: "exact" }).eq("is_owner", true)
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ success: false, error: "Impossible de retirer les droits du dernier propriétaire." }, { status: 400 })
      }
    }

    const { error: updateError } = await supabaseAdmin.from("admins").update({ is_owner: makeOwner }).eq("id", target.id)
    if (updateError) {
      return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
    }

    return NextResponse.json({ success: true, isOwner: makeOwner })
  } catch (error: any) {
    console.error("Admin role error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
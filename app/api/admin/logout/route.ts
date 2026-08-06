import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { clearSessionCookie, readSessionCookie } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const token = readSessionCookie(request)
    if (token) {
      // Revoke the session server-side so the token cannot be reused
      await supabaseAdmin.from("admin_sessions").delete().eq("token", token)
    }
    const res = NextResponse.json({ success: true })
    return clearSessionCookie(res)
  } catch (error: any) {
    console.error("Admin logout error:", error)
    return NextResponse.json({ success: false, error: "Erreur interne." }, { status: 500 })
  }
}
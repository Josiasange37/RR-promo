import { NextResponse } from "next/server"
import { resetDatabase } from "@/lib/db-supabase"
import { requireOwner } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request)
    if (!owner) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    await resetDatabase()
    console.log("[API Reset] Database has been reset by administrator.")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API Reset DB error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 })
  }
}
